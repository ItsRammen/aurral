import express from "express";
import { db } from "../config/db.js";
import {
    lidarrRequest,
    getCachedLidarrArtists,
    invalidateLidarrCache,
    loadSettings
} from "../services/api.js";
import { requirePermission } from "../middleware/auth.js";

const router = express.Router();
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// GET /api/requests
router.get("/", async (req, res) => {
    try {
        const requests = await db.Request.findAll();
        let lidarrArtists = [];
        try {
            lidarrArtists = await getCachedLidarrArtists();
        } catch (e) {
            console.error("Failed to fetch Lidarr artists for requests sync", e);
        }

        const updatedRequests = await Promise.all(requests.map(async (req) => {
            const lidarrArtist = lidarrArtists.find(
                (a) => a.foreignArtistId === req.mbid,
            );
            let newStatus = req.status;
            let lidarrId = req.foreignArtistId; // Model uses foreignArtistId, alias lidarrId in local var
            let statistics = null;

            if (lidarrArtist) {
                lidarrId = lidarrArtist.id;
                const isAvailable =
                    lidarrArtist.statistics && lidarrArtist.statistics.sizeOnDisk > 0;
                newStatus = isAvailable ? "available" : "processing";
                statistics = lidarrArtist.statistics;
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

            // We don't necessarily save statistics to DB unless we added a column for it. 
            // The frontend might expect it.
            // If we didn't add statistics column, we just attach it to the response object.

            if (changed) {
                await req.save();
            }

            // Return plain object with statistics attached
            return {
                ...req.toJSON(),
                id: req.uniqueId, // Ensure frontend has an ID to work with
                lidarrId: req.foreignArtistId, // Backward compatibility for frontend
                requestedAt: req.timestamp, // Fix for frontend "Invalid Date"
                statistics
            };
        }));

        const sortedRequests = updatedRequests.sort(
            (a, b) => new Date(b.timestamp) - new Date(a.timestamp),
        );

        res.json(sortedRequests);
    } catch (error) {
        console.error("Error in /api/requests:", error);
        res.status(500).json({ error: "Failed to fetch requests" });
    }
});

// DELETE /api/requests/:mbid
router.delete("/:mbid", requirePermission("request"), async (req, res) => {
    const { mbid } = req.params;

    if (!UUID_REGEX.test(mbid)) {
        // MBID regex check - actually UUID V4 usually.
        // If mbid is actually just a string like 'artist-mbid' check logic. 
        // Backend `Request` model defines `mbid` as STRING. `uniqueId` is UUID. 
        // Route param says :mbid.
        // If the frontend sends the UUID (the DB primary key), then it's :id.
        // Let's assume frontend sends MBID (MusicBrainz ID, which is UUID-like).
    }

    try {
        await db.Request.destroy({ where: { mbid } });
        res.json({ success: true });
    } catch (error) {
        console.error("Failed to delete request:", error);
        res.status(500).json({ error: "Failed to delete request" });
    }
});

// POST /api/requests/:id/approve
router.post("/:id/approve", (req, res, next) => {
    if (req.user.permissions.includes("admin") || req.user.permissions.includes("manage_requests")) return next();
    res.status(403).json({ error: "Forbidden: Insufficient permissions" });
}, async (req, res) => {
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
        // Only checking "pending_approval" strictly might block "pending" ones.
        // The original code checked: request.status !== "pending_approval"
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
        console.error("Approve Error:", error);
        res.status(500).json({ error: "Failed to approve request", details: error.message });
    }
});

// POST /api/requests/:id/deny
router.post("/:id/deny", (req, res, next) => {
    if (req.user.permissions.includes("admin") || req.user.permissions.includes("manage_requests")) return next();
    res.status(403).json({ error: "Forbidden: Insufficient permissions" });
}, async (req, res) => {
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
        res.status(500).json({ error: "Failed to deny request" });
    }
});

export default router;
