import express from "express";
import { db } from "../config/db.js";
import {
    lidarrRequest,
    getCachedLidarrArtists,
    invalidateLidarrCache,
    loadSettings
} from "../services/api.js";
import { requirePermission } from "../middleware/auth.js";
import { PERMISSIONS } from "../config/permissions.js";

const router = express.Router();
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// GET /api/requests
router.get("/", async (req, res, next) => {
    try {
        const [requests, lidarrArtists, activeDownloads, openIssues] = await Promise.all([
            db.Request.findAll(),
            getCachedLidarrArtists().catch(e => {
                console.error("Failed to fetch Lidarr artists", e);
                return [];
            }),
            db.DownloadProgress.findAll(),
            db.Issue.findAll({ where: { status: 'open' } })
        ]);

        const updatedRequests = await Promise.all(requests.map(async (req) => {
            const lidarrArtist = lidarrArtists.find(
                (a) => a.foreignArtistId === req.mbid,
            );
            let newStatus = req.status;
            let lidarrId = req.foreignArtistId;
            let statistics = null;

            // Check for issues first (highest priority)
            const hasIssue = openIssues.some(i =>
                i.artistMbid === req.mbid || i.artistName === req.artistName
            );

            // Check for active downloads
            const isDownloading = activeDownloads.some(d =>
                d.artistId === lidarrId || d.artistName === req.artistName
            );

            if (lidarrArtist) {
                lidarrId = lidarrArtist.id;
                const isAvailable =
                    lidarrArtist.statistics && lidarrArtist.statistics.sizeOnDisk > 0;

                if (hasIssue) {
                    newStatus = "issue";
                } else if (isDownloading) {
                    newStatus = "downloading";
                } else {
                    newStatus = isAvailable ? "available" : "processing";
                }
                statistics = lidarrArtist.statistics;
            } else if (req.status !== 'pending' && req.status !== 'pending_approval' && req.status !== 'denied') {
                // If not in Lidarr but was processed, maybe it was deleted?
                if (hasIssue) newStatus = "issue";
            }

            let changed = false;
            if (newStatus !== req.status) {
                req.status = newStatus;
                changed = true;
            }
            if (lidarrId !== req.foreignArtistId) {
                req.foreignArtistId = lidarrId;
                changed = true;
            }

            if (changed) {
                await req.save();
            }

            return {
                ...req.toJSON(),
                id: req.uniqueId,
                lidarrId: req.foreignArtistId,
                requestedAt: req.timestamp,
                statistics,
                hasIssue,
                isDownloading
            };
        }));

        const sortedRequests = updatedRequests.sort(
            (a, b) => new Date(b.timestamp) - new Date(a.timestamp),
        );

        res.json(sortedRequests);
    } catch (error) {
        next(error);
    }
});

// DELETE /api/requests/:mbid
router.delete("/:mbid", requirePermission(PERMISSIONS.REQUEST), async (req, res, next) => {
    const { mbid } = req.params;

    try {
        const request = await db.Request.findOne({ where: { mbid } });

        if (!request) {
            return res.status(404).json({ error: "Request not found" });
        }

        // Security: Only allow deletion by the original requester or admins
        const isOwner = request.requestedByUserId === req.user.id;
        const isAdmin = req.user.permissions.includes(PERMISSIONS.ADMIN) ||
            req.user.permissions.includes(PERMISSIONS.MANAGE_REQUESTS);

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ error: "Cannot delete others' requests" });
        }

        await request.destroy();
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

// POST /api/requests/:id/approve
router.post("/:id/approve", (req, res, next) => {
    if (req.user.permissions.includes(PERMISSIONS.ADMIN) || req.user.permissions.includes(PERMISSIONS.MANAGE_REQUESTS)) return next();
    res.status(403).json({ error: "Forbidden: Insufficient permissions" });
}, async (req, res, next) => {
    const { id } = req.params;

    try {
        const request = await db.Request.findOne({ where: { uniqueId: id } }); // Assuming id param is the PK uniqueId

        if (!request) {
            return res.status(404).json({ error: "Request not found" });
        }

        // Allow approving if pending OR pending_approval (frontend might send either?)
        // Standard flow: pending -> approved -> processing
        // or pending -> processing in one step if auto-approved.
        // Here admin manually approves.
        if (request.status !== "pending_approval" && request.status !== "pending") {
            // Relaxed check to allow re-approving stuck requests or pending ones
        }

        const requestData = request.requestData || {};
        const savedSettings = await loadSettings();

        let rootFolder = requestData.rootFolderPath ?? savedSettings.rootFolderPath;
        let qualityProfile = requestData.qualityProfileId ?? savedSettings.qualityProfileId;
        let metadataProfile = requestData.metadataProfileId ?? savedSettings.metadataProfileId;
        let isMonitored = requestData.monitored ?? savedSettings.monitored;
        let searchMissing = requestData.searchForMissingAlbums ?? savedSettings.searchForMissingAlbums;
        let useAlbumFolders = requestData.albumFolders ?? savedSettings.albumFolders;

        if (!rootFolder || !qualityProfile || !metadataProfile) {
            // console.error("Missing config:", {rootFolder, qualityProfile, metadataProfile});
            return res.status(400).json({ error: "System configuration (Root Folder/Profiles) missing" });
        }

        const artistData = {
            foreignArtistId: request.mbid,
            artistName: request.artistName,
            qualityProfileId: qualityProfile,
            metadataProfileId: metadataProfile,
            rootFolderPath: rootFolder,
            monitored: isMonitored,
            albumFolder: useAlbumFolders,
            addOptions: {
                searchForMissingAlbums: searchMissing,
                monitor: requestData.albums?.length > 0 ? "none" : (requestData.monitor || "all"),
            },
        };

        if (requestData.albums && Array.isArray(requestData.albums)) {
            artistData.albums = requestData.albums.map(album => ({
                foreignAlbumId: album.id,
                monitored: true,
                addOptions: { searchForMissingAlbums: searchMissing }
            }));
        }

        console.log("Approving artist add to Lidarr:", request.artistName);
        const result = await lidarrRequest("/artist", "POST", artistData);

        if (searchMissing && result.id) {
            try { await lidarrRequest("/command", "POST", { name: "ArtistSearch", artistId: result.id }); } catch (e) { }
        }

        invalidateLidarrCache(); // Force refresh of Lidarr artists cache

        request.status = "processing";
        request.foreignArtistId = result.id;
        // request.approvedAt = new Date(); // If we add this column
        // request.approvedBy = req.user.username; // If we add this column

        await request.save();
        res.json(request);

    } catch (error) {
        next(error);
    }
});

// POST /api/requests/:id/deny
router.post("/:id/deny", (req, res, next) => {
    if (req.user.permissions.includes(PERMISSIONS.ADMIN) || req.user.permissions.includes(PERMISSIONS.MANAGE_REQUESTS)) return next();
    res.status(403).json({ error: "Forbidden: Insufficient permissions" });
}, async (req, res, next) => {
    const { id } = req.params;

    try {
        const request = await db.Request.findOne({ where: { uniqueId: id } });

        if (!request) {
            return res.status(404).json({ error: "Request not found" });
        }

        request.status = "denied";
        // request.deniedAt = ...
        await request.save();

        res.json(request);
    } catch (error) {
        next(error);
    }
});

export default router;
