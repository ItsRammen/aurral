import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import {
    getNavidromeStatus, getNavidromePlaybackUrl, getNavidromeAlbum,
    getJellyfinStatus, getJellyfinPlaybackUrl, getJellyfinAlbum,
    getPlexStatus, getPlexPlaybackUrl, getPlexAlbum,
    getAppSettings
} from "../utils/api";

const StreamingContext = createContext(null);

const SERVICE_CONFIG = {
    navidrome: { statusFn: getNavidromeStatus, searchFn: getNavidromePlaybackUrl, albumFn: getNavidromeAlbum, label: "Navidrome" },
    jellyfin: { statusFn: getJellyfinStatus, searchFn: getJellyfinPlaybackUrl, albumFn: getJellyfinAlbum, label: "Jellyfin" },
    plex: { statusFn: getPlexStatus, searchFn: getPlexPlaybackUrl, albumFn: getPlexAlbum, label: "Plex" },
};

export function StreamingProvider({ children }) {
    const [serviceStatuses, setServiceStatuses] = useState({
        navidrome: false,
        jellyfin: false,
        plex: false,
    });
    const [defaultService, setDefaultService] = useState("navidrome");
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        const init = async () => {
            try {
                const [naviStatus, jellyStatus, plexStatus, settings] = await Promise.all([
                    getNavidromeStatus().catch(() => ({ connected: false })),
                    getJellyfinStatus().catch(() => ({ connected: false })),
                    getPlexStatus().catch(() => ({ connected: false })),
                    getAppSettings().catch(() => ({})),
                ]);

                setServiceStatuses({
                    navidrome: naviStatus.connected,
                    jellyfin: jellyStatus.connected,
                    plex: plexStatus.connected,
                });

                if (settings.defaultStreamingService) {
                    setDefaultService(settings.defaultStreamingService);
                }
            } catch (err) {
                console.error("StreamingContext init failed:", err);
            } finally {
                setLoaded(true);
            }
        };
        init();
    }, []);

    // Resolve the active service: use default if connected, otherwise fallback to first connected
    const activeService = useMemo(() => {
        if (serviceStatuses[defaultService]) return defaultService;
        // Fallback to first connected
        const connected = Object.entries(serviceStatuses).find(([, v]) => v);
        return connected ? connected[0] : null;
    }, [serviceStatuses, defaultService]);

    const isStreamingAvailable = activeService !== null;

    const searchAndPlay = useCallback(async (artist, track) => {
        if (!activeService) throw new Error("No streaming service connected");
        const { searchFn } = SERVICE_CONFIG[activeService];
        return await searchFn(artist, track);
    }, [activeService]);

    const searchAlbum = useCallback(async (artist, album) => {
        if (!activeService) throw new Error("No streaming service connected");
        const { albumFn } = SERVICE_CONFIG[activeService];
        return await albumFn(artist, album);
    }, [activeService]);

    const getCoverUrl = useCallback((id) => {
        const svc = activeService || "navidrome";
        return `/api/${svc}/cover/${id}`;
    }, [activeService]);

    const getStreamUrl = useCallback((id) => {
        const svc = activeService || "navidrome";
        return `/api/${svc}/stream/${id}`;
    }, [activeService]);

    const refreshStreamingStatus = useCallback(async () => {
        try {
            const [naviStatus, jellyStatus, plexStatus] = await Promise.all([
                getNavidromeStatus().catch(() => ({ connected: false })),
                getJellyfinStatus().catch(() => ({ connected: false })),
                getPlexStatus().catch(() => ({ connected: false })),
            ]);

            setServiceStatuses({
                navidrome: naviStatus.connected,
                jellyfin: jellyStatus.connected,
                plex: plexStatus.connected,
            });
        } catch (err) {
            console.error("StreamingContext refresh failed:", err);
        }
    }, []);

    const value = useMemo(() => ({
        activeService,
        isStreamingAvailable,
        serviceStatuses,
        searchAndPlay,
        searchAlbum,
        getCoverUrl,
        getStreamUrl,
        loaded,
        setDefaultService,
        setServiceStatuses,
        refreshStreamingStatus,
    }), [activeService, isStreamingAvailable, serviceStatuses, searchAndPlay, searchAlbum, getCoverUrl, getStreamUrl, loaded, refreshStreamingStatus]);

    return (
        <StreamingContext.Provider value={value}>
            {children}
        </StreamingContext.Provider>
    );
}

export function useStreaming() {
    const context = useContext(StreamingContext);
    if (!context) {
        throw new Error("useStreaming must be used within a StreamingProvider");
    }
    return context;
}
