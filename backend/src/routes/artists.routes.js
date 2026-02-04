import express from "express";
import { db } from "../config/db.js";
import {
    lastfmRequest,
    musicbrainzRequest,
    LASTFM_API_KEY
} from "../services/api.js";
import { getArtistImage } from "../services/images.js";

const router = express.Router();

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// GET /api/artists/likes
router.get("/likes", async (req, res) => {
    try {
        const userLikes = await db.Like.findAll({
            where: { userId: req.user.id },
            attributes: ['mbid']
        });
        res.json(userLikes.map(l => l.mbid));
    } catch (e) {
        res.status(500).json({ error: "Failed to fetch likes" });
    }
});

// POST /api/artists/:mbid/like
router.post("/:mbid/like", async (req, res) => {
    const { mbid } = req.params;
    const { name, image } = req.body;

    if (!mbid) return res.status(400).json({ error: "MBID is required" });

    try {
        const existing = await db.Like.findOne({
            where: { mbid, userId: req.user.id }
        });

        if (existing) {
            await existing.destroy();
            return res.json({ liked: false });
        } else {
            await db.Like.create({
                mbid,
                userId: req.user.id,
                artistName: name || "Unknown Artist",
                likedAt: new Date()
                // image: image // 'artistImage' column not confirmed in schema yet
            });
            return res.json({ liked: true });
        }
    } catch (e) {
        console.error("Like error:", e);
        res.status(500).json({ error: "Failed to toggle like" });
    }
});

// GET /api/artists/:mbid - Artist Details
router.get("/:mbid", async (req, res) => {
    try {
        const { mbid } = req.params;

        if (!UUID_REGEX.test(mbid)) {
            return res.status(400).json({ error: "Invalid MBID format" });
        }

        const match = await db.Request.findOne({ where: { mbid } });

        // Check Cache
        const cacheKey = `artist:${mbid}`;
        try {
            const cached = await db.MetadataCache.findByPk(cacheKey);
            if (cached && new Date(cached.expiresAt) > new Date()) {
                return res.json({
                    ...cached.value,
                    requestedBy: match ? match.requestedBy : null,
                    requestedByUserId: match ? match.requestedByUserId : null
                });
            }
        } catch (e) {
            console.warn("Cache lookup failed", e);
        }

        // Fetch Fresh Data
        let data = null;

        // Note: Last.fm logic was skipped in server.js loop
        // If we wanted to re-enable it, we would check LASTFM_API_KEY() here.
        // For now, we stick to MusicBrainz as primary source per previous logic.

        data = await musicbrainzRequest(`/artist/${mbid}`, {
            inc: "aliases+tags+ratings+genres+release-groups",
        });

        // Save to Cache (7 Days TTL)
        try {
            await db.MetadataCache.upsert({
                key: cacheKey,
                value: data,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            });
        } catch (e) {
            console.warn("Failed to cache artist metadata", e);
        }

        res.json({
            ...data,
            requestedBy: match ? match.requestedBy : null,
            requestedByUserId: match ? match.requestedByUserId : null
        });
    } catch (error) {
        res.status(500).json({
            error: "Failed to fetch artist details",
            message: error.message,
        });
    }
});

// GET /api/artists/:mbid/cover
router.get("/:mbid/cover", async (req, res) => {
    try {
        const { mbid } = req.params;

        if (!UUID_REGEX.test(mbid)) {
            return res.status(400).json({ error: "Invalid MBID format" });
        }

        const result = await getArtistImage(mbid, req.user?.lastfmApiKey);
        res.json({ images: result.images });
    } catch (error) {
        res.status(500).json({
            error: "Failed to fetch cover art",
            message: error.message,
        });
    }
});

// GET /api/artists/:mbid/similar
router.get("/:mbid/similar", async (req, res) => {
    try {
        const { mbid } = req.params;

        if (!UUID_REGEX.test(mbid)) {
            return res.status(400).json({ error: "Invalid MBID format" });
        }

        // Check Cache
        const cacheKey = `similar:${mbid}`;
        try {
            const cached = await db.MetadataCache.findByPk(cacheKey);
            if (cached && new Date(cached.expiresAt) > new Date()) {
                return res.json({ artists: cached.value });
            }
        } catch (e) { }

        const { limit = 20 } = req.query;

        let formattedArtists = [];

        // Try Last.fm first if API key is available
        if (LASTFM_API_KEY()) {
            try {
                const data = await lastfmRequest("artist.getSimilar", {
                    mbid,
                    limit,
                }, req.user?.lastfmApiKey);

                if (data?.similarartists?.artist) {
                    const artists = Array.isArray(data.similarartists.artist)
                        ? data.similarartists.artist
                        : [data.similarartists.artist];

                    formattedArtists = artists
                        .map((a) => {
                            let img = null;
                            if (a.image && Array.isArray(a.image)) {
                                const i =
                                    a.image.find((img) => img.size === "extralarge") ||
                                    a.image.find((img) => img.size === "large");
                                if (
                                    i &&
                                    i["#text"] &&
                                    !i["#text"].includes("2a96cbd8b46e442fc41c2b86b821562f")
                                )
                                    img = i["#text"];
                            }
                            return {
                                id: a.mbid,
                                name: a.name,
                                image: img,
                                match: Math.round((a.match || 0) * 100),
                            };
                        })
                        .filter((a) => a.id);
                }
            } catch (e) {
                console.warn(`Last.fm similar artists fetch failed for ${mbid}:`, e.message);
            }
        }

        // Fallback to MusicBrainz if Last.fm failed or returned no results
        if (formattedArtists.length === 0) {
            console.log(`Falling back to MusicBrainz for similar artists: ${mbid}`);
            try {
                const artistData = await musicbrainzRequest(`/artist/${mbid}`, {
                    inc: "tags+genres",
                });

                const tags = [
                    ...(artistData.tags || []),
                    ...(artistData.genres || []),
                ]
                    .sort((a, b) => (b.count || 0) - (a.count || 0))
                    .slice(0, 5)
                    .map((t) => t.name);

                if (tags.length > 0) {
                    const query = tags.map((t) => `tag:"${t}"`).join(" OR ");
                    // Limit search to 10 for performance, as this is a fallback
                    const searchResults = await musicbrainzRequest("/artist", {
                        query: `(${query}) AND type:Group AND NOT arid:${mbid}`,
                        limit: 10,
                    });

                    if (searchResults.artists) {
                        formattedArtists = searchResults.artists.map((a) => ({
                            id: a.id,
                            name: a.name,
                            image: null,
                            match: Math.round((a.score || 0)),
                        }));
                    }
                }
            } catch (e) {
                console.error(`MusicBrainz similar artists fallback failed for ${mbid}:`, e.message);
            }
        }

        // Save to Cache (7 Days TTL)
        if (formattedArtists.length > 0) {
            try {
                await db.MetadataCache.upsert({
                    key: cacheKey,
                    value: formattedArtists,
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                });
            } catch (e) { }
        }

        res.json({ artists: formattedArtists });
    } catch (error) {
        res.status(500).json({
            error: "Failed to fetch similar artists",
            message: error.message,
        });
    }
});

export default router;
