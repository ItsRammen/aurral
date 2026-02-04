import { db } from "../config/db.js";
import { updateDiscoveryCache, refreshPersonalDiscoveryForAllUsers } from "./discovery.js";
import { syncNavidromeHistory } from "./navidrome.js";
import { loadSettings } from "./api.js";

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
};
