import express from "express";
import { db } from "../config/db.js";
import axios from "axios";
import { requirePermission } from "../middleware/auth.js";
import { probeLidarrUrl, loadSettings, LIDARR_URL, LIDARR_API_KEY } from "../services/api.js";
import { restartDiscoverySchedule } from "../services/scheduler.js";

const router = express.Router();

router.get("/", async (req, res) => {
    try {
        const settings = await loadSettings();
        res.json(settings);
    } catch (error) {
        res.status(500).json({ error: "Failed to load settings" });
    }
});

// Test Lidarr Connection
router.post("/test-lidarr", requirePermission("admin"), async (req, res) => {
    const { lidarrUrl, lidarrApiKey } = req.body;

    if (!lidarrUrl || !lidarrApiKey) {
        return res.status(400).json({ error: "Missing Lidarr URL or API Key" });
    }

    try {
        // Remove trailing slash
        const url = lidarrUrl.replace(/\/+$/, '');
        // Probe system status
        await axios.get(`${url}/api/v1/system/status`, {
            headers: { "X-Api-Key": lidarrApiKey },
            timeout: 5000
        });
        res.json({ success: true, message: "Connection successful" });
    } catch (error) {
        console.error("Lidarr test connection failed:", error.message);
        if (error.response) {
            if (error.response.status === 401) {
                return res.status(401).json({ error: "Invalid API Key (Unauthorized)" });
            }
            if (error.response.status === 404) {
                return res.status(404).json({ error: "Lidarr API endpoint not found. Check URL." });
            }
        }
        res.status(500).json({ error: error.message || "Connection failed" });
    }
});

router.post("/", requirePermission("admin"), async (req, res) => {
    try {
        const updates = req.body;

        // Get current values for comparison
        const currentSettings = await loadSettings();
        const oldLidarrUrl = currentSettings.lidarrUrl;
        const oldLidarrApiKey = currentSettings.lidarrApiKey;
        const oldDiscoveryRefreshInterval = currentSettings.discoveryRefreshInterval;

        // Merge updates (only updated fields)
        // Ensure defaultPermissions is array if present
        if (updates.defaultPermissions && !Array.isArray(updates.defaultPermissions)) {
            updates.defaultPermissions = ["request"];
        }
        if (typeof updates.discoveryRefreshInterval !== 'undefined') {
            updates.discoveryRefreshInterval = parseInt(updates.discoveryRefreshInterval) || 24;
        }

        // Upsert settings
        const [config, created] = await db.AppConfig.upsert({
            key: 'main',
            ...currentSettings,
            ...updates
        });

        // Refresh cache immediately
        const newSettings = await loadSettings(true);

        // Re-probe if Lidarr config changed
        if (updates.lidarrUrl !== oldLidarrUrl || updates.lidarrApiKey !== oldLidarrApiKey) {
            await probeLidarrUrl();
        }

        if (updates.discoveryRefreshInterval !== oldDiscoveryRefreshInterval) {
            restartDiscoverySchedule();
        }

        res.json(newSettings);
    } catch (error) {
        console.error("Failed to save settings:", error);
        res.status(500).json({ error: "Failed to save settings" });
    }
});

export default router;
