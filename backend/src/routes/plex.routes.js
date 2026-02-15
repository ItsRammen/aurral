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
        const query = `${artist} ${track}`;

        // Search for music tracks (type=10 is tracks in Plex)
        const searchUrl = `${config.url}/search?query=${encodeURIComponent(query)}&type=10&limit=10`;

        const response = await axios.get(searchUrl, {
            headers: plexHeaders(token),
            timeout: 15000
        });

        const items = response.data?.MediaContainer?.Metadata || [];

        if (items.length === 0) {
            const err = new Error("Track not found on Plex");
            err.status = 404;
            throw err;
        }

        const bestMatch = items.find(s =>
            s.title?.toLowerCase().includes(track.toLowerCase()) &&
            (s.grandparentTitle || "").toLowerCase().includes(artist.toLowerCase())
        ) || items[0];

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
        console.error("Plex Search Exception:", e.message);
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
        const metaResponse = await axios.get(`${config.url}/library/metadata/${ratingKey}`, {
            headers: plexHeaders(token),
            timeout: 10000
        });

        const metadata = metaResponse.data?.MediaContainer?.Metadata?.[0];
        const partKey = metadata?.Media?.[0]?.Part?.[0]?.key;

        if (!partKey) {
            const err = new Error("Could not find audio file for this track");
            err.status = 404;
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
            err.status = 404;
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
