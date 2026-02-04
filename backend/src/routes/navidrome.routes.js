import express from "express";
import axios from "axios";
import crypto from "crypto";
import { db } from "../config/db.js";
import { Op } from "sequelize";

const router = express.Router();

// Helper to get global Navidrome config (from any admin)
const getGlobalNavidromeConfig = async () => {
    // Try to find an admin with config
    // We can't query JSON fields easily in all SQL dialects, but we can find admins and checking JS
    const admins = await db.User.findAll({
        where: {
            // permissions LIKE '%admin%' or just check all
        }
    });
    // Filter in JS for robustness
    const adminWithConfig = admins.find(u =>
        (u.permissions.includes('admin') || u.permissions.includes('aurral_admin')) &&
        u.navidromeConfig &&
        u.navidromeConfig.url
    );
    return adminWithConfig?.navidromeConfig;
};

// --- Configuration Endpoints ---

// POST /api/navidrome/config - Configure Navidrome integration
router.post("/config", async (req, res) => {
    const { url, username, password } = req.body;

    if (!url || !username || !password) {
        return res.status(400).json({ error: "URL, username, and password are required" });
    }

    // Clean URL (remove trailing slash)
    const cleanUrl = url.replace(/\/$/, "");
    const salt = crypto.randomBytes(8).toString('hex');
    const token = crypto.createHash('md5').update(password + salt).digest('hex');

    const navidromeConfig = {
        url: cleanUrl,
        username,
        salt,
        token
    };

    // Test connection using ping.view
    try {
        const testUrl = `${cleanUrl}/rest/ping.view?u=${username}&t=${token}&s=${salt}&v=1.16.1&c=Aurral&f=json`;
        const response = await axios.get(testUrl, { timeout: 10000 });

        const subRes = response.data['subsonic-response'];
        if (!subRes || subRes.status !== 'ok') {
            return res.status(400).json({
                error: "Navidrome connection failed: " + (subRes?.error?.message || "Invalid response from server")
            });
        }
    } catch (e) {
        return res.status(400).json({ error: "Navidrome connection failed: " + e.message });
    }

    try {
        await req.user.update({ navidromeConfig });
        res.json({ success: true, config: { url: cleanUrl, username } });
    } catch (error) {
        res.status(500).json({ error: "Failed to save configuration" });
    }
});

// GET /api/navidrome/status - Check connection status
router.get("/status", async (req, res) => {
    // Check current user or global fallback
    let config = req.user.navidromeConfig;
    if (!config) {
        config = await getGlobalNavidromeConfig();
    }

    if (!config) {
        return res.json({ connected: false });
    }
    res.json({
        connected: true,
        url: config.url,
        username: config.username
    });
});

// DELETE /api/navidrome/config - Remove configuration
router.delete("/config", async (req, res) => {
    await req.user.update({ navidromeConfig: null });
    res.json({ success: true });
});

// --- User Account Linking ---

// POST /api/navidrome/verify-user - Link personal account
router.post("/verify-user", async (req, res) => {
    const { username, password } = req.body;

    const globalConfig = (await getGlobalNavidromeConfig()) || req.user.navidromeConfig;

    if (!globalConfig) {
        return res.status(400).json({ error: "Navidrome not configured. Please set up Navidrome in Settings first." });
    }

    if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
    }

    try {
        // Generate token for the user's credentials
        const salt = crypto.randomBytes(6).toString('hex');
        const token = crypto.createHash('md5').update(password + salt).digest('hex');

        // Test connection with user's credentials
        const testUrl = `${globalConfig.url}/rest/ping.view?u=${encodeURIComponent(username)}&t=${token}&s=${salt}&v=1.16.1&c=Aurral&f=json`;
        const response = await axios.get(testUrl, { timeout: 10000 });
        const subRes = response.data['subsonic-response'];

        if (!subRes || subRes.status !== 'ok') {
            return res.status(401).json({ error: "Invalid Navidrome credentials" });
        }

        // Save the user's personal Navidrome username (verified)
        await req.user.update({
            navidromeUsername: username,
            navidromeToken: token,
            navidromeUserSalt: salt
        });

        res.json({ success: true, username });
    } catch (e) {
        console.error("Navidrome verify-user error:", e.message);
        return res.status(400).json({ error: "Failed to verify Navidrome credentials: " + e.message });
    }
});

// DELETE /api/navidrome/user-link - Unlink personal account
router.delete("/user-link", async (req, res) => {
    await req.user.update({
        navidromeUsername: null,
        navidromeToken: null,
        navidromeUserSalt: null
    });
    res.json({ success: true });
});

// GET /api/navidrome/user-history - Get listening history
router.get("/user-history", async (req, res) => {
    try {
        const history = await db.Play.findAll({
            where: { userId: req.user.id },
            order: [['playedAt', 'DESC']],
            limit: 50
        });

        res.json(history);
    } catch (error) {
        console.error("History error:", error);
        res.status(500).json({ error: "Failed to fetch history" });
    }
});

// --- Search & Playback ---

