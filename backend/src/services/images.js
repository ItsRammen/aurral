import { db } from "../config/db.js";
import { lastfmRequest, musicbrainzRequest, LASTFM_API_KEY } from "./api.js";
import axios from "axios";

const negativeImageCache = new Set();
const pendingImageRequests = new Map();

/**
 * Fetches and caches artist images from Last.fm (preferred) or MusicBrainz/CoverArtArchive.
 * @param {string} mbid 
 * @param {string|null} userApiKey 
 * @returns {Promise<{url: string|null, images: Array}>}
 */
export const getArtistImage = async (mbid, userApiKey = null) => {
    if (!mbid) return { url: null, images: [] };

    // Check Memory Cache first (Negative)
    if (negativeImageCache.has(mbid)) {
        return { url: null, images: [] };
    }

    // Check DB Cache
    try {
        const cached = await db.ImageCache.findByPk(mbid);
        if (cached) {
            if (cached.url === "NOT_FOUND") {
                negativeImageCache.add(mbid);
                return { url: null, images: [] };
            }
            return {
                url: cached.url,
                images: cached.data || [{ image: cached.url, front: true }]
            };
        }
    } catch (err) {
        console.error("DB Image Cache Error:", err);
    }

    // De-duplicate concurrent requests
    if (pendingImageRequests.has(mbid)) {
        return pendingImageRequests.get(mbid);
    }

    const fetchPromise = (async () => {
        // Try Last.fm first
        if (LASTFM_API_KEY()) {
            try {
                const lastfmData = await lastfmRequest("artist.getInfo", { mbid }, userApiKey);
                if (lastfmData?.artist?.image) {
                    const images = lastfmData.artist.image
                        .filter(
                            (img) =>
                                img["#text"] &&
                                !img["#text"].includes("2a96cbd8b46e442fc41c2b86b821562f"),
                        )
                        .map((img) => ({
                            image: img["#text"],
                            front: true,
                            types: ["Front"],
                            size: img.size,
                        }));

                    if (images.length > 0) {
                        const sizeOrder = {
                            mega: 4,
                            extralarge: 3,
                            large: 2,
                            medium: 1,
                            small: 0,
                        };
                        images.sort(
                            (a, b) => (sizeOrder[b.size] || 0) - (sizeOrder[a.size] || 0),
                        );

                        // Save to DB
                        await db.ImageCache.upsert({
                            mbid,
                            url: images[0].image,
                            data: images
                        });

                        return { url: images[0].image, images };
                    }
                }
            } catch (e) { }
        }

        // Fallback to MusicBrainz + Cover Art Archive
        try {
            const releaseGroupsData = await musicbrainzRequest(`/artist/${mbid}`, {
                inc: "release-groups",
            });
            if (releaseGroupsData?.["release-groups"]?.length > 0) {
                const sorted = releaseGroupsData["release-groups"].sort((a, b) => {
                    const aScore = a["primary-type"] === "Album" ? 1 : 0;
                    const bScore = b["primary-type"] === "Album" ? 1 : 0;
                    if (aScore !== bScore) return bScore - aScore;
                    return (b["first-release-date"] || "").localeCompare(
                        a["first-release-date"] || "",
                    );
                });

                for (const release of sorted.slice(0, 12)) {
                    try {
                        const coverRes = await axios.get(
                            `https://coverartarchive.org/release-group/${release.id}`,
                            { timeout: 5000 },
                        );
                        if (coverRes.data?.images?.length > 0) {
                            const front =
                                coverRes.data.images.find((i) => i.front) ||
                                coverRes.data.images[0];
                            const url =
                                front.thumbnails?.large ||
                                front.thumbnails?.small ||
                                front.image;

                            // Save to DB
                            await db.ImageCache.upsert({
                                mbid,
                                url,
                                data: coverRes.data.images
                            });

                            return { url, images: coverRes.data.images };
                        }
                    } catch (e) {
                        continue;
                    }
                }
            }
        } catch (e) { }

        // Cache Negative Result
        negativeImageCache.add(mbid);
        await db.ImageCache.upsert({
            mbid,
            url: "NOT_FOUND",
            data: []
        });

        return { url: null, images: [] };
    })();

    pendingImageRequests.set(mbid, fetchPromise);
    try {
        return await fetchPromise;
    } finally {
        pendingImageRequests.delete(mbid);
    }
};
