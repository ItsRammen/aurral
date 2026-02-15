import express from "express";
import axios from "axios";
import { db } from "../config/db.js";
import { PERMISSIONS } from "../config/permissions.js";

const router = express.Router();

// Helper to get global Jellyfin config (from any admin)
const getGlobalJellyfinConfig = async () => {
    const admins = await db.User.findAll();
    const adminWithConfig = admins.find(u =>
        (u.permissions.includes(PERMISSIONS.ADMIN) || u.permissions.includes('aurral_admin')) &&
        u.jellyfinConfig &&
        u.jellyfinConfig.url
    );
    return adminWithConfig?.jellyfinConfig;
};

// --- Configuration Endpoints ---

// POST /api/jellyfin/config - Configure Jellyfin integration
router.post("/config", async (req, res, next) => {
    const { url, apiKey } = req.body;

    if (!url || !apiKey) {
        return res.status(400).json({ error: "URL and API Key are required" });
    }

    if (!url.startsWith("http://") && !url.startsWith("https://")) {
        return res.status(400).json({ error: "URL must start with http:// or https://" });
    }

    const cleanUrl = url.replace(/\/$/, "");

    // Test connection
    try {
        const response = await axios.get(`${cleanUrl}/System/Info`, {
            headers: { "Authorization": `MediaBrowser Token="${apiKey}"` },
            timeout: 10000
        });

        if (!response.data?.ServerName) {
            const err = new Error("Jellyfin connection failed: Invalid response from server");
            err.status = 400;
            throw err;
        }
    } catch (e) {
        if (!e.status) {
            e.message = "Jellyfin connection failed: " + e.message;
            e.status = 400;
        }
        return next(e);
    }

    const jellyfinConfig = { url: cleanUrl, apiKey };

    try {
        await req.user.update({ jellyfinConfig });
        res.json({ success: true, config: { url: cleanUrl } });
    } catch (error) {
        next(error);
    }
});

// GET /api/jellyfin/status - Check connection status
router.get("/status", async (req, res, next) => {
    try {
        let config = req.user.jellyfinConfig;
        if (!config) {
            config = await getGlobalJellyfinConfig();
        }

        if (!config) {
            return res.json({ connected: false });
        }
        res.json({
            connected: true,
            url: config.url,
            hasUserLink: !!req.user.jellyfinUserId
        });
    } catch (error) {
        next(error);
    }
});

