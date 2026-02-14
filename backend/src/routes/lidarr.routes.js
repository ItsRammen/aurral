import express from "express";
import axios from "axios";
import { Op } from "sequelize";
import { db } from "../config/db.js";
import crypto from "crypto";
import { requirePermission } from "../middleware/auth.js";
import {
    lidarrRequest,
    getCachedLidarrArtists,
    invalidateLidarrCache,
    LIDARR_URL,
    LIDARR_API_KEY,
    loadSettings
} from "../services/api.js";
import { PERMISSIONS } from "../config/permissions.js";

const router = express.Router();
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Get Lidarr artists (with request metadata)
router.get("/artists", async (req, res, next) => {
    try {
        const artists = await getCachedLidarrArtists();
        // Optimize: fetching all requests might be okay if not huge.
        const requests = await db.Request.findAll();

        const enrichedArtists = artists.map(artist => {
            const match = requests.find(r => r.mbid && r.mbid.toLowerCase() === (artist.foreignArtistId || "").toLowerCase());
            return {
                ...artist,
                requestedBy: match ? match.requestedBy : null,
                requestedByUserId: match ? match.requestedByUserId : null
            };
        });

        res.json(enrichedArtists);
    } catch (error) {
        next(error);
    }
});

// Get Single Artist
router.get("/artists/:id", async (req, res, next) => {
    try {
        const { id } = req.params;
        const artist = await lidarrRequest(`/artist/${id}`);
        // id here is Lidarr ID or MBID? Lidarr uses numeric IDs usually for /artist/:id, but accepts MBID? 
        // If it's Lidarr ID, we need its MBID to check requests.
        // artist object has foreignArtistId (MBID).
        const match = await db.Request.findOne({ where: { mbid: artist.foreignArtistId } });

        res.json({
            ...artist,
            requestedBy: match ? match.requestedBy : null,
            requestedByUserId: match ? match.requestedByUserId : null
        });
    } catch (error) {
        next(error);
    }
});

// Lookup Artist by MBID
router.get("/lookup/:mbid", async (req, res, next) => {
    try {
        const { mbid } = req.params;

        if (!UUID_REGEX.test(mbid)) {
            return res.status(400).json({ error: "Invalid MBID format" });
        }

        const artists = await getCachedLidarrArtists();
        const existingArtist = artists.find(
            (artist) => artist.foreignArtistId === mbid,
        );

        const activeRequest = await db.Request.findOne({
            where: {
                mbid: mbid,
                status: { [Op.ne]: "denied" } // Find any request not denied
            }
        });

        res.json({
            exists: !!existingArtist,
            artist: existingArtist || null,
            pending: activeRequest?.status === "pending_approval",
            request: activeRequest || null
        });
    } catch (error) {
        next(error);
    }
});

// Get Recent Artists
router.get("/recent", async (req, res, next) => {
    try {
        const artists = await getCachedLidarrArtists();
        const recent = [...artists]
            .sort((a, b) => new Date(b.added) - new Date(a.added))
            .slice(0, 20);

        const requests = await db.Request.findAll();

        const enrichedRecent = recent.map(artist => {
            const match = requests.find(r => r.mbid && r.mbid.toLowerCase() === (artist.foreignArtistId || "").toLowerCase());
            return {
                ...artist,
                requestedBy: match ? match.requestedBy : null,
                requestedByUserId: match ? match.requestedByUserId : null
            };
        });

        res.json(enrichedRecent);
    } catch (error) {
        next(error);
    }
});

// Proxy for Lidarr media covers
router.get("/mediacover/:artistId/:filename", async (req, res, next) => {
    try {
        const { artistId, filename } = req.params;
        const coverType = filename.split(".")[0];
        const lidarrUrl = LIDARR_URL();
        const apiKey = LIDARR_API_KEY();

        if (!lidarrUrl || !apiKey) {
            return res.status(503).json({ error: "Lidarr not configured" });
        }

        const imageResponse = await axios.get(
            `${lidarrUrl}/api/v1/mediacover/${artistId}/${coverType}`,
            {
                headers: {
                    "X-Api-Key": apiKey,
                },
                responseType: "arraybuffer",
            },
        );

        res.setHeader("Content-Type", "image/jpeg");
        res.send(imageResponse.data);
    } catch (error) {
        // For media proxy, 404 is common and acceptable to handle nicely, but next(error) works too 
        // if we have a robust handler. 
        // However, standard handler might log it as error. 
        // Let's keep specific 404 response for images to avoid log noise?
        // Or just next(error) and let handler decide.
        // Given it's a proxy, let's stick to next(error) but maybe with a specific error type if we wanted.
        // For now, next(error) is consistent.
        next(error);
    }
});

