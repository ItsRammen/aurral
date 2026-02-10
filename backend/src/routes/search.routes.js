import express from "express";
import {
    musicbrainzRequest,
    lastfmRequest,
    LASTFM_API_KEY,
    getCachedLidarrArtists
} from "../services/api.js";

const router = express.Router();

// GET /api/search/artists
router.get("/artists", async (req, res) => {
    try {
        const { query, limit = 20, offset = 0 } = req.query;

        if (!query) {
            return res.status(400).json({ error: "Query parameter is required" });
        }

        if (LASTFM_API_KEY()) {
            try {
                const limitInt = parseInt(limit) || 20;
                const offsetInt = parseInt(offset) || 0;
                const page = Math.floor(offsetInt / limitInt) + 1;

                const lastfmData = await lastfmRequest("artist.search", {
                    artist: query,
                    limit: limitInt,
                    page,
                }, req.user?.lastfmApiKey);

                if (lastfmData?.results?.artistmatches?.artist) {
                    const artists = Array.isArray(lastfmData.results.artistmatches.artist)
                        ? lastfmData.results.artistmatches.artist
                        : [lastfmData.results.artistmatches.artist];

                    const formattedArtists = artists
                        .filter((a) => a.mbid)
                        .map((a) => {
                            let img = null;
                            if (a.image && Array.isArray(a.image)) {
                                const i =
                                    a.image.find((img) => img.size === "extralarge") ||
                                    a.image.find((img) => img.size === "large") ||
                                    a.image.find((img) => img.size === "medium");
                                if (
                                    i &&
                                    i["#text"] &&
                                    !i["#text"].includes("2a96cbd8b46e442fc41c2b86b821562f")
                                ) {
                                    img = i["#text"];
                                }
                            }

                            return {
                                id: a.mbid,
                                name: a.name,
                                "sort-name": a.name,
                                image: img,
                                listeners: a.listeners,
                            };
                        });

                    if (formattedArtists.length > 0) {
                        return res.json({
                            artists: formattedArtists,
                            count: parseInt(
                                lastfmData.results["opensearch:totalResults"] || 0,
                            ),
                            offset: offsetInt,
                        });
                    }
                }
            } catch (error) {
                console.warn(
                    "Last.fm search failed, falling back to MusicBrainz:",
                    error.message,
                );
            }
        }

        const data = await musicbrainzRequest("/artist", {
            query: query,
            limit,
            offset,
        });

        res.json(data);
    } catch (error) {
        res.status(500).json({
            error: "Failed to search artists",
            message: error.message,
        });
    }
});

// GET /api/search/recordings
router.get("/recordings", async (req, res) => {
    try {
        const { query, limit = 10 } = req.query;

        if (!query) {
            return res.status(400).json({ error: "Query parameter is required" });
        }

        if (LASTFM_API_KEY()) {
            try {
                const lastfmData = await lastfmRequest("track.search", {
                    track: query,
                    limit: parseInt(limit) || 10,
                }, req.user?.lastfmApiKey);

                if (lastfmData?.results?.trackmatches?.track) {
                    const tracks = Array.isArray(lastfmData.results.trackmatches.track)
                        ? lastfmData.results.trackmatches.track
                        : [lastfmData.results.trackmatches.track];

                    const formattedTracks = tracks.map((t) => ({
                        name: t.name,
                        artist: t.artist,
                        mbid: t.mbid,
                        artistMbid: null,
                        url: t.url,
                    }));

                    // Try to resolve MBID for the first track if missing
                    if (formattedTracks.length > 0) {
                        try {
                            const info = await lastfmRequest("track.getInfo", {
                                track: formattedTracks[0].name,
                                artist: formattedTracks[0].artist,
                            }, req.user?.lastfmApiKey);

                            if (info?.track?.artist?.mbid) {
                                formattedTracks[0].artistMbid = info.track.artist.mbid;
                            }
                        } catch (e) {
                            // Ignore
                        }
                    }

                    return res.json({ recordings: formattedTracks });
                }
            } catch (error) {
                console.warn("Last.fm track search failed:", error.message);
            }
        }

        // Fallback to MusicBrainz
        const data = await musicbrainzRequest("/recording", {
            query: `recording:${query}`,
            limit: parseInt(limit) || 10,
        });

        const formattedMB = (data.recordings || []).map((r) => ({
            name: r.title,
            artist: r["artist-credit"]?.[0]?.name || "Unknown Artist",
            mbid: r.id,
            artistMbid: r["artist-credit"]?.[0]?.artist?.id,
        }));

        res.json({ recordings: formattedMB });
    } catch (error) {
        res.status(500).json({
            error: "Failed to search recordings",
            message: error.message,
        });
    }
});

