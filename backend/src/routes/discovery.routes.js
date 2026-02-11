import express from "express";
import { db } from "../config/db.js";
import {
    discoveryCache,
    updateDiscoveryCache,
    refreshPersonalDiscoveryForAllUsers,
    isPersonalUpdating,
    generatePersonalDiscovery
} from "../services/discovery.js";
import {
    getCachedLidarrArtists,
    lastfmRequest,
    musicbrainzRequest,
    lidarrRequest,
    LASTFM_API_KEY
} from "../services/api.js";
import { requirePermission } from "../middleware/auth.js";

const router = express.Router();

// GET /api/discover - Get global discovery data
router.get("/discover", (req, res) => {
    res.json({
        recommendations: discoveryCache.recommendations,
        globalTop: discoveryCache.globalTop,
        globalTopTracks: discoveryCache.globalTopTracks,
        basedOn: discoveryCache.basedOn,
        topTags: discoveryCache.topTags,
        topGenres: discoveryCache.topGenres,
        lastUpdated: discoveryCache.lastUpdated,
        isUpdating: discoveryCache.isUpdating,
    });
});

// GET /api/discover/personal - Get personal discovery data
router.get("/discover/personal", async (req, res) => {
    try {
        const { limit = 20 } = req.query;
        // Generate on demand if cache missing or old? 
        // For now, we rely on the scheduler/cache, but this function 'generatePersonalDiscovery' 
        // reads from cache OR generates if missing.
        const personal = await generatePersonalDiscovery(req.user.id, null, parseInt(limit));
        res.json(personal);
    } catch (error) {
        console.error("Personal discovery error:", error);
        res.status(500).json({ error: "Failed to get personal discovery" });
    }
});

// POST /api/discover/refresh - Trigger global update (Admin only)
router.post("/discover/refresh", requirePermission("admin"), (req, res) => {
    if (discoveryCache.isUpdating) {
        return res.status(409).json({
            message: "Discovery update already in progress",
            isUpdating: true,
        });
    }
    updateDiscoveryCache();
    res.json({
        message: "Discovery update started",
        isUpdating: true,
    });
});

// Rate limiting map for personal refresh
const personalRefreshCooldowns = new Map();

// POST /api/discover/personal/refresh - Trigger personal update (User)
router.post("/discover/personal/refresh", async (req, res) => {
    const userId = req.user.id;
    const now = Date.now();
    const COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes

    // Admin bypass for cooldown? Optional, but let's enforce for all to prevents abuse/load
    if (!req.user.permissions?.includes("admin")) {
        const lastRefresh = personalRefreshCooldowns.get(userId);
        if (lastRefresh && (now - lastRefresh) < COOLDOWN_MS) {
            const remaining = Math.ceil((COOLDOWN_MS - (now - lastRefresh)) / 60000);
            return res.status(429).json({
                message: `Please wait ${remaining} minutes before refreshing again.`,
                retryAfter: remaining
            });
        }
    }

    if (isPersonalUpdating) {
        // Technically this flag tracks the GLOBAL "refresh all" job.
        // Individual refreshes generally don't block each other unless we want to.
        // But generatePersonalDiscovery handles concurrency for the *same* user.
        // We'll let it slide unless the global job is running which might be heavy.
        if (isPersonalUpdating) {
            return res.status(409).json({
                message: "System-wide update in progress, please try again later.",
                isUpdating: true,
            });
        }
    }

    try {
        personalRefreshCooldowns.set(userId, now);
        // Force update
        await generatePersonalDiscovery(userId, null, 20, true);
        res.json({ message: "Recommendations refreshed" });
    } catch (error) {
        console.error("Personal refresh error:", error);
        res.status(500).json({ error: "Failed to refresh recommendations" });
    }
});