// Library Stats
router.get("/library/stats", async (req, res, next) => {
    try {
        const artists = await getCachedLidarrArtists();

        if (!artists || artists.length === 0) {
            return res.json({
                totalArtists: 0,
                totalAlbums: 0,
                totalTracks: 0,
                totalSize: 0,
                health: 0,
                genreCounts: [],
                topStorage: []
            });
        }

        let totalAlbums = 0;
        let totalTracks = 0;
        let availableTracks = 0;
        let totalSize = 0;
        const genreCounts = {};
        const artistSizes = [];

        artists.forEach(artist => {
            if (artist.statistics) {
                totalAlbums += artist.statistics.albumCount || 0;
                totalTracks += artist.statistics.trackCount || 0;
                availableTracks += artist.statistics.trackFileCount || 0;
                totalSize += artist.statistics.sizeOnDisk || 0;
                artistSizes.push({
                    name: artist.artistName,
                    size: artist.statistics.sizeOnDisk || 0
                });
            }

            if (artist.genres && Array.isArray(artist.genres)) {
                artist.genres.forEach(genre => {
                    genreCounts[genre] = (genreCounts[genre] || 0) + 1;
                });
            }
        });

        const topGenres = Object.entries(genreCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([name, count]) => ({ name, count }));

        const topStorage = artistSizes
            .sort((a, b) => b.size - a.size)
            .slice(0, 5);

        const health = totalTracks > 0 ? Math.round((availableTracks / totalTracks) * 100) : 0;

        res.json({
            totalArtists: artists.length,
            totalAlbums,
            totalTracks,
            availableTracks,
            totalSize,
            health,
            genreCounts: topGenres,
            topStorage
        });
    } catch (error) {
        next(error);
    }
});

// Update monitored status for albums (Admin only)
router.post("/albums/monitor", requirePermission(PERMISSIONS.ADMIN), async (req, res, next) => {
    try {
        const { albumIds, monitored } = req.body;
        if (!albumIds || !Array.isArray(albumIds)) {
            return res.status(400).json({ error: "albumIds array is required" });
        }
        const result = await lidarrRequest("/album/monitor", "POST", {
            albumIds,
            monitored: !!monitored,
        });
        res.json(result);
    } catch (error) {
        next(error);
    }
});

// Delete Artist (Admin only)
router.delete("/artists/:id", requirePermission(PERMISSIONS.ADMIN), async (req, res, next) => {
    try {
        const { id } = req.params;
        const { deleteFiles = false } = req.query;

        await lidarrRequest(`/artist/${id}?deleteFiles=${deleteFiles}`, "DELETE");
        // Invalidates cache implicitly by time, or usually we might force one.

        res.json({ success: true, message: "Artist deleted successfully" });
    } catch (error) {
        next(error);
    }
});

// Update Artist (Admin only)
router.put("/artists/:id", requirePermission(PERMISSIONS.ADMIN), async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await lidarrRequest(`/artist/${id}`, "PUT", req.body);
        invalidateLidarrCache();
        res.json(result);
    } catch (error) {
        next(error);
    }
});


// Get Root Folders
router.get("/rootfolder", async (req, res, next) => {
    try {
        const rootFolders = await lidarrRequest("/rootfolder");
        res.json(rootFolders);
    } catch (error) {
        next(error);
    }
});


// Get Quality Profiles
router.get("/qualityprofile", async (req, res, next) => {
    try {
        const profiles = await lidarrRequest("/qualityprofile");
        res.json(profiles);
    } catch (error) {
        next(error);
    }
});

// Get Metadata Profiles
router.get("/metadataprofile", async (req, res, next) => {
    try {
        const profiles = await lidarrRequest("/metadataprofile");
        res.json(profiles);
    } catch (error) {
        next(error);
    }
});


// Batch Lookup
router.post("/lookup/batch", async (req, res, next) => {
    try {
        const { mbids } = req.body;
        if (!Array.isArray(mbids)) {
            return res.status(400).json({ error: "mbids must be an array" });
        }

        const artists = await getCachedLidarrArtists();

        const results = {};
        mbids.forEach((mbid) => {
            const artist = artists.find((a) => a.foreignArtistId === mbid);
            results[mbid] = !!artist;
        });

        res.json(results);
    } catch (error) {
        next(error);
    }
});

