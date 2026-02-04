import express from "express";
import { db } from "../config/db.js";
import {
    discoveryCache,
    updateDiscoveryCache,
    refreshPersonalDiscoveryForAllUsers,
    isPersonalUpdating
} from "../services/discovery.js";
import { syncNavidromeHistory } from "../services/navidrome.js";
import { requirePermission } from "../middleware/auth.js";

const router = express.Router();

// GET /api/jobs/status - Get status of background jobs
router.get("/status", requirePermission("admin"), (req, res) => {
    const jobs = []; // Jobs history not yet migrated to SQLite
    // Also include discovery status if needed by frontend (though typical use is just jobs list)
    // For now, return the jobs array as expected by SettingsPage.jsx
    res.json(jobs);
});

// POST /api/jobs/discover - Trigger global discovery
router.post("/discover", requirePermission("admin"), async (req, res) => {
    if (discoveryCache.isUpdating) {
        return res.status(400).json({ error: "Discovery is already running" });
    }

    // Run in background
    updateDiscoveryCache().catch(err => console.error("Manual discovery failed:", err));

    res.json({ message: "Global discovery started" });
});

// POST /api/jobs/refresh-navidrome - Trigger Navidrome history sync & personal discovery
router.post("/refresh-navidrome", requirePermission("admin"), async (req, res) => {
    try {
        // Trigger both history sync and personal recommendations
        console.log("Manual trigger: Syncing Navidrome history and refreshing recommendations...");

        // Run sequentially or parallel? 
        // Sync history first, then generate recommendations based on new history.
        await syncNavidromeHistory();
        refreshPersonalDiscoveryForAllUsers().catch(err => console.error("Manual personal discovery failed:", err));

        res.json({ message: "Navidrome history sync and personal discovery started" });
    } catch (error) {
        console.error("Manual Navidrome job failed:", error);
        res.status(500).json({ error: "Failed to run Navidrome job" });
    }
});

export default router;