// POST /api/discover/personal/refresh-all - Trigger personal update for ALL users (Admin only)
router.post("/discover/personal/refresh-all", requirePermission("admin"), (req, res) => {
    if (isPersonalUpdating) {
        return res.status(409).json({
            message: "Personal discovery update already in progress",
            isUpdating: true,
        });
    }
    refreshPersonalDiscoveryForAllUsers();
    res.json({
        message: "Personal discovery update started for all users",
        isUpdating: true,
    });
});

// POST /api/discover/clear - Clear cache (Admin only)
router.post("/discover/clear", requirePermission("admin"), async (req, res) => {
    try {
        await db.AppConfig.update({
            discoveryData: {
                recommendations: [],
                globalTop: [],
                globalTopTracks: [],
                basedOn: [],
                topTags: [],
                topGenres: [],
                lastUpdated: null,
            }
        }, { where: { key: 'main' } });

        await db.ImageCache.destroy({ where: {}, truncate: true });

        // Update memory cache
        Object.assign(discoveryCache, {
            recommendations: [],
            globalTop: [],
            globalTopTracks: [],
            basedOn: [],
            topTags: [],
            topGenres: [],
            lastUpdated: null,
            isUpdating: false
        });

        res.json({ message: "Discovery cache and image cache cleared" });
    } catch (error) {
        console.error("Clear cache error:", error);
        res.status(500).json({ error: "Failed to clear cache" });
    }
});


