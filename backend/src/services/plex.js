import { db } from "../config/db.js";
import axios from "axios";

export const syncPlexHistory = async () => {
    try {
        const users = await db.User.findAll();
        const globalConfig = await getGlobalConfig();

        // Find users who have Plex configured (either personal or global)
        const eligibleUsers = users.filter(u => {
            const config = u.plexConfig || globalConfig;
            return config?.url && config?.token;
        });

        console.log(`[Plex] Starting history sync for ${eligibleUsers.length} users...`);

        for (const user of eligibleUsers) {
            try {
                const config = user.plexConfig || globalConfig;
                if (!config?.url || !config?.token) continue;

                const token = config.token;

                // Get recently played music from Plex (type 10 = track)
                // Using /status/sessions for currently playing and /library/recentlyAdded for recent
                const headers = {
                    "Accept": "application/json",
                    "X-Plex-Token": token,
                    "X-Plex-Client-Identifier": "aurral",
                    "X-Plex-Product": "Aurral"
                };

                // Try to get active sessions first (currently playing)
                const sessionsUrl = `${config.url}/status/sessions`;
                const sessionsResponse = await axios.get(sessionsUrl, {
                    headers,
                    timeout: 15000
                }).catch(() => ({ data: { MediaContainer: { Metadata: [] } } }));

                const sessions = sessionsResponse.data?.MediaContainer?.Metadata || [];
                // Filter to music tracks only (type = "track")
                const musicSessions = sessions.filter(s => s.type === "track");

                if (musicSessions.length > 0) {
                    let addedCount = 0;

                    for (const track of musicSessions) {
                        const trackId = String(track.ratingKey);
                        const exists = await db.Play.findOne({
                            where: {
                                trackId,
                                userId: user.id
                            }
                        });

                        if (!exists) {
                            await db.Play.create({
                                userId: user.id,
                                trackId,
                                trackName: track.title || "Unknown",
                                artistName: track.grandparentTitle || "Unknown",
                                albumName: track.parentTitle || "Unknown",
                                duration: Math.round((track.duration || 0) / 1000),
                                playedAt: new Date(),
                                source: 'plex'
                            });
                            addedCount++;
                        }
                    }

                    if (addedCount > 0) {
                        console.log(`[Plex] Synced ${addedCount} tracks for user ${user.username}`);
                    }
                }
            } catch (e) {
                console.error(`[Plex] History sync failed for user ${user.username}:`, e.message);
            }
        }
    } catch (e) {
        console.error("Plex sync error:", e);
    }
};

// Helper to get global config from any admin
async function getGlobalConfig() {
    const admins = await db.User.findAll();
    const admin = admins.find(u =>
        u.permissions.includes('admin') &&
        u.plexConfig?.url
    );
    return admin?.plexConfig;
}
