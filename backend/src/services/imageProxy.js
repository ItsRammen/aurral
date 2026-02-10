import fs from "fs";
import path from "path";
import axios from "axios";
import { Jimp } from "jimp";
import { db } from "../config/db.js";
import { getArtistImage } from "./images.js";
import { getCachedLidarrArtists } from "./api.js";
import { discoveryCache } from "./discovery.js";

// Directory for cached images
const CACHE_DIR = path.join(process.cwd(), "data", "images");

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
}

/**
 * Get cached image file path for an artist
 * @param {string} mbid 
 * @returns {string}
 */
const getImagePath = (mbid) => path.join(CACHE_DIR, `${mbid}.jpg`);

/**
 * Download and cache an image, converting to JPEG
 * @param {string} url - Source image URL
 * @param {string} mbid - Artist MBID
 * @param {number} retries - Number of retries remaining
 * @returns {Promise<string|null>} - Local file path or null on failure
 */
const downloadAndCacheImage = async (url, mbid, retries = 2) => {
    try {
        const response = await axios.get(url, {
            responseType: "arraybuffer",
            timeout: 15000,
            headers: {
                "User-Agent": "Aurral/1.0 (https://github.com/aurral)"
            }
        });

        const imagePath = getImagePath(mbid);

        // Jimp v1.x API: use Jimp.read() which returns a Jimp instance
        const image = await Jimp.read(Buffer.from(response.data));

        // Resize to 500x500 cover and set quality
        image.cover({ w: 500, h: 500 });

        // Write as JPEG
        const buffer = await image.getBuffer("image/jpeg", { quality: 80 });
        fs.writeFileSync(imagePath, buffer);

        // Update DB with local path
        await db.ImageCache.upsert({
            mbid,
            url,
            localPath: imagePath,
            cachedAt: new Date()
        });

        return imagePath;
    } catch (error) {
        // Retry on network errors
        if (retries > 0 && (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED')) {
            console.log(`Retrying image download for ${mbid} (${retries} retries left)...`);
            await new Promise(r => setTimeout(r, 1000 * (3 - retries))); // Exponential backoff
            return downloadAndCacheImage(url, mbid, retries - 1);
        }
        console.error(`Failed to cache image for ${mbid}:`, error.message);
        return null;
    }
};

/**
 * Get or create cached image for an artist
 * @param {string} mbid 
 * @param {string|null} userApiKey 
 * @returns {Promise<{path: string|null, exists: boolean}>}
 */
export const getCachedImage = async (mbid, userApiKey = null) => {
    const imagePath = getImagePath(mbid);

    // Check if file exists on disk
    if (fs.existsSync(imagePath)) {
        return { path: imagePath, exists: true };
    }

    // Check DB for source URL
    const cached = await db.ImageCache.findByPk(mbid);

    if (cached?.url && cached.url !== "NOT_FOUND") {
        // Download and cache from known URL
        const localPath = await downloadAndCacheImage(cached.url, mbid);
        if (localPath) {
            return { path: localPath, exists: true };
        }
    }

    // Fetch fresh from Last.fm/CoverArtArchive
    const result = await getArtistImage(mbid, userApiKey);

    if (result.url) {
        const localPath = await downloadAndCacheImage(result.url, mbid);
        if (localPath) {
            return { path: localPath, exists: true };
        }
    }

    return { path: null, exists: false };
};

/**
 * Clean up old cached images (older than 30 days)
 */
export const cleanupOldImages = async () => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    try {
        const oldEntries = await db.ImageCache.findAll({
            where: {
                cachedAt: { $lt: thirtyDaysAgo }
            }
        });

        for (const entry of oldEntries) {
            if (entry.localPath && fs.existsSync(entry.localPath)) {
                fs.unlinkSync(entry.localPath);
            }
            await entry.update({ localPath: null, cachedAt: null });
        }

        console.log(`Cleaned up ${oldEntries.length} old cached images`);
    } catch (error) {
        console.error("Image cleanup failed:", error.message);
    }
};

/**
 * Prefetch images for discovery page artists and Lidarr library artists
 * @returns {Promise<{fetched: number, skipped: number, failed: number}>}
 */
export const prefetchArtistImages = async () => {
    const stats = { fetched: 0, skipped: 0, failed: 0 };
    const mbidsToFetch = new Set();

    console.log("[ImagePrefetch] Starting artist image prefetch job...");

    // 1. Collect MBIDs from discovery cache (recommendations + globalTop)
    try {
        if (discoveryCache?.recommendations?.length) {
            discoveryCache.recommendations.forEach(a => {
                if (a.id) mbidsToFetch.add(a.id);
            });
        }
        if (discoveryCache?.globalTop?.length) {
            discoveryCache.globalTop.forEach(a => {
                if (a.id) mbidsToFetch.add(a.id);
            });
        }
        console.log(`[ImagePrefetch] Found ${mbidsToFetch.size} artists from discovery cache`);
    } catch (e) {
        console.error("[ImagePrefetch] Error reading discovery cache:", e.message);
    }

    // 2. Collect MBIDs from Lidarr library
    try {
        const lidarrArtists = await getCachedLidarrArtists();
        if (lidarrArtists?.length) {
            lidarrArtists.forEach(a => {
                if (a.foreignArtistId) mbidsToFetch.add(a.foreignArtistId);
            });
        }
        console.log(`[ImagePrefetch] Total unique artists to check: ${mbidsToFetch.size}`);
    } catch (e) {
        console.error("[ImagePrefetch] Error reading Lidarr artists:", e.message);
    }

    // 3. Filter out already cached images
    const uncachedMbids = [];
    for (const mbid of mbidsToFetch) {
        const imagePath = getImagePath(mbid);
        if (!fs.existsSync(imagePath)) {
            uncachedMbids.push(mbid);
        } else {
            stats.skipped++;
        }
    }
    console.log(`[ImagePrefetch] ${uncachedMbids.length} artists need images, ${stats.skipped} already cached`);

    // 4. Fetch images with rate limiting (1 per second to be nice to external APIs)
    for (const mbid of uncachedMbids) {
        try {
            const result = await getCachedImage(mbid); // This will fetch and cache if needed
            if (result.exists) {
                stats.fetched++;
            } else {
                stats.failed++;
            }
        } catch (e) {
            console.error(`[ImagePrefetch] Error fetching ${mbid}:`, e.message);
            stats.failed++;
        }
        // Small delay between requests to avoid hammering external APIs
        await new Promise(r => setTimeout(r, 500));
    }

    console.log(`[ImagePrefetch] Complete: ${stats.fetched} fetched, ${stats.skipped} skipped, ${stats.failed} failed`);
    return stats;
};
