import { db } from "../config/db.js";
import axios from "axios";

export const syncNavidromeHistory = async () => {
    try {
        const users = await db.User.findAll();
        // Filter in JS or Query? Query is cleaner but JSON query is dialect specific. JS filter is fine for small userbase.
        const usersWithConfig = users.filter(u => u.navidromeConfig && u.navidromeConfig.url);

        console.log(`[Navidrome] Starting history sync for ${usersWithConfig.length} users...`);

        for (const user of usersWithConfig) {
            try {
                const config = user.navidromeConfig;
                // Navidrome: getRecentlyPlayed does not exist in standard API. Using getNowPlaying as fallback.
                const historyUrl = `${config.url}/rest/getNowPlaying.view?u=${config.username}&t=${config.token}&s=${config.salt}&v=1.16.1&c=Aurral&f=json`;
                const response = await axios.get(historyUrl, { timeout: 15000 });

                const subRes = response.data['subsonic-response'];
                if (subRes?.status !== 'ok') continue;

                // Handle 'nowPlaying' response (Single item might be object, multiple array)
                let entries = subRes.nowPlaying?.entry || [];
                if (!Array.isArray(entries)) entries = [entries];

                const tracks = entries;
                if (tracks.length > 0) {
                    let addedCount = 0;

                    for (const track of tracks) {
                        // Check if already synced (prevent duplicates by ID and user)
                        // Using existing logic: only log unique tracks ever played per user
                        const exists = await db.Play.findOne({
                            where: {
                                trackId: String(track.id),
                                userId: user.id
                            }
                        });

                        if (!exists) {
                            await db.Play.create({
                                userId: user.id,
                                trackId: String(track.id),
                                trackName: track.title,
                                artistName: track.artist,
                                albumName: track.album,
                                duration: track.duration,
                                playedAt: new Date(),
                                source: 'navidrome'
                            });
                            addedCount++;
                        }
                    }

                    if (addedCount > 0) {
                        console.log(`[Navidrome] Synced ${addedCount} active tracks for user ${user.username}`);
                    }
                }
            } catch (e) {
                console.error(`[Navidrome] History sync failed for user ${user.username}:`, e.message);
            }
        }
    } catch (e) {
        console.error("Navidrome sync error:", e);
    }
};
