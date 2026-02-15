import express from "express";
import axios from "axios";
import { db } from "../config/db.js";
import { PERMISSIONS } from "../config/permissions.js";

const router = express.Router();

// Helper to get global Plex config (from any admin)
const getGlobalPlexConfig = async () => {
    const admins = await db.User.findAll();
    const adminWithConfig = admins.find(u =>
        (u.permissions.includes(PERMISSIONS.ADMIN) || u.permissions.includes('aurral_admin')) &&
        u.plexConfig &&
        u.plexConfig.url
    );
    return adminWithConfig?.plexConfig;
};

// Standard Plex headers
const plexHeaders = (token) => ({
    "Accept": "application/json",
    "X-Plex-Token": token,
    "X-Plex-Client-Identifier": "aurral",
    "X-Plex-Product": "Aurral",
    "X-Plex-Version": "1.0.0"
});

// --- Configuration Endpoints ---

// POST /api/plex/config - Configure Plex integration
router.post("/config", async (req, res, next) => {
    const { url, token } = req.body;

    if (!url || !token) {
        return res.status(400).json({ error: "URL and Token are required" });
    }

    if (!url.startsWith("http://") && !url.startsWith("https://")) {
        return res.status(400).json({ error: "URL must start with http:// or https://" });
    }

    const cleanUrl = url.replace(/\/$/, "");

    // Test connection
    try {
        const response = await axios.get(`${cleanUrl}/`, {
            headers: plexHeaders(token),
            timeout: 10000
        });

        const machineId = response.data?.MediaContainer?.machineIdentifier;
        if (!machineId) {
            const err = new Error("Plex connection failed: Invalid response from server");
            err.status = 400;
            throw err;
        }

        const plexConfig = { url: cleanUrl, token, machineId };

        await req.user.update({ plexConfig, plexToken: token, plexMachineId: machineId });
        res.json({ success: true, config: { url: cleanUrl, serverName: response.data?.MediaContainer?.friendlyName || "Plex" } });
    } catch (e) {
        if (!e.status) {
            e.message = "Plex connection failed: " + e.message;
            e.status = 400;
        }
        return next(e);
    }
});

// GET /api/plex/status - Check connection status
router.get("/status", async (req, res, next) => {
    try {
        let config = req.user.plexConfig;
        if (!config) {
            config = await getGlobalPlexConfig();
        }

        if (!config) {
            return res.json({ connected: false });
        }

        res.json({
            connected: true,
            url: config.url,
            machineId: config.machineId
        });
    } catch (error) {
        next(error);
    }
});