// GET /api/navidrome/search-play - Search for a track to play
router.get("/search-play", async (req, res) => {
    const { artist, track } = req.query;
    let config = req.user.navidromeConfig;
    if (!config) config = await getGlobalNavidromeConfig();

    if (!config) {
        return res.status(400).json({ error: "Navidrome not configured" });
    }

    if (!artist || !track) {
        return res.status(400).json({ error: "Artist and track are required" });
    }

    try {
        // Search for the track
        const query = `${artist} ${track}`;
        const searchUrl = `${config.url}/rest/search3.view?u=${config.username}&t=${config.token}&s=${config.salt}&v=1.16.1&c=Aurral&f=json&query=${encodeURIComponent(query)}`;

        const response = await axios.get(searchUrl, { timeout: 15000 });
        const subRes = response.data['subsonic-response'];

        if (subRes?.status !== 'ok') {
            console.error("Navidrome Search Error:", subRes?.error);
            return res.status(400).json({ error: subRes?.error?.message || "Navidrome search failed" });
        }

        const songs = subRes.searchResult3?.song || [];

        if (songs.length === 0) {
            return res.status(404).json({ error: "Track not found on Navidrome" });
        }

        // Try to find exact match or just use the first result
        const bestMatch = songs.find(s =>
            s.title.toLowerCase().includes(track.toLowerCase()) &&
            s.artist.toLowerCase().includes(artist.toLowerCase())
        ) || songs[0];

        // Navidrome Web UI link format: #!/song/{id}
        const playbackUrl = `${config.url}/#!/song/${bestMatch.id}`;

        res.json({
            playbackUrl,
            trackId: bestMatch.id,
            coverArtId: bestMatch.coverArt,
            match: {
                id: bestMatch.id,
                title: bestMatch.title,
                artist: bestMatch.artist,
                album: bestMatch.album,
                duration: bestMatch.duration
            }
        });
    } catch (e) {
        console.error("Navidrome Search Exception:", e.message);
        res.status(500).json({ error: "Failed to search Navidrome: " + e.message });
    }
});

// GET /api/navidrome/stream/:trackId - Audio Stream Proxy
router.get("/stream/:trackId", async (req, res) => {
    const { trackId } = req.params;
    let config = req.user.navidromeConfig;
    if (!config) config = await getGlobalNavidromeConfig();

    if (!config) {
        return res.status(400).json({ error: "Navidrome not configured" });
    }

    try {
        const streamUrl = `${config.url}/rest/stream.view?u=${config.username}&t=${config.token}&s=${config.salt}&v=1.16.1&c=Aurral&id=${trackId}`;

        const response = await axios({
            method: 'GET',
            url: streamUrl,
            responseType: 'stream',
            timeout: 30000
        });

        if (response.headers['content-type']) {
            res.setHeader('Content-Type', response.headers['content-type']);
        }
        if (response.headers['content-length']) {
            res.setHeader('Content-Length', response.headers['content-length']);
        }

        response.data.pipe(res);
    } catch (e) {
        console.error("Navidrome Stream Error:", e.message);
        res.status(500).json({ error: "Failed to stream from Navidrome" });
    }
});

// GET /api/navidrome/track/:trackId - Track Info
router.get("/track/:trackId", async (req, res) => {
    const { trackId } = req.params;
    let config = req.user.navidromeConfig;
    if (!config) config = await getGlobalNavidromeConfig();

    if (!config) {
        return res.status(400).json({ error: "Navidrome not configured" });
    }

    try {
        const songUrl = `${config.url}/rest/getSong.view?u=${config.username}&t=${config.token}&s=${config.salt}&v=1.16.1&c=Aurral&f=json&id=${trackId}`;
        const response = await axios.get(songUrl, { timeout: 10000 });
        const subRes = response.data['subsonic-response'];

        if (subRes?.status !== 'ok' || !subRes.song) {
            return res.status(404).json({ error: "Track not found" });
        }

        const song = subRes.song;
        const coverArtUrl = song.coverArt ?
            `/api/navidrome/cover/${song.coverArt}` : null;

        res.json({
            id: song.id,
            title: song.title,
            artist: song.artist,
            album: song.album,
            duration: song.duration,
            coverArt: coverArtUrl
        });
    } catch (e) {
        console.error("Navidrome Track Info Error:", e.message);
        res.status(500).json({ error: "Failed to get track info" });
    }
});

// GET /api/navidrome/cover/:coverId - Cover Art Proxy
router.get("/cover/:coverId", async (req, res) => {
    const { coverId } = req.params;
    let config = req.user.navidromeConfig;
    if (!config) config = await getGlobalNavidromeConfig();

    if (!config) {
        return res.status(400).json({ error: "Navidrome not configured" });
    }

    try {
        const coverUrl = `${config.url}/rest/getCoverArt.view?u=${config.username}&t=${config.token}&s=${config.salt}&v=1.16.1&c=Aurral&id=${coverId}&size=300`;

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
        console.error("Navidrome Cover Error:", e.message);
        res.status(404).send();
    }
});

export default router;