// GET /api/dashboard - Dashboard aggregator
router.get("/dashboard", async (req, res) => {
    try {
        const userId = req.user.id;
        // User-level API keys not implemented - use global key

        const [discovery, personal, requests, recentlyAdded, likedMBIDs] = await Promise.all([
            // Global Discovery (Cached)
            Promise.resolve({
                recommendations: discoveryCache.recommendations,
                globalTop: discoveryCache.globalTop,
                globalTopTracks: discoveryCache.globalTopTracks,
                basedOn: discoveryCache.basedOn,
                topTags: discoveryCache.topTags,
                topGenres: discoveryCache.topGenres,
                lastUpdated: discoveryCache.lastUpdated,
                isUpdating: discoveryCache.isUpdating,
            }),
            // Personal discovery (Cached per user)
            generatePersonalDiscovery(userId, null, 20),
            // Requests synced with Lidarr
            (async () => {
                const reqs = await db.Request.findAll();
                const lidarrArtists = await getCachedLidarrArtists();
                return reqs.map(r => {
                    const la = lidarrArtists.find(a => a.foreignArtistId === r.mbid);
                    if (la) {
                        const isAvailable = la.statistics && la.statistics.sizeOnDisk > 0;
                        return {
                            ...r.toJSON(), // Ensure plain object
                            name: r.artistName, // Map for frontend
                            status: isAvailable ? "available" : "processing",
                            lidarrId: la.id,
                            requestedAt: r.timestamp, // Fix for correct date display on frontend
                            statistics: la.statistics
                        };
                    }
                    return {
                        ...r.toJSON(),
                        name: r.artistName, // Map for frontend
                        requestedAt: r.timestamp // Fix for correct date display on frontend
                    };
                }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // createdAt usually
            })(),
            // Recently added from Lidarr
            (async () => {
                const artists = await getCachedLidarrArtists();
                const recent = [...artists]
                    .sort((a, b) => new Date(b.added) - new Date(a.added))
                    .slice(0, 20);
                const reqs = await db.Request.findAll();
                return recent.map(artist => {
                    const match = reqs.find(r => r.mbid && r.mbid.toLowerCase() === (artist.foreignArtistId || "").toLowerCase());
                    return {
                        ...artist,
                        requestedBy: match ? match.requestedBy : null,
                        requestedByUserId: match ? match.requestedByUserId : null
                    };
                });
            })(),
            // User liked MBIDs
            (async () => {
                const likes = await db.Like.findAll({ where: { userId } });
                return likes.map(l => l.mbid);
            })()
        ]);

        // Batch lookup mapping for existence
        const lidarrArtists = await getCachedLidarrArtists();
        const existingArtists = {};
        [...discovery.recommendations, ...personal.recommendations, ...discovery.globalTop].forEach(a => {
            if (a.id) existingArtists[a.id] = lidarrArtists.some(la => la.foreignArtistId === a.id);
        });

        res.json({
            discovery: discovery,
            personal: personal,
            requests: requests,
            recentlyAdded: recentlyAdded,
            likedArtists: likedMBIDs,
            existingArtists: existingArtists
        });
    } catch (error) {
        console.error("Dashboard error:", error);
        res.status(500).json({ error: "Failed to load dashboard data" });
    }
});



// GET /api/discover/related - Get related artists
router.get("/discover/related", (req, res) => {
    res.json({
        recommendations: discoveryCache.recommendations,
        basedOn: discoveryCache.basedOn,
        total: discoveryCache.recommendations.length,
    });
});

// GET /api/discover/similar - Get similar artists
router.get("/discover/similar", (req, res) => {
    res.json({
        topTags: discoveryCache.topTags,
        topGenres: discoveryCache.topGenres,
        basedOn: discoveryCache.basedOn,
        message: "Served from cache",
    });
});

// GET /api/discover/by-tag
router.get("/discover/by-tag", async (req, res) => {
    try {
        const { tag, limit = 20 } = req.query;

        if (!tag) {
            return res.status(400).json({ error: "Tag parameter is required" });
        }

        let recommendations = [];

        if (LASTFM_API_KEY()) {
            try {
                const data = await lastfmRequest("tag.getTopArtists", {
                    tag,
                    limit: Math.min(parseInt(limit) * 2, 50),
                });

                if (data?.topartists?.artist) {
                    const artists = Array.isArray(data.topartists.artist)
                        ? data.topartists.artist
                        : [data.topartists.artist];

                    recommendations = artists
                        .map((artist) => {
                            let imageUrl = null;
                            if (artist.image && Array.isArray(artist.image)) {
                                const img =
                                    artist.image.find((i) => i.size === "extralarge") ||
                                    artist.image.find((i) => i.size === "large") ||
                                    artist.image.slice(-1)[0];
                                if (
                                    img &&
                                    img["#text"] &&
                                    !img["#text"].includes("2a96cbd8b46e442fc41c2b86b821562f")
                                ) {
                                    imageUrl = img["#text"];
                                }
                            }

                            return {
                                id: artist.mbid,
                                name: artist.name,
                                sortName: artist.name,
                                type: "Artist",
                                tags: [tag],
                                image: imageUrl,
                            };
                        })
                        .filter((a) => a.id);
                }
            } catch (err) {
                console.error("Last.fm tag search failed:", err.message);
            }
        }

        if (recommendations.length === 0) {
            const data = await musicbrainzRequest("/artist", {
                query: `tag:"${tag}" AND type:Group`,
                limit,
            });

            recommendations = (data.artists || []).map((artist) => ({
                id: artist.id,
                name: artist.name,
                sortName: artist["sort-name"],
                type: artist.type,
                tags: (artist.tags || []).map((t) => t.name),
                disambiguation: artist.disambiguation,
            }));
        }

        const lidarrArtists = await lidarrRequest("/artist");
        const existingArtistIds = new Set(
            lidarrArtists.map((a) => a.foreignArtistId),
        );

        const filtered = recommendations
            .filter((artist) => !existingArtistIds.has(artist.id))
            .slice(0, parseInt(limit));

        res.json({
            recommendations: filtered,
            tag,
            total: filtered.length,
        });
    } catch (error) {
        res.status(500).json({
            error: "Failed to search by tag",
            message: error.message,
        });
    }
});

// --- Recommendations Routes ---

// GET /api/recommendations/navidrome
router.get("/recommendations/navidrome", async (req, res) => {
    try {
        const personal = await generatePersonalDiscovery(req.user.id, null);
        res.json(personal.recommendations || []);
    } catch (error) {
        console.error("Navidrome recommendations error:", error);
        res.status(500).json({ error: "Failed to get recommendations" });
    }
});

export default router;
