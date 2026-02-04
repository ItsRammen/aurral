import axios from "axios";
import Bottleneck from "bottleneck";
import { db } from "../config/db.js";

const APP_NAME = "Aurral";
const APP_VERSION = "1.0.0";

// --- Settings Cache (Singleton) ---
let cachedSettings = null;

export const loadSettings = async (force = false) => {
    if (cachedSettings && !force) return cachedSettings;
    try {
        const config = await db.AppConfig.findByPk('main');
        cachedSettings = config ? config.toJSON() : {};
        return cachedSettings;
    } catch (err) {
        console.error("Failed to load settings from DB:", err);
        return cachedSettings || {};
    }
};

// Initialize settings immediately (will resolve loosely, better to call on server start)
loadSettings();

// Helpers (Synchronous read from cache, assumes loaded)
const getSettings = () => cachedSettings || {};

export const LIDARR_URL = () => (getSettings().lidarrUrl || process.env.LIDARR_URL || "http://localhost:8686").replace(/\/+$/, '');
export const LIDARR_API_KEY = () => getSettings().lidarrApiKey || process.env.LIDARR_API_KEY || "";
export const LASTFM_API_KEY = () => getSettings().lastfmApiKey || process.env.LASTFM_API_KEY;
const CONTACT = () => getSettings().contactEmail || process.env.CONTACT_EMAIL || "user@example.com";

const MUSICBRAINZ_API = "https://musicbrainz.org/ws/2";
const LASTFM_API = "https://ws.audioscrobbler.com/2.0/";

// --- Rate Limiters ---
const mbLimiter = new Bottleneck({
    maxConcurrent: 1,
    minTime: 1100,
});

const lastfmLimiter = new Bottleneck({
    maxConcurrent: 30, // Last.fm is generous
    minTime: 33,
});

// --- Services ---

export const musicbrainzRequest = mbLimiter.wrap(async (endpoint, params = {}) => {
    const queryParams = new URLSearchParams({
        fmt: "json",
        ...params,
    });

    const MAX_RETRIES = 3;
    let retries = 0;

    while (retries < MAX_RETRIES) {
        try {
            const response = await axios.get(
                `${MUSICBRAINZ_API}${endpoint}?${queryParams}`,
                {
                    headers: {
                        "User-Agent": `${APP_NAME}/${APP_VERSION} ( ${CONTACT()} )`,
                    },
                    timeout: 20000,
                },
            );
            return response.data;
        } catch (error) {
            retries++;

            const isRetryable =
                (error.code === 'ECONNRESET') ||
                (error.code === 'ETIMEDOUT') ||
                (error.response && error.response.status === 503);

            if (isRetryable && retries < MAX_RETRIES) {
                const delay = 1000 * retries;
                console.warn(`MusicBrainz request failed (${error.code || error.response?.status}), retrying in ${delay}ms... (Attempt ${retries}/${MAX_RETRIES})`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }

            if (error.response && error.response.status === 503) {
                console.warn("MusicBrainz 503 Service Unavailable (Rate Limit) - Max retries reached");
            } else {
                console.error(`MusicBrainz API error: ${error.message} (${endpoint})`);
            }
            throw error;
        }
    }
});

export const lastfmRequest = lastfmLimiter.wrap(async (method, params = {}, userApiKey = null) => {
    const apiKey = userApiKey || LASTFM_API_KEY();
    if (!apiKey) return null;

    try {
        const response = await axios.get(LASTFM_API, {
            params: {
                method,
                api_key: apiKey,
                format: "json",
                ...params,
            },
            timeout: 5000,
        });
        return response.data;
    } catch (error) {
        console.error(`Last.fm API error (${method}):`, error.message);
        return null;
    }
});

export const lidarrRequest = async (endpoint, method = "GET", data = null) => {
    const apiKey = LIDARR_API_KEY();
    const url = LIDARR_URL();

    if (!apiKey) {
        // Only throw if we actually need it. Warning handles loose setups.
        // throw new Error("Lidarr API key not configured");
        return null;
    }

    try {
        const config = {
            method,
            url: `${url}/api/v1${endpoint}`,
            headers: {
                "X-Api-Key": apiKey,
            },
            data,
            timeout: 10000
        };

        const response = await axios(config);

        // HTML check
        if (typeof response.data === 'string' && response.data.includes('<!doctype html>')) {
            throw new Error("Lidarr returned HTML. Check URL basepath.");
        }

        return response.data;
    } catch (error) {
        // console.error(`Lidarr request failed (${endpoint}):`, error.message);
        throw error;
    }
};

export const probeLidarrUrl = async () => {
    const apiKey = LIDARR_API_KEY();
    if (!apiKey) return false;

    // Just a simple check using current config
    try {
        await lidarrRequest('/system/status');
        return true;
    } catch (e) {
        return false;
    }
};

// --- Caching Logic (Moved from server.js) ---
let lidarrFetchPromise = null;
let cachedLidarrArtists = null;
let lastLidarrFetch = 0;
const LIDARR_CACHE_TTL = 5 * 60 * 1000;

export const invalidateLidarrCache = () => {
    cachedLidarrArtists = null;
    lastLidarrFetch = 0;
};

export const getCachedLidarrArtists = async (forceRefresh = false) => {
    const now = Date.now();
    if (
        forceRefresh ||
        !cachedLidarrArtists ||
        now - lastLidarrFetch > LIDARR_CACHE_TTL
    ) {
        if (lidarrFetchPromise) return lidarrFetchPromise;

        lidarrFetchPromise = (async () => {
            try {
                const data = (await lidarrRequest("/artist")) || [];
                cachedLidarrArtists = data;
                lastLidarrFetch = Date.now();
                return data;
            } catch (err) {
                console.warn("Failed to fetch Lidarr artists:", err.message);
                return [];
            } finally {
                lidarrFetchPromise = null;
            }
        })();
        return lidarrFetchPromise;
    }
    return cachedLidarrArtists;
};

// Export GENRE_KEYWORDS too as it was global
export const GENRE_KEYWORDS = [
    "rock", "pop", "electronic", "metal", "jazz", "hip-hop",
    "indie", "alternative", "punk", "soul", "r&b", "folk",
    "classical", "blues", "country", "reggae", "disco", "funk"
];
