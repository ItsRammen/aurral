import express from "express";
import {
    musicbrainzRequest,
    lastfmRequest,
    LASTFM_API_KEY
} from "../services/api.js";

const router = express.Router();

// GET /api/search/artists
router.get("/artists", async (req, res) => {
    try {
        const { query, limit = 20, offset = 0 } = req.query;

        if (!query) {
            return res.status(400).json({ error: "Query parameter is required" });
        }

        if (LASTFM_API_KEY()) {
            try {
                const limitInt = parseInt(limit) || 20;
                const offsetInt = parseInt(offset) || 0;
                const page = Math.floor(offsetInt / limitInt) + 1;

                const lastfmData = await lastfmRequest("artist.search", {
                    artist: query,
                    limit: limitInt,
                    page,
                }, req.user?.lastfmApiKey);

                if (lastfmData?.results?.artistmatches?.artist) {
                    const artists = Array.isArray(lastfmData.results.artistmatches.artist)
                        ? lastfmData.results.artistmatches.artist
                        : [lastfmData.results.artistmatches.artist];

                    const formattedArtists = artists
                        .filter((a) => a.mbid)
                        .map((a) => {
                            let img = null;
                            if (a.image && Array.isArray(a.image)) {
                                const i =
                                    a.image.find((img) => img.size === "extralarge") ||
                                    a.image.find((img) => img.size === "large") ||
                                    a.image.find((img) => img.size === "medium");
                                if (
                                    i &&
                                    i["#text"] &&
                                    !i["#text"].includes("2a96cbd8b46e442fc41c2b86b821562f")
                                ) {
                                    img = i["#text"];
                                }
                            }

                            return {
                                id: a.mbid,
                                name: a.name,
                                "sort-name": a.name,
                                image: img,
                                listeners: a.listeners,
                            };
                        });

                    if (formattedArtists.length > 0) {
                        return res.json({
                            artists: formattedArtists,
                            count: parseInt(
                                lastfmData.results["opensearch:totalResults"] || 0,
                            ),
                            offset: offsetInt,
                        });
                    }
                }
            } catch (error) {
                console.warn(
                    "Last.fm search failed, falling back to MusicBrainz:",
                    error.message,
                );
            }
        }

        const data = await musicbrainzRequest("/artist", {
            query: query,
            limit,
            offset,
        });

        res.json(data);
    } catch (error) {
        res.status(500).json({
            error: "Failed to search artists",
            message: error.message,
        });
    }
});

// GET /api/search/recordings
router.get("/recordings", async (req, res) => {
    try {
        const { query, limit = 10 } = req.query;

        if (!query) {
            return res.status(400).json({ error: "Query parameter is required" });
        }

        if (LASTFM_API_KEY()) {
            try {
                const lastfmData = await lastfmRequest("track.search", {
                    track: query,
                    limit: parseInt(limit) || 10,
                }, req.user?.lastfmApiKey);

                if (lastfmData?.results?.trackmatches?.track) {
                    const tracks = Array.isArray(lastfmData.results.trackmatches.track)
                        ? lastfmData.results.trackmatches.track
                        : [lastfmData.results.trackmatches.track];

                    const formattedTracks = tracks.map((t) => ({
                        name: t.name,
                        artist: t.artist,
                        mbid: t.mbid,
                        artistMbid: null,
                        url: t.url,
                    }));

                    // Try to resolve MBID for the first track if missing
                    if (formattedTracks.length > 0) {
                        try {
                            const info = await lastfmRequest("track.getInfo", {
                                track: formattedTracks[0].name,
                                artist: formattedTracks[0].artist,
                            }, req.user?.lastfmApiKey);

                            if (info?.track?.artist?.mbid) {
                                formattedTracks[0].artistMbid = info.track.artist.mbid;
                            }
                        } catch (e) {
                            // Ignore
                        }
                    }

                    return res.json({ recordings: formattedTracks });
                }
            } catch (error) {
                console.warn("Last.fm track search failed:", error.message);
            }
        }

        // Fallback to MusicBrainz
        const data = await musicbrainzRequest("/recording", {
            query: `recording:${query}`,
            limit: parseInt(limit) || 10,
        });

        const formattedMB = (data.recordings || []).map((r) => ({
            name: r.title,
            artist: r["artist-credit"]?.[0]?.name || "Unknown Artist",
            mbid: r.id,
            artistMbid: r["artist-credit"]?.[0]?.artist?.id,
        }));

        res.json({ recordings: formattedMB });
    } catch (error) {
        res.status(500).json({
            error: "Failed to search recordings",
            message: error.message,
        });
    }
});

export default router;