// GET /api/search/albums
router.get("/albums", async (req, res) => {
    try {
        const { query, limit = 10 } = req.query;

        if (!query) {
            return res.status(400).json({ error: "Query parameter is required" });
        }

        if (LASTFM_API_KEY()) {
            try {
                const lastfmData = await lastfmRequest("album.search", {
                    album: query,
                    limit: parseInt(limit) || 10,
                });

                if (lastfmData?.results?.albummatches?.album) {
                    const albums = Array.isArray(lastfmData.results.albummatches.album)
                        ? lastfmData.results.albummatches.album
                        : [lastfmData.results.albummatches.album];

                    const formattedAlbums = albums.map((a) => {
                        let img = null;
                        if (a.image && Array.isArray(a.image)) {
                            const i =
                                a.image.find((img) => img.size === "extralarge") ||
                                a.image.find((img) => img.size === "large") ||
                                a.image.find((img) => img.size === "medium");
                            if (
                                i &&
                                i["#text"] &&
                                !i["#text"].includes("2a96cbd8b46e442fc41c2b86b821562f")
                            ) {
                                img = i["#text"];
                            }
                        }

                        return {
                            name: a.name,
                            artist: a.artist,
                            mbid: a.mbid || null,
                            image: img,
                            url: a.url,
                        };
                    });

                    return res.json({ albums: formattedAlbums });
                }
            } catch (error) {
                console.warn("Last.fm album search failed:", error.message);
            }
        }

        // Fallback to MusicBrainz
        const data = await musicbrainzRequest("/release-group", {
            query: `releasegroup:${query}`,
            limit: parseInt(limit) || 10,
        });

        const formattedMB = (data["release-groups"] || []).map((rg) => ({
            name: rg.title,
            artist: rg["artist-credit"]?.[0]?.name || "Unknown Artist",
            mbid: rg.id,
            type: rg["primary-type"],
            year: rg["first-release-date"]?.split("-")[0],
        }));

        res.json({ albums: formattedMB });
    } catch (error) {
        res.status(500).json({
            error: "Failed to search albums",
            message: error.message,
        });
    }
});

