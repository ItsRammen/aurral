import { db } from "../config/db.js";
import axios from "axios";

export const syncJellyfinHistory = async () => {
    try {
        const users = await db.User.findAll();
        const usersWithConfig = users.filter(u =>
            u.jellyfinUserId && u.jellyfinToken &&
            (u.jellyfinConfig?.url || false)
        );

        // Also check users who have personal tokens but use global config
        const globalConfig = await getGlobalConfig();
        const allEligible = users.filter(u => {
            if (u.jellyfinUserId && u.jellyfinToken) {
                return u.jellyfinConfig?.url || globalConfig?.url;
            }
            return false;
        });

        console.log(`[Jellyfin] Starting history sync for ${allEligible.length} users...`);

        for (const user of allEligible) {
            try {
                const config = user.jellyfinConfig || globalConfig;
                if (!config?.url) continue;

                const token = user.jellyfinToken;
                const userId = user.jellyfinUserId;

                // Get recently played audio items
                const historyUrl = `${config.url}/Users/${userId}/Items?SortBy=DatePlayed&SortOrder=Descending&IncludeItemTypes=Audio&Limit=50&Recursive=true&IsPlayed=true`;

                const response = await axios.get(historyUrl, {
                    headers: { "Authorization": `MediaBrowser Token="${token}"` },
                    timeout: 15000
                });

                const items = response.data?.Items || [];

                if (items.length > 0) {
                    let addedCount = 0;

                    for (const item of items) {
                        const trackId = String(item.Id);
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
                                trackName: item.Name || "Unknown",
                                artistName: item.AlbumArtist || item.Artists?.[0] || "Unknown",
                                albumName: item.Album || "Unknown",
                                duration: Math.round((item.RunTimeTicks || 0) / 10000000),
                                playedAt: item.UserData?.LastPlayedDate ? new Date(item.UserData.LastPlayedDate) : new Date(),
                                source: 'jellyfin'
                            });
                            addedCount++;
                        }
                    }

                    if (addedCount > 0) {
                        console.log(`[Jellyfin] Synced ${addedCount} tracks for user ${user.username}`);
                    }
                }
            } catch (e) {
                console.error(`[Jellyfin] History sync failed for user ${user.username}:`, e.message);
            }
        }
    } catch (e) {
        console.error("Jellyfin sync error:", e);
    }
};

// Helper to get global config from any admin
async function getGlobalConfig() {
    const admins = await db.User.findAll();
    const admin = admins.find(u =>
        u.permissions.includes('admin') &&
        u.jellyfinConfig?.url
    );
    return admin?.jellyfinConfig;
}
