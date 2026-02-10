import { db } from "../config/db.js";
import { lastfmRequest, musicbrainzRequest, getCachedLidarrArtists, LASTFM_API_KEY, GENRE_KEYWORDS, loadSettings } from "./api.js";
import { getArtistImage } from "./images.js";

// Global cache state (in-memory, loaded from DB)
export let discoveryCache = {
    topTags: [],
    topGenres: [],
    globalTop: [],
    globalTopTracks: [],
    recommendations: [],
    basedOn: [],
    lastUpdated: null,
    isUpdating: false,
};

// Initialize cache from DB
export const initDiscoveryCache = async () => {
    try {
        const config = await db.AppConfig.findByPk('main');
        if (config && config.discoveryData) {
            discoveryCache = { ...discoveryCache, ...config.discoveryData, isUpdating: false };
            console.log("Discovery cache loaded from DB.");
        }
    } catch (e) {
        console.error("Failed to load discovery cache:", e);
    }
};

// Call init immediately (async, will complete whenever)
initDiscoveryCache();

export const personalDiscoveryCache = new Map();
export const pendingPersonalDiscovery = new Map();
export let isPersonalUpdating = false;

// ----------------------------------------------------------------------
// Global Discovery (Cached)
// ----------------------------------------------------------------------


export const updateDiscoveryCache = async () => {
    if (discoveryCache.isUpdating) return;
    discoveryCache.isUpdating = true;
    console.log("Starting background update of discovery recommendations...");

    const apiKey = LASTFM_API_KEY();

    try {
        const lidarrArtists = await getCachedLidarrArtists(true);
        console.log(`Found ${lidarrArtists.length} artists in Lidarr.`);

        const existingArtistIds = new Set(
            lidarrArtists.map((a) => a.foreignArtistId),
        );

        if (lidarrArtists.length === 0 && !apiKey) {
            console.log(
                "No artists in Lidarr and no Last.fm key. Skipping discovery.",
            );
            discoveryCache.isUpdating = false;
            return;
        }

        const tagCounts = new Map();
        const genreCounts = new Map();

        const seedArtists = lidarrArtists
            .sort(() => 0.5 - Math.random())
            .slice(0, 50);

        const profileSample = seedArtists.slice(0, 25);

        console.log(`Sampling tags/genres from ${profileSample.length} library artists for Lidarr-wide discovery...`);

        await Promise.all(
            profileSample.map(async (artist) => {
                let foundTags = false;
                if (apiKey) {
                    try {
                        const data = await lastfmRequest("artist.getTopTags", {
                            mbid: artist.foreignArtistId,
                        }, apiKey);
                        if (data?.toptags?.tag) {
                            const tags = Array.isArray(data.toptags.tag)
                                ? data.toptags.tag
                                : [data.toptags.tag];
                            tags.slice(0, 15).forEach((t) => {
                                tagCounts.set(
                                    t.name,
                                    (tagCounts.get(t.name) || 0) + (parseInt(t.count) || 1),
                                );
                                const l = t.name.toLowerCase();
                                if (GENRE_KEYWORDS.some((g) => l.includes(g)))
                                    genreCounts.set(t.name, (genreCounts.get(t.name) || 0) + 1);
                            });
                            foundTags = true;
                        }
                    } catch (e) {
                        console.warn(
                            `Failed to get Last.fm tags for ${artist.artistName}: ${e.message}`,
                        );
                    }
                }

                if (!foundTags) {
                    try {
                        const data = await musicbrainzRequest(
                            `/artist/${artist.foreignArtistId}`,
                            { inc: "tags+genres" },
                        );
                        (data.tags || []).forEach((t) => {
                            tagCounts.set(
                                t.name,
                                (tagCounts.get(t.name) || 0) + (t.count || 1),
                            );
                            const l = t.name.toLowerCase();
                            if (GENRE_KEYWORDS.some((g) => l.includes(g)))
                                genreCounts.set(t.name, (genreCounts.get(t.name) || 0) + 1);
                        });
                        (data.genres || []).forEach((g) =>
                            genreCounts.set(
                                g.name,
                                (genreCounts.get(g.name) || 0) + (g.count || 1),
                            ),
                        );
                    } catch (e) {
                        console.warn(
                            `Failed to get MusicBrainz tags for ${artist.artistName}: ${e.message}`,
                        );
                    }
                }
            }),
        );

        discoveryCache.topTags = Array.from(tagCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 20)
            .map((t) => t[0]);
        discoveryCache.topGenres = Array.from(genreCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 24)
            .map((t) => t[0]);

        if (apiKey) {
            try {
                const topData = await lastfmRequest("chart.getTopArtists", {
                    limit: 100,
                }, apiKey);
                if (topData?.artists?.artist) {
                    const topArtists = Array.isArray(topData.artists.artist)
                        ? topData.artists.artist
                        : [topData.artists.artist];
                    discoveryCache.globalTop = topArtists
                        .map((a) => {
                            let img = null;
                            if (a.image && Array.isArray(a.image)) {
                                const i =
                                    a.image.find((img) => img.size === "extralarge") ||
                                    a.image.find((img) => img.size === "large");
                                if (
                                    i &&
                                    i["#text"] &&
                                    !i["#text"].includes("2a96cbd8b46e442fc41c2b86b821562f")
                                )
                                    img = i["#text"];
                            }
                            return { id: a.mbid, name: a.name, image: img, type: "Artist" };
                        })
                        .filter((a) => a.id && !existingArtistIds.has(a.id))
                        .slice(0, 32);
                }

                const trackData = await lastfmRequest("chart.getTopTracks", {
                    limit: 100,
                }, apiKey);
                if (trackData?.tracks?.track) {
                    const tracks = Array.isArray(trackData.tracks.track)
                        ? trackData.tracks.track
                        : [trackData.tracks.track];

                    discoveryCache.globalTopTracks = tracks.map((t) => {
                        let img = null;
                        if (t.image && Array.isArray(t.image)) {
                            const i =
                                t.image.find((img) => img.size === "extralarge") ||
                                t.image.find((img) => img.size === "large");
                            if (
                                i &&
                                i["#text"] &&
                                !i["#text"].includes("2a96cbd8b46e442fc41c2b86b821562f")
                            )
                                img = i["#text"];
                        }
                        return {
                            name: t.name,
                            artist: t.artist?.name,
                            artistMbid: t.artist?.mbid,
                            image: img,
                            playcount: t.playcount,
                            type: "Track",
                        };
                    });
                }
            } catch (e) {
                console.error(`Failed to fetch Global Top: ${e.message}`);
            }
        }

        const recSampleSize = Math.min(25, seedArtists.length);
        const recSample = [...seedArtists]
            .sort(() => 0.5 - Math.random())
            .slice(0, recSampleSize);
        const recommendations = new Map();

        discoveryCache.basedOn = recSample.map(a => ({ id: a.foreignArtistId, name: a.artistName }));

        await Promise.all(
            recSample.map(async (artist) => {
                try {
                    if (apiKey) {
                        const similar = await lastfmRequest("artist.getSimilar", {
                            mbid: artist.foreignArtistId,
                            limit: 25,
                        }, apiKey);
                        if (similar?.similarartists?.artist) {
                            const list = Array.isArray(similar.similarartists.artist)
                                ? similar.similarartists.artist
                                : [similar.similarartists.artist];
                            for (const s of list) {
                                if (
                                    s.mbid &&
                                    !existingArtistIds.has(s.mbid) &&
                                    !recommendations.has(s.mbid)
                                ) {
                                    let img = null;
                                    if (s.image && Array.isArray(s.image)) {
                                        const i =
                                            s.image.find((img) => img.size === "extralarge") ||
                                            s.image.find((img) => img.size === "large");
                                        if (
                                            i &&
                                            i["#text"] &&
                                            !i["#text"].includes("2a96cbd8b46e442fc41c2b86b821562f")
                                        )
                                            img = i["#text"];
                                    }
                                    recommendations.set(s.mbid, {
                                        id: s.mbid,
                                        name: s.name,
                                        type: "Artist",
                                        sourceArtist: artist.artistName,
                                        score: Math.round((s.match || 0) * 100),
                                        image: img,
                                    });
                                }
                            }
                        }
                    } else {
                        // Fallback: Use Lidarr Genres to find similar artists in library
                        const seedGenres = (artist.genres || []).map(g => g.toLowerCase());
                        if (seedGenres.length > 0) {
                            // ... existing fallback logic for intersecting genres ...
                            try {
                                const genre = seedGenres[0]; // Pick primary
                                if (genre) {
                                    const mbData = await musicbrainzRequest("/artist", {
                                        query: `tag:${genre} AND type:Group`,
                                        limit: 5
                                    });
                                    if (mbData.artists) {
                                        mbData.artists.forEach(a => {
                                            if (a.id && !existingArtistIds.has(a.id) && !recommendations.has(a.id)) {
                                                recommendations.set(a.id, {
                                                    id: a.id,
                                                    name: a.name,
                                                    type: "Artist",
                                                    sourceArtist: artist.artistName,
                                                    score: 50, // Arbitrary score for MB fallback
                                                    image: null
                                                });
                                            }
                                        });
                                    }
                                }
                            } catch (e) { }
                        }
                    }
                } catch (e) { }
            })
        );

        discoveryCache.recommendations = Array.from(recommendations.values())
            .sort((a, b) => b.score - a.score)
            .slice(0, 100);

        // Fetch images for top recommendations that lack them
        await Promise.all(
            discoveryCache.recommendations
                .slice(0, 20)
                .filter((a) => !a.image)
                .map(async (item) => {
                    try {
                        const img = await getArtistImage(item.id);
                        if (img.url) item.image = img.url;
                    } catch (e) { }
                }),
        );

        discoveryCache.lastUpdated = new Date().toISOString();
        discoveryCache.isUpdating = false;

        // Persist to DB (AppConfig)
        const config = await db.AppConfig.findByPk('main');
        if (config) {
            config.discoveryData = { ...discoveryCache, isUpdating: false };
            config.discoveryLastRun = new Date();
            await config.save();
        } else {
            await db.AppConfig.create({
                key: 'main',
                discoveryData: { ...discoveryCache, isUpdating: false },
                discoveryLastRun: new Date()
            });
        }

        console.log("Global discovery update complete.");

    } catch (error) {
        console.error("Discovery update failed:", error);
        discoveryCache.isUpdating = false;
    }
};



