import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("auth_token");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Suppress console error for 401s (auth errors) to keep console clean
    if (error.response?.status !== 401) {
      const message = error.response?.data?.message || error.message || "An error occurred";
      console.error("API Error:", message);
    }
    return Promise.reject(error);
  },
);

export const checkHealth = async () => {
  const response = await api.get("/health");
  return response.data;
};

export const getSystemStats = async () => {
  const response = await api.get("/settings/system/stats");
  return response.data;
};

export const getAuthConfig = async () => {
  const response = await api.get("/auth/config");
  return response.data;
};

export const searchArtists = async (query, limit = 20, offset = 0) => {
  const response = await api.get("/search/artists", {
    params: { query, limit, offset },
  });
  return response.data;
};

export const searchRecordings = async (query, limit = 10) => {
  const response = await api.get("/search/recordings", {
    params: { query, limit },
  });
  return response.data;
};

export const searchAlbums = async (query, limit = 10) => {
  const response = await api.get("/search/albums", {
    params: { query, limit },
  });
  return response.data;
};

export const searchSuggestions = async (query, limit = 5) => {
  const response = await api.get("/search/suggest", {
    params: { q: query, limit },
  });
  return response.data;
};

export const getArtistDetails = async (mbid) => {
  const response = await api.get(`/artists/${mbid}`);
  return response.data;
};



export const getSimilarArtistsForArtist = async (mbid, limit = 20) => {
  const response = await api.get(`/artists/${mbid}/similar`, {
    params: { limit },
  });
  return response.data;
};

export const getLidarrArtists = async () => {
  const response = await api.get("/lidarr/artists");
  return response.data;
};

export const getLibraryStats = async () => {
  const response = await api.get("/lidarr/library/stats");
  return response.data;
};

export const getLidarrArtist = async (id) => {
  const response = await api.get(`/lidarr/artists/${id}`);
  return response.data;
};

export const lookupArtistInLidarr = async (mbid) => {
  const response = await api.get(`/lidarr/lookup/${mbid}`);
  return response.data;
};

export const lookupArtistsInLidarrBatch = async (mbids) => {
  const response = await api.post("/lidarr/lookup/batch", { mbids });
  return response.data;
};

export const addArtistToLidarr = async (artistData) => {
  const response = await api.post("/lidarr/artists", artistData);
  return response.data;
};

export const deleteArtistFromLidarr = async (id, deleteFiles = false) => {
  const response = await api.delete(`/lidarr/artists/${id}`, {
    params: { deleteFiles },
  });
  return response.data;
};

export const getLidarrRootFolders = async () => {
  const response = await api.get("/lidarr/rootfolder");
  return response.data;
};

export const getLidarrQualityProfiles = async () => {
  const response = await api.get("/lidarr/qualityprofile");
  return response.data;
};

export const getLidarrMetadataProfiles = async () => {
  const response = await api.get("/lidarr/metadataprofile");
  return response.data;
};

export const getLidarrTracks = async (albumId, artistId) => {
  const response = await api.get("/lidarr/tracks", {
    params: { albumId, artistId },
  });
  return response.data;
};

export const getLidarrAlbums = async (artistId) => {
  const response = await api.get("/lidarr/albums", {
    params: { artistId },
  });
  return response.data;
};

export const updateLidarrAlbum = async (id, data) => {
  const response = await api.put(`/lidarr/albums/${id}`, data);
  return response.data;
};

export const searchLidarrAlbum = async (albumIds) => {
  const response = await api.post("/lidarr/command/albumsearch", { albumIds });
  return response.data;
};

export const monitorLidarrAlbums = async (albumIds, monitored) => {
  const response = await api.post("/lidarr/albums/monitor", { albumIds, monitored });
  return response.data;
};

export const runLidarrCommand = async (commandName, params = {}) => {
  const response = await api.post("/lidarr/command", { name: commandName, ...params });
  return response.data;
};

export const updateLidarrArtist = async (id, data) => {
  const response = await api.put(`/lidarr/artists/${id}`, data);
  return response.data;
};

export const getRequests = async () => {
  const response = await api.get("/requests");
  return response.data;
};

export const deleteRequest = async (mbid) => {
  const response = await api.delete(`/requests/${mbid}`);
  return response.data;
};

export const approveRequest = async (id) => {
  const response = await api.post(`/requests/${id}/approve`);
  return response.data;
};

export const denyRequest = async (id) => {
  const response = await api.post(`/requests/${id}/deny`);
  return response.data;
};

export const toggleLikeArtist = async (mbid, name, image) => {
  const response = await api.post(`/artists/${mbid}/like`, { name, image });
  return response.data;
};

export const getLikedArtists = async () => {
  const response = await api.get("/artists/likes");
  return response.data;
};

export const getRecentlyAdded = async () => {
  const response = await api.get("/lidarr/recent");
  return response.data;
};

export const getDiscovery = async () => {
  const response = await api.get("/discover");
  return response.data;
};

export const getPersonalDiscovery = async (limit = 20) => {
  const response = await api.get("/discover/personal", {
    params: { limit },
  });
  return response.data;
};

// Deduplication helper: prevents duplicate concurrent requests for the same key
const activeRequests = new Map();
const dedup = (key, fn) => {
  if (activeRequests.has(key)) {
    return activeRequests.get(key);
  }
  const promise = (async () => {
    try {
      return await fn();
    } finally {
      activeRequests.delete(key);
    }
  })();
  activeRequests.set(key, promise);
  return promise;
};

