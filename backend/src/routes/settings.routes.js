import express from "express";
import { db } from "../config/db.js";
import { Op } from "sequelize";
import axios from "axios";
import { requirePermission } from "../middleware/auth.js";
import { probeLidarrUrl, loadSettings, LIDARR_URL, LIDARR_API_KEY, lastfmRequest } from "../services/api.js";
import { restartDiscoverySchedule } from "../services/scheduler.js";
import { updateDiscoveryCache } from "../services/discovery.js";
import { PERMISSIONS } from "../config/permissions.js";

const router = express.Router();

router.get("/", async (req, res, next) => {
    try {
        const settings = await loadSettings();

        // If not admin, return only public/default settings to populated dropdowns
        if (!req.user || !req.user.permissions.includes(PERMISSIONS.ADMIN)) {
            return res.json({
                rootFolderPath: settings.rootFolderPath,
                qualityProfileId: settings.qualityProfileId,
                metadataProfileId: settings.metadataProfileId,
                searchForMissingAlbums: settings.searchForMissingAlbums,
                albumFolders: settings.albumFolders,
                monitored: settings.monitored
            });
        }

        res.json(settings);
    } catch (error) {
        next(error);
    }
});

// Get system statistics
router.get("/system/stats", requirePermission(PERMISSIONS.ADMIN), async (req, res, next) => {
    try {
        const fs = await import('fs/promises');
        const path = await import('path');

        // Get image cache stats
        const totalImages = await db.ImageCache.count();
        const cachedLocally = await db.ImageCache.count({
            where: {
                localPath: { [Op.not]: null }
            }
        });
        const notFound = await db.ImageCache.count({
            where: {
                url: 'NOT_FOUND'
            }
        });

        // Calculate disk usage for cached images
        let diskUsageBytes = 0;
        const cacheDir = path.default.join(process.cwd(), 'data', 'image_cache');
        try {
            const files = await fs.readdir(cacheDir);
            for (const file of files) {
                const stats = await fs.stat(path.default.join(cacheDir, file));
                diskUsageBytes += stats.size;
            }
        } catch (e) {
            // Cache directory may not exist
        }

        // Format disk usage
        const formatBytes = (bytes) => {
            if (bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        };

        res.json({
            imageCache: {
                total: totalImages,
                cachedLocally,
                notFound,
                pendingDownload: totalImages - cachedLocally - notFound,
                diskUsage: formatBytes(diskUsageBytes),
                diskUsageBytes
            }
        });
    } catch (error) {
        next(error);
    }
});

// Test Lidarr Connection
router.post("/test-lidarr", requirePermission(PERMISSIONS.ADMIN), async (req, res, next) => {
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
        next(error);
    }
});

// Test Last.fm API Key
router.post("/test-lastfm", requirePermission(PERMISSIONS.ADMIN), async (req, res, next) => {
    const { lastfmApiKey } = req.body;

    if (!lastfmApiKey) {
        return res.status(400).json({ error: "Missing Last.fm API Key" });
    }

    try {
        // Test with a simple API call
        const response = await axios.get("https://ws.audioscrobbler.com/2.0/", {
            params: {
                method: "chart.getTopArtists",
                api_key: lastfmApiKey,
                format: "json",
                limit: 1
            },
            timeout: 5000
        });

        if (response.data?.error) {
            return res.status(401).json({ error: response.data.message || "Invalid API Key" });
        }

        res.json({ success: true, message: "Last.fm API key is valid" });
    } catch (error) {
        console.error("Last.fm test connection failed:", error.message);
        if (error.response?.data?.error) {
            return res.status(401).json({ error: error.response.data.message || "Invalid API Key" });
        }
        next(error);
    }
});

router.post("/", requirePermission(PERMISSIONS.ADMIN), async (req, res, next) => {
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
            updates.defaultPermissions = [PERMISSIONS.REQUEST];
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

        // Apply Trust Proxy setting instantly
        if (typeof updates.proxyTrusted !== 'undefined') {
            if (updates.proxyTrusted) {
                console.log("Trust Proxy enabled via settings update.");
                req.app.set('trust proxy', 1);
            } else {
                console.log("Trust Proxy disabled via settings update.");
                req.app.set('trust proxy', 0);
            }
        }

        if (updates.discoveryRefreshInterval !== oldDiscoveryRefreshInterval) {
            restartDiscoverySchedule();
        }

        res.json(newSettings);
    } catch (error) {
        next(error);
    }
});

// Test OIDC Connection
router.post("/test-oidc", requirePermission(PERMISSIONS.ADMIN), async (req, res, next) => {
    const { issuerUrl } = req.body;

    if (!issuerUrl) {
        return res.status(400).json({ error: "Missing OIDC Issuer URL" });
    }

    let discoveryUrl = issuerUrl;

    try {
        // Handle cases where user pastes the full metadata URL or just the issuer
        if (!discoveryUrl.includes('/.well-known/openid-configuration')) {
            discoveryUrl = `${issuerUrl.replace(/\/$/, '')}/.well-known/openid-configuration`;
        }

        const response = await axios.get(discoveryUrl, { timeout: 5000 });

        if (response.status === 200 && response.data.issuer) {
            res.json({
                success: true,
                message: "OIDC Discovery Successful",
                config: {
                    issuer: response.data.issuer,
                    authorization_endpoint: response.data.authorization_endpoint,
                    token_endpoint: response.data.token_endpoint
                }
            });
        } else {
            res.status(400).json({ error: "Invalid OIDC Configuration found at URL" });
        }

    } catch (error) {
        console.error(`OIDC test failed for ${discoveryUrl}:`, error.message);
        const msg = error.response ? `Remote Server Error: ${error.response.status}` : error.message;
        res.status(400).json({ error: `Discovery Failed for ${discoveryUrl}: ${msg}` });
    }
});

export default router;