// DELETE /api/plex/config - Remove configuration
router.delete("/config", async (req, res, next) => {
    try {
        await req.user.update({ plexConfig: null, plexToken: null, plexMachineId: null });
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

// GET /api/plex/user-history - Get listening history
router.get("/user-history", async (req, res, next) => {
    try {
        const history = await db.Play.findAll({
            where: { userId: req.user.id, source: 'plex' },
            order: [['playedAt', 'DESC']],
            limit: 50
        });
        res.json(history);
    } catch (error) {
        next(error);
    }
});

// --- Search & Playback ---

// Helper to find the Music library section ID
const findMusicSection = async (config) => {
    try {
        const response = await axios.get(`${config.url}/library/sections`, {
            headers: plexHeaders(config.token),
            timeout: 5000
        });
        const sections = response.data?.MediaContainer?.Directory || [];
        // Look for type="artist" which is the standard for Music libraries
        const musicSection = sections.find(s => s.type === "artist");
        return musicSection?.key;
    } catch (e) {
        console.warn("Failed to find Plex music section:", e.message);
        return null;
    }
};

// GET /api/plex/search-play - Search for a track to play
router.get("/search-play", async (req, res, next) => {
    const { artist, track } = req.query;

    try {
        let config = req.user.plexConfig;
        if (!config) config = await getGlobalPlexConfig();

        if (!config) {
            return res.status(400).json({ error: "Plex not configured" });
        }

        if (!artist || !track) {
            return res.status(400).json({ error: "Artist and track are required" });
        }

        const token = config.token;
        let bestMatch = null;

        // Strategy 1: Library-specific filter (Highest Accuracy)
        const sectionId = await findMusicSection({ ...config, token });

        if (sectionId) {
            console.log(`[Plex] using Music Section ID: ${sectionId}`);
            // keys: title (track name), grandparentTitle (artist), parentTitle (album)
            // We search for the track title specifically in the music section
            const filterUrl = `${config.url}/library/sections/${sectionId}/all?type=10&title=${encodeURIComponent(track)}`;

            try {
                const response = await axios.get(filterUrl, {
                    headers: plexHeaders(token),
                    timeout: 10000
                });

                const items = response.data?.MediaContainer?.Metadata || [];

                // Filter by Artist (grandparentTitle)
                bestMatch = items.find(s => {
                    const artistMatch = s.grandparentTitle?.toLowerCase() === artist.toLowerCase() ||
                        s.grandparentTitle?.toLowerCase().includes(artist.toLowerCase());
                    return artistMatch;
                });

                if (!bestMatch && items.length > 0) {
                    // Looser match if exact failed
                    bestMatch = items.find(s =>
                        s.grandparentTitle?.toLowerCase().includes(artist.split(' ')[0].toLowerCase())
                    );
                }
            } catch (err) {
                console.warn("[Plex] Library filter failed, falling back to global search", err.message);
            }
        }

        // Strategy 2: Global Search (Fallback)
        if (!bestMatch) {
            console.log(`[Plex] Strategy 1 failed/skipped. Trying global search...`);
            let searchUrl = `${config.url}/search?query=${encodeURIComponent(track)}&type=10&limit=25`;

            let response = await axios.get(searchUrl, {
                headers: plexHeaders(token),
                timeout: 15000
            });

            let items = response.data?.MediaContainer?.Metadata || [];

            bestMatch = items.find(s =>
                s.grandparentTitle?.toLowerCase().includes(artist.toLowerCase()) ||
                artist.toLowerCase().includes(s.grandparentTitle?.toLowerCase())
            );

            // Strategy 3: Combined Query
            if (!bestMatch) {
                const query = `${artist} ${track}`;
                searchUrl = `${config.url}/search?query=${encodeURIComponent(query)}&type=10&limit=10`;

                response = await axios.get(searchUrl, {
                    headers: plexHeaders(token),
                    timeout: 15000
                });

                items = response.data?.MediaContainer?.Metadata || [];
                bestMatch = items[0];
            }
        }

        if (!bestMatch) {
            console.warn(`[Plex] Track not found: "${track}" by "${artist}"`);
            const err = new Error("Track not found on Plex");
            err.statusCode = 404;
            throw err;
        }

        console.log(`[Plex] Found match: "${bestMatch.title}" by "${bestMatch.grandparentTitle}" (${bestMatch.ratingKey})`);

        res.json({
            trackId: String(bestMatch.ratingKey),
            match: {
                id: bestMatch.ratingKey,
                title: bestMatch.title,
                artist: bestMatch.grandparentTitle || "Unknown",
                album: bestMatch.parentTitle || "Unknown",
                duration: Math.round((bestMatch.duration || 0) / 1000)
            }
        });
    } catch (e) {
        if (e.status !== 404) {
            console.error("Plex Search Exception:", e.message);
        }
        next(e);
    }
});

// GET /api/plex/album-play - Search for an album and return tracks
router.get("/album-play", async (req, res, next) => {
    const { artist, album } = req.query;

    try {
        let config = req.user.plexConfig;
        if (!config) config = await getGlobalPlexConfig();

        if (!config) {
            return res.status(400).json({ error: "Plex not configured" });
        }

        const token = config.token;
        let albumMatch = null;

        // Strategy 1: Library-specific filter
        const sectionId = await findMusicSection({ ...config, token });

        if (sectionId) {
            console.log(`[Plex] Searching for album "${album}" in Section ${sectionId}`);
            // type=9 is Album
            const filterUrl = `${config.url}/library/sections/${sectionId}/all?type=9&title=${encodeURIComponent(album)}`;

            try {
                const response = await axios.get(filterUrl, {
                    headers: plexHeaders(token),
                    timeout: 10000
                });

                const items = response.data?.MediaContainer?.Metadata || [];

                // Filter by match on Artist (parentTitle for albums usually)
                albumMatch = items.find(a =>
                    a.parentTitle?.toLowerCase() === artist.toLowerCase() ||
                    a.parentTitle?.toLowerCase().includes(artist.toLowerCase())
                );
            } catch (err) {
                console.warn("[Plex] Album library filter failed", err.message);
            }
        }

        // Strategy 2: Global Search
        if (!albumMatch) {
            console.log(`[Plex] Album global search for "${album}"`);
            const searchUrl = `${config.url}/search?query=${encodeURIComponent(album)}&type=9&limit=10`;
            const response = await axios.get(searchUrl, {
                headers: plexHeaders(token),
                timeout: 15000
            });
            const items = response.data?.MediaContainer?.Metadata || [];

            albumMatch = items.find(a =>
                a.parentTitle?.toLowerCase().includes(artist.toLowerCase()) ||
                artist.toLowerCase().includes(a.parentTitle?.toLowerCase())
            );
        }

        if (!albumMatch) {
            console.warn(`[Plex] Album not found: "${album}" by "${artist}"`);
            const err = new Error("Album not found on Plex");
            err.statusCode = 404;
            throw err;
        }

        console.log(`[Plex] Found album: "${albumMatch.title}" (${albumMatch.ratingKey})`);

        // Fetch tracks for the album
        const tracksUrl = `${config.url}/library/metadata/${albumMatch.ratingKey}/children`;
        const tracksResponse = await axios.get(tracksUrl, {
            headers: plexHeaders(token),
            timeout: 10000
        });

        const tracks = tracksResponse.data?.MediaContainer?.Metadata || [];

        // Map to standard track format
        const mappedTracks = tracks.map(t => ({
            id: String(t.ratingKey),
            title: t.title,
            artist: t.grandparentTitle || artist, // grandparentTitle is artist for tracks
            album: t.parentTitle || album,        // parentTitle is album for tracks
            duration: Math.round((t.duration || 0) / 1000),
            coverArt: t.thumb ? String(t.ratingKey) : String(albumMatch.ratingKey),
            source: 'plex'
        }));

        res.json({
            id: String(albumMatch.ratingKey),
            title: albumMatch.title,
            artist: albumMatch.parentTitle,
            tracks: mappedTracks
        });

    } catch (e) {
        if (e.status !== 404) {
            console.error("Plex Album Play Error:", e.message);
        }
        next(e);
    }
});

// GET /api/plex/stream/:ratingKey - Audio Stream Proxy
router.get("/stream/:ratingKey", async (req, res, next) => {
    const { ratingKey } = req.params;

    try {
        let config = req.user.plexConfig;
        if (!config) config = await getGlobalPlexConfig();

        if (!config) {
            return res.status(400).json({ error: "Plex not configured" });
        }

        const token = config.token;

        // First get the track metadata to find the media part key
        const metadataUrl = `${config.url}/library/metadata/${ratingKey}`;

        const metaResponse = await axios.get(metadataUrl, {
            headers: plexHeaders(token),
            timeout: 10000
        });

        const metadata = metaResponse.data?.MediaContainer?.Metadata?.[0];
        const partKey = metadata?.Media?.[0]?.Part?.[0]?.key;

        if (!partKey) {
            const err = new Error("Could not find audio file for this track");
            err.statusCode = 404;
            throw err;
        }

        const streamUrl = `${config.url}${partKey}?X-Plex-Token=${token}`;

        const headers = {};
        if (req.headers.range) {
            headers['Range'] = req.headers.range;
        }

        const response = await axios({
            method: 'GET',
            url: streamUrl,
            headers,
            responseType: 'stream',
            timeout: 30000,
            validateStatus: (status) => status >= 200 && status < 300
        });

        const headersToForward = ['content-type', 'content-length', 'content-range', 'accept-ranges', 'cache-control'];
        headersToForward.forEach(header => {
            if (response.headers[header]) {
                res.setHeader(header, response.headers[header]);
            }
        });

        res.status(response.status);
        response.data.pipe(res);
    } catch (e) {
        console.error("Plex Stream Error:", e.message);
        next(e);
    }
});

// GET /api/plex/track/:ratingKey - Track Info
router.get("/track/:ratingKey", async (req, res, next) => {
    const { ratingKey } = req.params;

    try {
        let config = req.user.plexConfig;
        if (!config) config = await getGlobalPlexConfig();

        if (!config) {
            return res.status(400).json({ error: "Plex not configured" });
        }

        const token = config.token;

        const response = await axios.get(`${config.url}/library/metadata/${ratingKey}`, {
            headers: plexHeaders(token),
            timeout: 10000
        });

        const item = response.data?.MediaContainer?.Metadata?.[0];
        if (!item) {
            const err = new Error("Track not found");
            err.statusCode = 404;
            throw err;
        }

        res.json({
            id: item.ratingKey,
            title: item.title,
            artist: item.grandparentTitle || "Unknown",
            album: item.parentTitle || "Unknown",
            duration: Math.round((item.duration || 0) / 1000),
            coverArt: item.thumb ? `/api/plex/cover/${item.ratingKey}` : null
        });
    } catch (e) {
        console.error("Plex Track Info Error:", e.message);
        next(e);
    }
});

// GET /api/plex/cover/:ratingKey - Cover Art Proxy
router.get("/cover/:ratingKey", async (req, res, next) => {
    const { ratingKey } = req.params;

    try {
        let config = req.user.plexConfig;
        if (!config) config = await getGlobalPlexConfig();

        if (!config) {
            return res.status(400).json({ error: "Plex not configured" });
        }

        const token = config.token;

        // Get track metadata to find thumb path
        const metaResponse = await axios.get(`${config.url}/library/metadata/${ratingKey}`, {
            headers: plexHeaders(token),
            timeout: 10000
        });

        const thumb = metaResponse.data?.MediaContainer?.Metadata?.[0]?.thumb;
        if (!thumb) {
            return res.status(404).send();
        }

        const coverUrl = `${config.url}${thumb}?X-Plex-Token=${token}&width=300&height=300`;

        const response = await axios({
            method: 'GET',
            url: coverUrl,
            responseType: 'stream',
            timeout: 10000
        });

        if (response.headers['content-type']) {
            res.setHeader('Content-Type', response.headers['content-type']);
        }

        response.data.pipe(res);
    } catch (e) {
        res.status(404).send();
    }
});

export default router;