// GET /api/search/suggest - Unified typeahead endpoint
router.get("/suggest", async (req, res) => {
    try {
        const { q, limit = 5 } = req.query;

        if (!q || q.length < 2) {
            return res.json({ artists: [], albums: [], recordings: [] });
        }

        const limitInt = parseInt(limit) || 5;

        // Parallel requests for speed
        const [artistsRes, albumsRes, recordingsRes] = await Promise.allSettled([
            // Artists - fetch more, then sort by relevance
            (async () => {
                const queryLower = q.toLowerCase();
                let artists = [];

                if (LASTFM_API_KEY()) {
                    // Fetch more results to improve chances of finding prefix matches
                    const data = await lastfmRequest("artist.search", { artist: q, limit: 20 });
                    if (data?.results?.artistmatches?.artist) {
                        const rawArtists = Array.isArray(data.results.artistmatches.artist)
                            ? data.results.artistmatches.artist
                            : [data.results.artistmatches.artist];
                        artists = rawArtists.filter(a => a.mbid).map(a => ({
                            id: a.mbid,
                            name: a.name,
                            listeners: parseInt(a.listeners) || 0,
                            type: "artist"
                        }));
                    }
                }

                if (artists.length === 0) {
                    const data = await musicbrainzRequest("/artist", { query: q, limit: 20 });
                    artists = (data.artists || []).map(a => ({
                        id: a.id,
                        name: a.name,
                        listeners: 0,
                        type: "artist"
                    }));
                }

                // Sort by relevance: prefix matches first, then by popularity
                artists.sort((a, b) => {
                    const aName = a.name.toLowerCase();
                    const bName = b.name.toLowerCase();
                    const aStartsWith = aName.startsWith(queryLower);
                    const bStartsWith = bName.startsWith(queryLower);

                    // Prefix matches first
                    if (aStartsWith && !bStartsWith) return -1;
                    if (!aStartsWith && bStartsWith) return 1;

                    // Then by name starting with query word (not just containing)
                    const aWordMatch = aName.split(/\s+/).some(word => word.startsWith(queryLower));
                    const bWordMatch = bName.split(/\s+/).some(word => word.startsWith(queryLower));
                    if (aWordMatch && !bWordMatch) return -1;
                    if (!aWordMatch && bWordMatch) return 1;

                    // Then by popularity
                    return b.listeners - a.listeners;
                });

                return artists.slice(0, limitInt).map(({ id, name, type }) => ({ id, name, type }));
            })(),
            // Albums
            (async () => {
                if (LASTFM_API_KEY()) {
                    const data = await lastfmRequest("album.search", { album: q, limit: limitInt });
                    if (data?.results?.albummatches?.album) {
                        const albums = Array.isArray(data.results.albummatches.album)
                            ? data.results.albummatches.album
                            : [data.results.albummatches.album];
                        return albums.slice(0, limitInt).map(a => ({
                            name: a.name,
                            artist: a.artist,
                            type: "album"
                        }));
                    }
                }
                const data = await musicbrainzRequest("/release-group", { query: q, limit: limitInt });
                return (data["release-groups"] || []).slice(0, limitInt).map(rg => ({
                    name: rg.title,
                    artist: rg["artist-credit"]?.[0]?.name || "Unknown",
                    type: "album"
                }));
            })(),
            // Recordings
            (async () => {
                if (LASTFM_API_KEY()) {
                    const data = await lastfmRequest("track.search", { track: q, limit: limitInt });
                    if (data?.results?.trackmatches?.track) {
                        const tracks = Array.isArray(data.results.trackmatches.track)
                            ? data.results.trackmatches.track
                            : [data.results.trackmatches.track];
                        return tracks.slice(0, limitInt).map(t => ({
                            name: t.name,
                            artist: t.artist,
                            type: "recording"
                        }));
                    }
                }
                const data = await musicbrainzRequest("/recording", { query: `recording:${q}`, limit: limitInt });
                return (data.recordings || []).slice(0, limitInt).map(r => ({
                    name: r.title,
                    artist: r["artist-credit"]?.[0]?.name || "Unknown",
                    type: "recording"
                }));
            })()
        ]);

        // Check which artists are in library
        let libraryArtistIds = new Set();
        try {
            const lidarrArtists = await getCachedLidarrArtists();
            // Filter out null/undefined MBIDs
            libraryArtistIds = new Set(
                lidarrArtists
                    .map(a => a.foreignArtistId)
                    .filter(id => id && id.length > 0)
            );
        } catch (e) {
            // Lidarr not configured or error - continue without library status
        }

        const artistsWithLibrary = (artistsRes.status === "fulfilled" ? artistsRes.value : []).map(a => ({
            ...a,
            // Only mark as in library if artist has a valid ID that matches
            inLibrary: a.id && a.id.length > 0 && libraryArtistIds.has(a.id)
        }));

        res.json({
            artists: artistsWithLibrary,
            albums: albumsRes.status === "fulfilled" ? albumsRes.value : [],
            recordings: recordingsRes.status === "fulfilled" ? recordingsRes.value : []
        });
    } catch (error) {
        console.error("Suggest error:", error.message);
        res.json({ artists: [], albums: [], recordings: [] });
    }
});

export default router;