// ----------------------------------------------------------------------
// Personal Discovery (Per User)
// ----------------------------------------------------------------------

export const generatePersonalDiscovery = async (userId, userApiKey, limit = 20, force = false) => {
    const settings = await loadSettings();
    const personalIntervalHrs = settings.personalRefreshInterval || 6;
    const intervalMs = personalIntervalHrs * 60 * 60 * 1000;

    const now = Date.now();
    const cached = personalDiscoveryCache.get(userId);

    // 1. If update is already in progress...
    if (pendingPersonalDiscovery.has(userId)) {
        // If we have (stale) cache, return it immediately instead of waiting!
        if (cached) return cached.data;
        // Otherwise wait for the pending one
        return pendingPersonalDiscovery.get(userId);
    }

    // 2. Check Cache
    if (cached && !force) {
        const age = now - cached.timestamp;
        if (age < intervalMs) {
            // Fresh: return immediately
            return cached.data;
        } else {
            // Stale: Return data immediately, trigger background update
            console.log(`[Discovery] Cache stale for user ${userId} (${Math.round(age / 60000)}m old). Returning stale data + updating in background.`);

            // Fire and forget (catch errors to prevent unhandled rejections)
            generatePersonalDiscovery(userId, userApiKey, limit, true)
                .catch(e => console.error(`[Discovery] Background update failed for ${userId}:`, e.message));

            return cached.data;
        }
    }

    // 3. Generate New Data
    const fetchPromise = (async () => {
        const lidarrArtists = await getCachedLidarrArtists();
        const existingArtistIds = new Set(
            lidarrArtists.map((a) => a.foreignArtistId),
        );

        // Sequelize queries
        const userRequests = await db.Request.findAll({ where: { requestedByUserId: userId } });
        const userLikes = await db.Like.findAll({ where: { userId } });
        const userPlays = []; // TODO: Implement Play model

        // Create seed objects
        const seeds = [];

        // Add likes
        userLikes.forEach(l => {
            if (l.mbid && l.artistName) seeds.push({
                foreignArtistId: l.mbid,
                artistName: l.artistName,
                source: 'like'
            });
        });

        // Add requests
        userRequests.forEach(r => {
            if (r.mbid && r.artistName && !seeds.find(s => s.foreignArtistId === r.mbid)) {
                seeds.push({
                    foreignArtistId: r.mbid,
                    artistName: r.artistName,
                    source: 'request'
                });
            }
        });

        const seedArtists = seeds;

        if (seedArtists.length === 0) {
            return { recommendations: [], dailySuggestions: [], basedOn: [], topTags: [], topGenres: [], message: "No likes or requests" };
        }

        // OPTIMIZATION: Limits based on API Key availability
        const apiKey = userApiKey || LASTFM_API_KEY();
        let maxSamples = 10;

        if (!apiKey) {
            // Drastically reduce sample size for MusicBrainz fallback to prevent timeouts
            // 3 artists * 2 requests each = 6 seconds minimum on bottleneck
            maxSamples = 3;
            console.log(`[Discovery] No Last.fm key for user ${userId}. Reducing recommendation sample size to ${maxSamples} to save MB rate limit.`);
        }

        const recSampleSize = Math.min(maxSamples, seedArtists.length);
        const recSample = [...seedArtists]
            .sort(() => 0.5 - Math.random())
            .slice(0, recSampleSize);

        const recommendations = new Map();

        await Promise.all(
            recSample.map(async (artist) => {
                try {
                    if (apiKey) {
                        // ... Similar Artist Logic (Last.fm) ...
                        const similar = await lastfmRequest("artist.getSimilar", {
                            mbid: artist.foreignArtistId,
                            limit: 15,
                        }, apiKey);
                        if (similar?.similarartists?.artist) {
                            const list = Array.isArray(similar.similarartists.artist)
                                ? similar.similarartists.artist
                                : [similar.similarartists.artist];

                            for (const s of list) {
                                if (s.mbid && !existingArtistIds.has(s.mbid) && !recommendations.has(s.mbid)) {
                                    let img = null;
                                    if (s.image && Array.isArray(s.image)) {
                                        const i = s.image.find(img => img.size === 'extralarge') || s.image.find(img => img.size === 'large');
                                        if (i && i['#text'] && !i['#text'].includes('2a96cbd8b46e442fc41c2b86b821562f')) img = i['#text'];
                                    }
                                    recommendations.set(s.mbid, {
                                        id: s.mbid,
                                        name: s.name,
                                        type: 'Artist',
                                        sourceArtist: artist.artistName,
                                        score: Math.round((s.match || 0) * 100),
                                        image: img
                                    });
                                }
                            }
                        }
                    } else {
                        // Fallback: Using cache-friendly Lidarr genres where possible
                        let seedGenres = [];
                        const lidarrMatch = lidarrArtists.find(la => la.foreignArtistId === artist.foreignArtistId);

                        // Prefer already-cached Lidarr genres to avoid MB call
                        if (lidarrMatch && lidarrMatch.genres) {
                            seedGenres = lidarrMatch.genres.map(g => g.toLowerCase());
                        }

                        // If absolutely necessary, query MB (expensive)
                        if (seedGenres.length === 0) {
                            try {
                                const mbData = await musicbrainzRequest(`/artist/${artist.foreignArtistId}`, { inc: "tags+genres" });
                                if (mbData.genres) seedGenres = mbData.genres.map(g => g.name.toLowerCase());
                                if (mbData.tags) seedGenres = [...seedGenres, ...mbData.tags.map(t => t.name.toLowerCase())];
                            } catch (e) { }
                        }

                        // Query MB for similar artists by genre
                        if (seedGenres.length > 0) {
                            const sortedGenres = [...seedGenres].sort((a, b) => b.length - a.length);
                            const genre = sortedGenres[0];
                            if (genre) {
                                try {
                                    const mbData = await musicbrainzRequest("/artist", {
                                        query: `tag:"${genre}" AND (type:Group OR type:Person)`,
                                        limit: 15 // Slightly reduced from 20
                                    });

                                    if (mbData.artists) {
                                        const candidates = mbData.artists.filter(a =>
                                            a.id &&
                                            !existingArtistIds.has(a.id) &&
                                            !recommendations.has(a.id) &&
                                            (a.country || (a['life-span'] && a['life-span'].begin))
                                        );

                                        // Pick top 3 to keep it fast
                                        candidates.sort(() => 0.5 - Math.random());
                                        const selected = candidates.slice(0, 3);

                                        selected.forEach(a => {
                                            recommendations.set(a.id, {
                                                id: a.id,
                                                name: a.name,
                                                type: "Artist",
                                                sourceArtist: artist.artistName,
                                                score: 45,
                                                image: null
                                            });
                                        });
                                    }
                                } catch (e) { }
                            }
                        }
                    }

                } catch (e) { }
            })
        );

        const recommendationsArray = Array.from(recommendations.values())
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);

        // Fetch missing images (Only for top few to save bandwidth/time)
        const imageLimit = apiKey ? 20 : 5; // Reduced image fetch limit for non-API key

        await Promise.all(
            recommendationsArray.slice(0, imageLimit).filter(a => !a.image).map(async (item) => {
                try {
                    const img = await getArtistImage(item.id, userApiKey);
                    if (img.url) item.image = img.url;
                } catch (e) { }
            })
        );

        const today = new Date().toDateString();
        const dailySeed = `${today}-${userId}`;
        const seedNum = dailySeed.split('').reduce((a, c) => a + c.charCodeAt(0), 0);

        const seededShuffle = (arr) => {
            const shuffled = [...arr];
            let seed = seedNum;
            for (let i = shuffled.length - 1; i > 0; i--) {
                seed = (seed * 9301 + 49297) % 233280;
                const j = Math.floor((seed / 233280) * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            return shuffled;
        };

        const dailySuggestions = seededShuffle(recommendationsArray).slice(0, 10);
        const result = {
            recommendations: recommendationsArray,
            dailySuggestions,
            basedOn: recSample.map(a => ({ id: a.foreignArtistId, name: a.artistName })),
            topTags: [],
            topGenres: [],
            timestamp: now
        };

        personalDiscoveryCache.set(userId, { timestamp: now, data: result });
        return result;
    })();

    pendingPersonalDiscovery.set(userId, fetchPromise);
    try {
        return await fetchPromise;
    } finally {
        pendingPersonalDiscovery.delete(userId);
    }
};

export const refreshPersonalDiscoveryForAllUsers = async () => {
    if (isPersonalUpdating) return;
    isPersonalUpdating = true;
    try {
        console.log("Running background personal discovery refresh for all users...");
        const users = await db.User.findAll();
        for (const user of users) {
            // Sequelize model instance, direct property access is fine or use .dataValues
            try {
                // User-level API keys not implemented - use global key (null falls back to LASTFM_API_KEY)
                await generatePersonalDiscovery(user.id, null);
            } catch (error) {
                console.warn(`Failed to generate personal discovery for user ${user.username}:`, error.message);
            }
        }
    } finally {
        isPersonalUpdating = false;
    }
};
