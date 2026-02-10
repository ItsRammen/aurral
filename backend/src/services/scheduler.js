import { db } from "../config/db.js";
import { updateDiscoveryCache, refreshPersonalDiscoveryForAllUsers } from "./discovery.js";
import { syncNavidromeHistory } from "./navidrome.js";
import { prefetchArtistImages } from "./imageProxy.js";
import { loadSettings } from "./api.js";
import { startDownloadTracker } from "./downloadTracker.js";

let discoveryInterval = null;

export const startDiscoverySchedule = async () => {
    if (discoveryInterval) clearInterval(discoveryInterval);
    const settings = await loadSettings();
    const hours = settings.discoveryRefreshInterval || 24;
    console.log(`Scheduling discovery refresh every ${hours} hours.`);
    discoveryInterval = setInterval(updateDiscoveryCache, hours * 60 * 60 * 1000);
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
                updateDiscoveryCache(); // This updates discoveryLastRun in DB
            } else {
                console.log(
                    `Discovery cache is fresh (last updated ${lastUpdated}). Skipping initial update.`,
                );
            }
        } catch (e) {
            console.error("Scheduler init error:", e);
        }
    }, 5000);

    setTimeout(syncNavidromeHistory, 10000);
    setInterval(syncNavidromeHistory, 30 * 60 * 1000);

    setInterval(refreshPersonalDiscoveryForAllUsers, 1 * 60 * 60 * 1000);
    setTimeout(refreshPersonalDiscoveryForAllUsers, 30000);

    // Image prefetch - run after discovery cache is loaded, then hourly
    setTimeout(() => {
        prefetchArtistImages().catch(err => console.error("Startup image prefetch failed:", err));
    }, 60000); // 1 minute after startup
    setInterval(() => {
        prefetchArtistImages().catch(err => console.error("Scheduled image prefetch failed:", err));
    }, 6 * 60 * 60 * 1000); // Every 6 hours

    // Download tracker - monitors queue and handles stuck downloads
    setTimeout(() => {
        startDownloadTracker().catch(err => console.error("Download tracker failed to start:", err));
    }, 15000); // 15 seconds after startup
};