// DELETE /api/jellyfin/config - Remove configuration
router.delete("/config", async (req, res, next) => {
    try {
        await req.user.update({ jellyfinConfig: null, jellyfinUserId: null, jellyfinToken: null });
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

// --- User Account Linking ---

// POST /api/jellyfin/verify-user - Link personal account
router.post("/verify-user", async (req, res, next) => {
    const { username, password } = req.body;

    try {
        const globalConfig = (await getGlobalJellyfinConfig()) || req.user.jellyfinConfig;

        if (!globalConfig) {
            return res.status(400).json({ error: "Jellyfin not configured. Please set up Jellyfin in Settings first." });
        }

        if (!username || !password) {
            return res.status(400).json({ error: "Username and password are required" });
        }

        // Authenticate with Jellyfin
        const response = await axios.post(`${globalConfig.url}/Users/AuthenticateByName`, {
            Username: username,
            Pw: password
        }, {
            headers: {
                "Content-Type": "application/json",
                "Authorization": `MediaBrowser Client="Aurral", Device="Server", DeviceId="aurral-server", Version="1.0.0"`
            },
            timeout: 10000
        });

        const { AccessToken, User: jellyfinUser } = response.data;

        if (!AccessToken || !jellyfinUser?.Id) {
            const err = new Error("Invalid Jellyfin credentials");
            err.status = 401;
            throw err;
        }

        await req.user.update({
            jellyfinUserId: jellyfinUser.Id,
            jellyfinToken: AccessToken
        });

        res.json({ success: true, username: jellyfinUser.Name });
    } catch (e) {
        console.error("Jellyfin verify-user error:", e.message);
        if (!e.status) e.status = 400;
        next(e);
    }
});

// DELETE /api/jellyfin/user-link - Unlink personal account
router.delete("/user-link", async (req, res, next) => {
    try {
        await req.user.update({
            jellyfinUserId: null,
            jellyfinToken: null
        });
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

// GET /api/jellyfin/user-history - Get listening history
router.get("/user-history", async (req, res, next) => {
    try {
        const history = await db.Play.findAll({
            where: { userId: req.user.id, source: 'jellyfin' },
            order: [['playedAt', 'DESC']],
            limit: 50
        });
        res.json(history);
    } catch (error) {
        next(error);
    }
});

// --- Search & Playback ---

// GET /api/jellyfin/search-play - Search for a track to play
router.get("/search-play", async (req, res, next) => {
    const { artist, track } = req.query;

    try {
        let config = req.user.jellyfinConfig;
        if (!config) config = await getGlobalJellyfinConfig();

        if (!config) {
            return res.status(400).json({ error: "Jellyfin not configured" });
        }

        if (!artist || !track) {
            return res.status(400).json({ error: "Artist and track are required" });
        }

        const token = req.user.jellyfinToken || config.apiKey;
        const userId = req.user.jellyfinUserId;

        const query = `${artist} ${track}`;
        const searchUrl = `${config.url}/Items?searchTerm=${encodeURIComponent(query)}&IncludeItemTypes=Audio&Limit=10&Recursive=true${userId ? `&UserId=${userId}` : ''}`;

        const response = await axios.get(searchUrl, {
            headers: { "Authorization": `MediaBrowser Token="${token}"` },
            timeout: 15000
        });

        const items = response.data?.Items || [];

        if (items.length === 0) {
            const err = new Error("Track not found on Jellyfin");
            err.statusCode = 404;
            throw err;
        }

        const bestMatch = items.find(s =>
            s.Name?.toLowerCase().includes(track.toLowerCase()) &&
            (s.AlbumArtist || s.Artists?.[0] || "").toLowerCase().includes(artist.toLowerCase())
        ) || items[0];

        res.json({
            trackId: bestMatch.Id,
            match: {
                id: bestMatch.Id,
                title: bestMatch.Name,
                artist: bestMatch.AlbumArtist || bestMatch.Artists?.[0] || "Unknown",
                album: bestMatch.Album || "Unknown",
                duration: Math.round((bestMatch.RunTimeTicks || 0) / 10000000)
            }
        });
    } catch (e) {
        console.error("Jellyfin Search Exception:", e.message);
        next(e);
    }
});

// GET /api/jellyfin/album-play - Search for an album and return tracks
router.get("/album-play", async (req, res, next) => {
    const { artist, album } = req.query;

    try {
        let config = req.user.jellyfinConfig;
        if (!config) config = await getGlobalJellyfinConfig();

        if (!config) {
            return res.status(400).json({ error: "Jellyfin not configured" });
        }

        const token = req.user.jellyfinToken || config.apiKey;
        const userId = req.user.jellyfinUserId;

        // Search for the album
        const searchUrl = `${config.url}/Items?searchTerm=${encodeURIComponent(album)}&IncludeItemTypes=MusicAlbum&Recursive=true${userId ? `&UserId=${userId}` : ''}`;

        const response = await axios.get(searchUrl, {
            headers: { "X-Emby-Token": token, "Authorization": `MediaBrowser Token="${token}"` },
            timeout: 15000
        });

        const items = response.data?.Items || [];

        // Filter by Artist
        const albumMatch = items.find(a =>
            (a.AlbumArtist || "").toLowerCase().includes(artist.toLowerCase()) ||
            (a.Artists?.[0] || "").toLowerCase().includes(artist.toLowerCase())
        );

        if (!albumMatch) {
            console.warn(`[Jellyfin] Album not found: "${album}" by "${artist}"`);
            const err = new Error("Album not found on Jellyfin");
            err.statusCode = 404;
            throw err;
        }

        console.log(`[Jellyfin] Found album: "${albumMatch.Name}" (${albumMatch.Id})`);

        // Fetch tracks for the album
        const tracksUrl = `${config.url}/Items?ParentId=${albumMatch.Id}&IncludeItemTypes=Audio&Recursive=true&SortBy=ParentIndexNumber,IndexNumber&Fields=ImageTags${userId ? `&UserId=${userId}` : ''}`;
        const tracksResponse = await axios.get(tracksUrl, {
            headers: { "X-Emby-Token": token, "Authorization": `MediaBrowser Token="${token}"` },
            timeout: 10000
        });

        const tracks = tracksResponse.data?.Items || [];

        if (tracks.length === 0) {
            throw new Error("No tracks found for this album");
        }

        const mappedTracks = tracks.map(t => ({
            id: t.Id,
            title: t.Name,
            artist: t.AlbumArtist || t.Artists?.[0] || artist,
            album: t.Album || album,
            duration: Math.round((t.RunTimeTicks || 0) / 10000000), // Ticks to seconds
            coverArt: t.ImageTags?.Primary ? t.Id : albumMatch.Id,
            source: 'jellyfin'
        }));

        res.json({
            id: albumMatch.Id,
            title: albumMatch.Name,
            artist: albumMatch.AlbumArtist || albumMatch.Artists?.[0],
            tracks: mappedTracks
        });

    } catch (e) {
        if (e.status !== 404) {
            console.error("Jellyfin Album Play Error:", e.message);
        }
        next(e);
    }
});

// GET /api/jellyfin/stream/:itemId - Audio Stream Proxy
router.get("/stream/:itemId", async (req, res, next) => {
    const { itemId } = req.params;

    try {
        let config = req.user.jellyfinConfig;
        if (!config) config = await getGlobalJellyfinConfig();

        if (!config) {
            return res.status(400).json({ error: "Jellyfin not configured" });
        }

        const token = req.user.jellyfinToken || config.apiKey;
        const streamUrl = `${config.url}/Audio/${itemId}/stream?static=true&api_key=${token}`;

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
        console.error("Jellyfin Stream Error:", e.message);
        next(e);
    }
});

// GET /api/jellyfin/track/:itemId - Track Info
router.get("/track/:itemId", async (req, res, next) => {
    const { itemId } = req.params;

    try {
        let config = req.user.jellyfinConfig;
        if (!config) config = await getGlobalJellyfinConfig();

        if (!config) {
            return res.status(400).json({ error: "Jellyfin not configured" });
        }

        const token = req.user.jellyfinToken || config.apiKey;

        const response = await axios.get(`${config.url}/Items/${itemId}`, {
            headers: { "Authorization": `MediaBrowser Token="${token}"` },
            timeout: 10000
        });

        const item = response.data;
        if (!item?.Id) {
            const err = new Error("Track not found");
            err.status = 404;
            throw err;
        }

        res.json({
            id: item.Id,
            title: item.Name,
            artist: item.AlbumArtist || item.Artists?.[0] || "Unknown",
            album: item.Album || "Unknown",
            duration: Math.round((item.RunTimeTicks || 0) / 10000000),
            coverArt: item.ImageTags?.Primary ? `/api/jellyfin/cover/${item.Id}` : null
        });
    } catch (e) {
        console.error("Jellyfin Track Info Error:", e.message);
        next(e);
    }
});

// GET /api/jellyfin/cover/:itemId - Cover Art Proxy
router.get("/cover/:itemId", async (req, res, next) => {
    const { itemId } = req.params;

    try {
        let config = req.user.jellyfinConfig;
        if (!config) config = await getGlobalJellyfinConfig();

        if (!config) {
            return res.status(400).json({ error: "Jellyfin not configured" });
        }

        const token = req.user.jellyfinToken || config.apiKey;
        const coverUrl = `${config.url}/Items/${itemId}/Images/Primary?maxWidth=300&maxHeight=300&quality=90`;

        const response = await axios({
            method: 'GET',
            url: coverUrl,
            headers: { "Authorization": `MediaBrowser Token="${token}"` },
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