export const getDashboard = () =>
  dedup("dashboard", async () => {
    const response = await api.get("/dashboard");
    return response.data;
  });

export const getRelatedArtists = async (limit = 20) => {
  const response = await api.get("/discover/related", {
    params: { limit },
  });
  return response.data;
};

export const getSimilarArtists = async (limit = 20) => {
  const response = await api.get("/discover/similar", {
    params: { limit },
  });
  return response.data;
};

export const searchArtistsByTag = async (tag, limit = 20) => {
  const response = await api.get("/discover/by-tag", {
    params: { tag, limit },
  });
  return response.data;
};


export const getAppSettings = async () => {
  const response = await api.get("/settings");
  return response.data;
};

export const saveNavidromeConfig = async (config) => {
  const response = await api.post("/navidrome/config", config);
  return response.data;
};

export const getNavidromeStatus = async () => {
  const response = await api.get("/navidrome/status");
  return response.data;
};

export const deleteNavidromeConfig = async () => {
  const response = await api.delete("/navidrome/config");
  return response.data;
};

export const getNavidromePlaybackUrl = async (artist, track) => {
  const response = await api.get("/navidrome/search-play", {
    params: { artist, track },
  });
  return response.data;
};

export const getNavidromeAlbum = async (artist, album) => {
  const response = await api.get("/navidrome/album-play", {
    params: { artist, album },
  });
  return response.data;
};

export const getNavidromeTrackInfo = async (trackId) => {
  const response = await api.get(`/navidrome/track/${trackId}`);
  return response.data;
};

export const verifyNavidromeUser = async (username, password) => {
  const response = await api.post("/navidrome/verify-user", { username, password });
  return response.data;
};

export const unlinkNavidromeUser = async () => {
  const response = await api.delete("/navidrome/user-link");
  return response.data;
};

export const getNavidromeUserHistory = async () => {
  const response = await api.get("/navidrome/user-history");
  return response.data;
};

export const updateAppSettings = async (settings) => {
  const response = await api.post("/settings", settings);
  return response.data;
};

export const runNavidromeJob = async () => {
  const response = await api.post("/jobs/refresh-navidrome");
  return response.data;
};

export const testOidcConnection = async (issuerUrl) => {
  const response = await api.post("/settings/test-oidc", { issuerUrl });
  return response.data;
};

export const getJobStatus = async () => {
  const response = await api.get("/jobs/status");
  return response.data;
};

export const getNavidromeRecommendations = async () => {
  const response = await api.get("/recommendations/navidrome");
  return response.data;
};

export const testLidarrConnection = async (config) => {
  const response = await api.post("/settings/test-lidarr", config);
  return response.data;
};

export const testLastfmConnection = async (apiKey) => {
  const response = await api.post("/settings/test-lastfm", { lastfmApiKey: apiKey });
  return response.data;
};

export const triggerDiscoveryRefresh = async () => {
  const response = await api.post("/jobs/refresh-discovery");
  return response.data;
};

// --- Jellyfin API ---
export const saveJellyfinConfig = async (config) => {
  const response = await api.post("/jellyfin/config", config);
  return response.data;
};

export const getJellyfinStatus = async () => {
  const response = await api.get("/jellyfin/status");
  return response.data;
};

export const deleteJellyfinConfig = async () => {
  const response = await api.delete("/jellyfin/config");
  return response.data;
};

export const getJellyfinPlaybackUrl = async (artist, track) => {
  const response = await api.get("/jellyfin/search-play", {
    params: { artist, track },
  });
  return response.data;
};

export const getJellyfinAlbum = async (artist, album) => {
  const response = await api.get("/jellyfin/album-play", {
    params: { artist, album },
  });
  return response.data;
};

export const getJellyfinTrackInfo = async (itemId) => {
  const response = await api.get(`/jellyfin/track/${itemId}`);
  return response.data;
};

export const verifyJellyfinUser = async (username, password) => {
  const response = await api.post("/jellyfin/verify-user", { username, password });
  return response.data;
};

export const unlinkJellyfinUser = async () => {
  const response = await api.delete("/jellyfin/user-link");
  return response.data;
};

export const runJellyfinJob = async () => {
  const response = await api.post("/jobs/refresh-jellyfin");
  return response.data;
};

// --- Plex API ---
export const savePlexConfig = async (config) => {
  const response = await api.post("/plex/config", config);
  return response.data;
};

export const getPlexStatus = async () => {
  const response = await api.get("/plex/status");
  return response.data;
};

export const deletePlexConfig = async () => {
  const response = await api.delete("/plex/config");
  return response.data;
};

export const getPlexPlaybackUrl = async (artist, track) => {
  const response = await api.get("/plex/search-play", {
    params: { artist, track },
  });
  return response.data;
};

export const getPlexAlbum = async (artist, album) => {
  const response = await api.get("/plex/album-play", {
    params: { artist, album },
  });
  return response.data;
};

export const getPlexTrackInfo = async (ratingKey) => {
  const response = await api.get(`/plex/track/${ratingKey}`);
  return response.data;
};

export const runPlexJob = async () => {
  const response = await api.post("/jobs/refresh-plex");
  return response.data;
};

export { api };
export default api;

