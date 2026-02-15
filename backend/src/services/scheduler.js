import { db } from "../config/db.js";
import { Op } from "sequelize";
import { updateDiscoveryCache, refreshPersonalDiscoveryForAllUsers } from "./discovery.js";
import { syncNavidromeHistory } from "./navidrome.js";
import { prefetchArtistImages } from "./imageProxy.js";
import { loadSettings } from "./api.js";
import { startDownloadTracker } from "./downloadTracker.js";
import { runJob } from "./jobs.js";
import Issue from "../models/Issue.js";

let discoveryInterval = null;

export const startDiscoverySchedule = async () => {
    if (discoveryInterval) clearInterval(discoveryInterval);
    const settings = await loadSettings();
    const hours = settings.discoveryRefreshInterval || 24;
    console.log(`Scheduling discovery refresh every ${hours} hours.`);
    discoveryInterval = setInterval(() => {
        runJob('DiscoveryRefresh', updateDiscoveryCache).catch(e => console.error("Scheduled discovery refresh failed:", e));
    }, hours * 60 * 60 * 1000);
};

export const restartDiscoverySchedule = () => {
    console.log("Restarting discovery schedule...");
    startDiscoverySchedule();
};

export const initScheduler = async () => {
    // Initial sync on startup
    await startDiscoverySchedule();

    // Delayed checks to prevent slow startup
    setTimeout(async () => {
        try {
            const config = await db.AppConfig.findByPk('main');
            const lastUpdated = config?.discoveryLastRun;
            const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
            if (!lastUpdated || new Date(lastUpdated).getTime() < twentyFourHoursAgo) {
                runJob('DiscoveryRefresh', updateDiscoveryCache).catch(e => console.error("Initial discovery refresh failed:", e));
            } else {
                console.log(
                    `Discovery cache is fresh (last updated ${lastUpdated}). Skipping initial update.`,
                );
            }
        } catch (e) {
            console.error("Scheduler init error:", e);
        }
    }, 5000);

    setTimeout(() => runJob('NavidromeSync', syncNavidromeHistory), 10000);
    setInterval(() => runJob('NavidromeSync', syncNavidromeHistory), 30 * 60 * 1000);

    setInterval(() => runJob('PersonalDiscovery', refreshPersonalDiscoveryForAllUsers), 1 * 60 * 60 * 1000);
    setTimeout(() => runJob('PersonalDiscovery', refreshPersonalDiscoveryForAllUsers), 30000);

    // Image prefetch - run after discovery cache is loaded, then hourly
    setTimeout(() => {
        runJob('ImagePrefetch', prefetchArtistImages).catch(err => console.error("Startup image prefetch failed:", err));
    }, 60000); // 1 minute after startup
    setInterval(() => {
        runJob('ImagePrefetch', prefetchArtistImages).catch(err => console.error("Scheduled image prefetch failed:", err));
    }, 6 * 60 * 60 * 1000); // Every 6 hours

    // Download tracker - monitors queue and handles stuck downloads
    setTimeout(() => {
        startDownloadTracker().catch(err => console.error("Download tracker failed to start:", err));
    }, 15000); // 15 seconds after startup

    // Retention Policy: Cleanup resolved issues daily
    setTimeout(cleanupResolvedIssues, 60000); // Run once on startup after 1 min
    setInterval(cleanupResolvedIssues, 24 * 60 * 60 * 1000); // Run daily
};


// Cleanup resolved issues based on retention policy
export const cleanupResolvedIssues = async () => {
    try {
        const settings = await loadSettings();
        const retentionDays = settings.issueRetentionDays || 30; // Default 30 days

        if (retentionDays <= 0) return; // 0 or negative means disable cleanup (or keep forever)

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

        const deletedCount = await Issue.destroy({
            where: {
                status: 'resolved',
                updatedAt: {
                    [Op.lt]: cutoffDate
                }
            }
        });

        if (deletedCount > 0) {
            console.log(`[Scheduler] Cleaned up ${deletedCount} resolved issues older than ${retentionDays} days.`);
        }
    } catch (error) {
        console.error("[Scheduler] Failed to cleanup resolved issues:", error);
    }
};