// Add Artist
router.post("/artists", requirePermission(PERMISSIONS.REQUEST), async (req, res, next) => {
    try {
        const {
            foreignArtistId,
            artistName,
            qualityProfileId,
            metadataProfileId,
            rootFolderPath,
            monitored,
            searchForMissingAlbums,
            albumFolders,
        } = req.body;

        if (!foreignArtistId || !artistName) {
            return res.status(400).json({
                error: "foreignArtistId and artistName are required",
            });
        }

        const savedSettings = await loadSettings();

        let rootFolder = rootFolderPath ?? savedSettings.rootFolderPath;
        let qualityProfile = qualityProfileId ?? savedSettings.qualityProfileId;
        let metadataProfile = metadataProfileId ?? savedSettings.metadataProfileId;
        let isMonitored = monitored ?? savedSettings.monitored;
        let searchMissing =
            searchForMissingAlbums ?? savedSettings.searchForMissingAlbums;
        let useAlbumFolders = albumFolders ?? savedSettings.albumFolders;

        if (!rootFolder) {
            const rootFolders = await lidarrRequest("/rootfolder");
            if (rootFolders.length === 0) {
                return res.status(400).json({
                    error: "No root folders configured in Lidarr",
                });
            }
            rootFolder = rootFolders[0].path;
        }

        if (!qualityProfile) {
            const qualityProfiles = await lidarrRequest("/qualityprofile");
            if (qualityProfiles.length === 0) {
                return res.status(400).json({
                    error: "No quality profiles configured in Lidarr",
                });
            }
            qualityProfile = qualityProfiles[0].id;
        }

        if (!metadataProfile) {
            const metadataProfiles = await lidarrRequest("/metadataprofile");
            if (metadataProfiles.length === 0) {
                return res.status(400).json({
                    error: "No metadata profiles configured in Lidarr",
                });
            }
            metadataProfile = metadataProfiles[0].id;
        }

        // Respect explicit monitor value from frontend, default to "none" for clarity
        const monitor = req.body.monitor ?? "none";

        const artistData = {
            foreignArtistId,
            artistName,
            qualityProfileId: qualityProfile,
            metadataProfileId: metadataProfile,
            rootFolderPath: rootFolder,
            monitored: isMonitored,
            albumFolder: useAlbumFolders,
            monitorNewItems: "none",
            addOptions: {
                searchForMissingAlbums: searchMissing,
                monitor: monitor,
            },
        };

        if (req.body.albums && Array.isArray(req.body.albums) && req.body.albums.length > 0) {
            artistData.albums = req.body.albums.map(album => ({
                foreignAlbumId: album.id,
                monitored: true,
                addOptions: {
                    searchForMissingAlbums: searchMissing
                }
            }));
        }

        const isAuthorized = req.user.permissions.includes(PERMISSIONS.ADMIN) ||
            req.user.permissions.includes(PERMISSIONS.AUTO_APPROVE) ||
            req.user.permissions.includes(PERMISSIONS.MANAGE_REQUESTS);
        let result = { id: null };

        if (isAuthorized) {
            console.log("Adding artist to Lidarr with data:", JSON.stringify(artistData, null, 2));
            result = await lidarrRequest("/artist", "POST", artistData);
            console.log("Lidarr response:", JSON.stringify(result, null, 2));
        } else {
            console.log(`User ${req.user.username} (ID: ${req.user.id}) is NOT authorized for auto-approval. Staging request...`);
        }

        // Bug fix: If artist was added as unmonitored despite being requested as monitored (Lidarr Bug #3597)
        if (isAuthorized && isMonitored && result.id && !result.monitored) {
            console.log(`Lidarr Bug detected: Artist ${result.id} added as unmonitored. Fixing...`);
            try {
                result = await lidarrRequest(`/artist/${result.id}`, "PUT", {
                    ...result,
                    monitored: true
                });
            } catch (e) {
                console.error("Failed to fix unmonitored artist bug:", e.message);
            }
        }

        // Explicitly trigger search if requested
        if (isAuthorized && searchMissing && result.id) {
            try {
                await lidarrRequest("/command", "POST", {
                    name: "ArtistSearch",
                    artistId: result.id
                });
                console.log(`Triggered ArtistSearch for artist ${result.id}`);
            } catch (e) {
                console.error("Failed to trigger initial search:", e.message);
            }
        }

        const newRequest = {
            uniqueId: crypto.randomUUID(),
            mbid: foreignArtistId,
            artistName: artistName,
            // image: req.body.image || null, // Request model doesn't have image column usually, but can add? 
            // Assuming no image column in Request model for now (it wasn't in definition I think). 
            // But db.json had it. If I lose it, UI might show placeholder.
            // Request model has keys: mbid, artistName, status, requestedBy, requestedByUserId, foreignArtistId, tags, genres, requestData
            timestamp: new Date(),
            requestedBy: req.user.username,
            requestedByUserId: req.user.id,
            status: isAuthorized ? "requested" : "pending_approval",
            foreignArtistId: result.id || null, // Lidarr ID
            requestData: isAuthorized ? null : {
                ...req.body,
                qualityProfileId: qualityProfile,
                metadataProfileId: metadataProfile,
                rootFolderPath: rootFolder,
                monitored: isMonitored,
                albumFolders: useAlbumFolders,
                searchForMissingAlbums: searchMissing
            }
        };

        // Use upsert or findOne/create
        const existingRequest = await db.Request.findOne({ where: { mbid: foreignArtistId } });

        if (existingRequest) {
            await existingRequest.update(newRequest);
        } else {
            await db.Request.create(newRequest);
        }

        // Auto-like
        // const existingLike = await db.Like.findOne({ where: { mbid: foreignArtistId, userId: req.user.id } });
        // if (!existingLike) { ... }
        await db.Like.findOrCreate({
            where: { mbid: foreignArtistId, userId: req.user.id },
            defaults: {
                artistName: artistName,
                likedAt: new Date()
                // image: req.body.image // Like model may need image column if we want to store it.
                // Like.js: mbid, userId, artistName, artistImage, likedAt.
            }
        });

        // If Model Like has artistImage, update it?
        if (req.body.image) {
            // We can update the Like if needed, or rely on defaults.
            // defaults only used on Create.
        }

        invalidateLidarrCache();
        res.status(201).json(isAuthorized ? result : { message: "Request submitted for approval", pending: true });
    } catch (error) {
        next(error);
    }
});

