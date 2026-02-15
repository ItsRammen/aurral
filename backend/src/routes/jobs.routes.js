import express from "express";
import { db } from "../config/db.js";
import {
    discoveryCache,
    updateDiscoveryCache,
    refreshPersonalDiscoveryForAllUsers,
    isPersonalUpdating
} from "../services/discovery.js";
import { syncNavidromeHistory } from "../services/navidrome.js";
import { syncJellyfinHistory } from "../services/jellyfin.js";
import { syncPlexHistory } from "../services/plex.js";
import { prefetchArtistImages } from "../services/imageProxy.js";
import { requirePermission } from "../middleware/auth.js";
import { PERMISSIONS } from "../config/permissions.js";
import { runJob, getLatestJobStatus } from "../services/jobs.js";

const router = express.Router();

// GET /api/jobs/status - Get status of background jobs
router.get("/status", requirePermission(PERMISSIONS.ADMIN), async (req, res) => {
    try {
        const jobNames = [
            'DiscoveryRefresh',
            'PersonalDiscovery',
            'NavidromeSync',
            'JellyfinSync',
            'PlexSync',
            'ImagePrefetch'
        ];

        // Fetch latest status for each job
        // This is inefficient loop but simpler for now given few jobs
        const statuses = await Promise.all(jobNames.map(async jobName => {
            const latest = await db.JobLog.findOne({
                where: { name: jobName },
                order: [['startedAt', 'DESC']],
                limit: 1
            });

            // If running, double check if it's actually running or stale?
            // For now assume DB is truth.
            // Override with memory state for discovery if available
            if (jobName === 'DiscoveryRefresh' && discoveryCache.isUpdating) {
                return { name: jobName, status: 'running', startedAt: new Date() };
            }
            if (jobName === 'PersonalDiscovery' && isPersonalUpdating) {
                return { name: jobName, status: 'running', startedAt: new Date() };
            }

            return latest || { name: jobName, status: 'idle', startedAt: null, completedAt: null };
        }));

        res.json(statuses);
    } catch (error) {
        console.error("Failed to get job status:", error);
        res.status(500).json({ error: "Failed to get job status" });
    }
});

// POST /api/jobs/discover - Trigger global discovery (legacy)
router.post("/discover", requirePermission(PERMISSIONS.ADMIN), async (req, res) => {
    if (discoveryCache.isUpdating) {
        return res.status(400).json({ error: "Discovery is already running" });
    }

    // Run in background via job wrapper
    runJob('DiscoveryRefresh', updateDiscoveryCache)
        .catch(err => console.error("Manual discovery failed:", err));

    res.json({ message: "Global discovery started" });
});

// POST /api/jobs/refresh-discovery - Trigger global discovery refresh
router.post("/refresh-discovery", requirePermission(PERMISSIONS.ADMIN), async (req, res) => {
    if (discoveryCache.isUpdating) {
        return res.status(400).json({ error: "Discovery is already running" });
    }

    // Run in background via job wrapper
    runJob('DiscoveryRefresh', updateDiscoveryCache)
        .catch(err => console.error("Discovery refresh failed:", err));

    res.json({ message: "Discovery refresh started", success: true });
});

// POST /api/jobs/refresh-navidrome - Trigger Navidrome history sync & personal discovery
router.post("/refresh-navidrome", requirePermission(PERMISSIONS.ADMIN), async (req, res) => {
    try {
        // Run in background via job wrapper
        // Combines Sync + Personal Refresh into one job logically or run separately?
        // Let's run as one composite job 'NavidromeSync'
        runJob('NavidromeSync', async () => {
            console.log("NavidromeSync: Syncing history...");
            await syncNavidromeHistory();
            console.log("NavidromeSync: Refreshing personal discovery...");
            await refreshPersonalDiscoveryForAllUsers();
        }).catch(err => console.error("Manual Navidrome job failed:", err));

        res.json({ message: "Navidrome history sync and personal discovery started" });
    } catch (error) {
        console.error("Manual Navidrome job failed:", error);
        res.status(500).json({ error: "Failed to run Navidrome job" });
    }
});

// POST /api/jobs/refresh-jellyfin - Trigger Jellyfin history sync & personal discovery
router.post("/refresh-jellyfin", requirePermission(PERMISSIONS.ADMIN), async (req, res) => {
    try {
        runJob('JellyfinSync', async () => {
            console.log("JellyfinSync: Syncing history...");
            await syncJellyfinHistory();
            console.log("JellyfinSync: Refreshing personal discovery...");
            await refreshPersonalDiscoveryForAllUsers();
        }).catch(err => console.error("Manual Jellyfin job failed:", err));

        res.json({ message: "Jellyfin history sync and personal discovery started" });
    } catch (error) {
        console.error("Manual Jellyfin job failed:", error);
        res.status(500).json({ error: "Failed to run Jellyfin job" });
    }
});

// POST /api/jobs/refresh-plex - Trigger Plex history sync & personal discovery
router.post("/refresh-plex", requirePermission(PERMISSIONS.ADMIN), async (req, res) => {
    try {
        runJob('PlexSync', async () => {
            console.log("PlexSync: Syncing history...");
            await syncPlexHistory();
            console.log("PlexSync: Refreshing personal discovery...");
            await refreshPersonalDiscoveryForAllUsers();
        }).catch(err => console.error("Manual Plex job failed:", err));

        res.json({ message: "Plex history sync and personal discovery started" });
    } catch (error) {
        console.error("Manual Plex job failed:", error);
        res.status(500).json({ error: "Failed to run Plex job" });
    }
});

// POST /api/jobs/prefetch-images - Trigger image prefetch for discovery + library artists
router.post("/prefetch-images", requirePermission(PERMISSIONS.ADMIN), async (req, res) => {
    try {
        // Run in background
        runJob('ImagePrefetch', prefetchArtistImages)
            .catch(err => console.error("Image prefetch failed:", err));

        res.json({ message: "Image prefetch job started", success: true });
    } catch (error) {
        console.error("Image prefetch job failed:", error);
        res.status(500).json({ error: "Failed to start image prefetch job" });
    }
});

export default router;