// Get Albums
router.get("/albums", async (req, res, next) => {
    try {
        const { artistId } = req.query;
        if (!artistId) {
            return res.status(400).json({ error: "artistId parameter is required" });
        }
        const albums = await lidarrRequest(`/album?artistId=${artistId}`);
        res.json(albums);
    } catch (error) {
        next(error);
    }
});

// Get Tracks
router.get("/tracks", async (req, res, next) => {
    try {
        const { albumId } = req.query;
        if (!albumId) {
            return res.status(400).json({ error: "albumId parameter is required" });
        }

        // Fetch tracks and trackfiles to show progress
        const [tracks, trackFiles] = await Promise.all([
            lidarrRequest(`/track?albumId=${albumId}`),
            lidarrRequest(`/trackfile?artistId=${req.query.artistId || ""}`)
        ]);

        // Map track files to tracks for easy lookup
        const enrichedTracks = tracks.map(track => {
            const file = trackFiles.find(f => f.id === track.trackFileId);
            return {
                ...track,
                hasFile: !!track.trackFileId,
                quality: file?.quality || null,
                size: file?.size || 0
            };
        });

        res.json(enrichedTracks);
    } catch (error) {
        next(error);
    }
});

// Update Album (Admin only)
router.put("/albums/:id", requirePermission(PERMISSIONS.ADMIN), async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await lidarrRequest(`/album/${id}`, "PUT", req.body);
        res.json(result);
    } catch (error) {
        next(error);
    }
});

// Album Search Command (Admin only)
router.post("/command/albumsearch", requirePermission(PERMISSIONS.ADMIN), async (req, res, next) => {
    try {
        const { albumIds } = req.body;
        if (!albumIds || !Array.isArray(albumIds)) {
            return res
                .status(400)
                .json({ error: "albumIds array is required" });
        }
        const result = await lidarrRequest("/command", "POST", {
            name: "AlbumSearch",
            albumIds,
        });
        res.json(result);
    } catch (error) {
        next(error);
    }
});

// General Command (Admin only)
router.post("/command", requirePermission(PERMISSIONS.ADMIN), async (req, res, next) => {
    try {
        const result = await lidarrRequest("/command", "POST", req.body);
        res.json(result);
    } catch (error) {
        next(error);
    }
});

// Get download queue progress with stuck detection
router.get("/queue/progress", async (req, res, next) => {
    try {
        const { getQueueProgress } = await import("../services/downloadTracker.js");
        const progress = await getQueueProgress();
        res.json(progress);
    } catch (error) {
        next(error);
    }
});

// Manually retry a stuck download
router.post("/queue/:id/retry", async (req, res, next) => {
    try {
        const { manualRetry } = await import("../services/downloadTracker.js");
        const result = await manualRetry(parseInt(req.params.id));
        if (result.success) {
            res.json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        next(error);
    }
});

export default router;
