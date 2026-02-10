/**
 * Artist Status Utilities
 * Centralized status computation and configuration for artist display across all pages
 */

// Status configuration with labels, colors, and icons
export const STATUS_CONFIG = {
    pending_approval: {
        key: "pending_approval",
        label: "Awaiting Approval",
        color: "orange",
        bgClass: "bg-orange-100 dark:bg-orange-900/30",
        textClass: "text-orange-700 dark:text-orange-400",
        badgeClass: "bg-orange-500/90",
        icon: "Clock",
    },
    denied: {
        key: "denied",
        label: "Denied",
        color: "red",
        bgClass: "bg-red-100 dark:bg-red-900/30",
        textClass: "text-red-700 dark:text-red-400",
        badgeClass: "bg-red-500/90",
        icon: "XCircle",
    },
    artist_added: {
        key: "artist_added",
        label: "Artist Added",
        color: "gray",
        bgClass: "bg-gray-100 dark:bg-gray-800",
        textClass: "text-gray-700 dark:text-gray-400",
        badgeClass: "bg-gray-500/90",
        icon: "UserCheck",
    },
    monitoring: {
        key: "monitoring",
        label: "Monitoring",
        color: "blue",
        bgClass: "bg-blue-100 dark:bg-blue-900/30",
        textClass: "text-blue-700 dark:text-blue-400",
        badgeClass: "bg-blue-500/90",
        icon: "Radio",
    },
    partial: {
        key: "partial",
        label: "Partial",
        color: "yellow",
        bgClass: "bg-yellow-100 dark:bg-yellow-900/30",
        textClass: "text-yellow-700 dark:text-yellow-400",
        badgeClass: "bg-yellow-500/90",
        icon: "AlertTriangle",
    },
    complete: {
        key: "complete",
        label: "Complete",
        color: "green",
        bgClass: "bg-green-100 dark:bg-green-900/30",
        textClass: "text-green-700 dark:text-green-400",
        badgeClass: "bg-green-500/90",
        icon: "CheckCircle",
    },
    requested: {
        key: "requested",
        label: "Requested",
        color: "yellow",
        bgClass: "bg-yellow-100 dark:bg-yellow-900/30",
        textClass: "text-yellow-700 dark:text-yellow-400",
        badgeClass: "bg-yellow-500/90",
        icon: "Clock",
    },
    in_library: {
        key: "in_library",
        label: "In Library",
        color: "green",
        bgClass: "bg-green-100 dark:bg-green-900/30",
        textClass: "text-green-700 dark:text-green-400",
        badgeClass: "bg-green-500/90",
        icon: "CheckCircle",
    },
    downloading: {
        key: "downloading",
        label: "Downloading",
        color: "indigo",
        bgClass: "bg-indigo-100 dark:bg-indigo-900/30",
        textClass: "text-indigo-700 dark:text-indigo-400",
        badgeClass: "bg-indigo-500/90",
        icon: "Download",
    },
    issue: {
        key: "issue",
        label: "Issue Reported",
        color: "red",
        bgClass: "bg-red-100 dark:bg-red-900/30",
        textClass: "text-red-700 dark:text-red-400",
        badgeClass: "bg-red-500/90",
        icon: "AlertTriangle",
    },
};

/**
 * Compute the status of an artist based on Lidarr data and request state
 * @param {Object} artist - Lidarr artist object with statistics
 * @param {Object} request - Optional request object with status
 * @returns {string} Status key from STATUS_CONFIG
 */
export function computeArtistStatus(artist, request) {
    // Artist is in Lidarr - check album/track status
    const stats = artist.statistics || {};
    const { albumCount = 0, trackFileCount = 0, trackCount = 0 } = stats;

    // Check complete first (Before downloading, so mostly-complete collections don't stuck on Downloading if stale)
    if (trackCount > 0 && trackFileCount >= trackCount) {
        return "complete";
    }

    // Request states take precedence
    if (request?.status === "pending_approval") return "pending_approval";
    if (request?.status === "denied") return "denied";
    if (request?.status === "issue") return "issue";
    if (request?.status === "downloading") return "downloading";

    // Not in Lidarr yet
    if (!artist?.id && !artist?.foreignArtistId) {
        return request ? "requested" : null;
    }

    // Check for issues/downloading from request properties
    if (request?.hasIssue) return "issue";
    if (request?.isDownloading) return "downloading";

    // Check if artist is monitored and has monitored albums
    const monitoredAlbumCount = artist.monitoredAlbumCount ?? albumCount;

    // No albums monitored
    if (monitoredAlbumCount === 0) {
        return "artist_added";
    }

    // Has monitored albums - check download status
    if (trackCount === 0) {
        return "monitoring";
    }

    if (trackFileCount === 0) {
        return "monitoring";
    }

    // Partial download
    return "partial";
}

/**
 * Get display label with optional statistics
 * @param {string} status - Status key
 * @param {Object} stats - Optional statistics object
 * @returns {string} Display label
 */
export function getStatusLabel(status, stats) {
    const config = STATUS_CONFIG[status];
    if (!config) return status;

    // Add album count for certain statuses
    if (stats && (status === "monitoring" || status === "artist_added")) {
        // Removed specific album count as it reflects total metadata, not monitored count
        if (status === "monitoring") {
            const { trackCount = 0 } = stats;
            return trackCount > 0 ? `Monitoring ${trackCount} Tracks` : "Monitoring Artist";
        }
        if (status === "artist_added") {
            return "Artist Added";
        }
    }

    if (stats && status === "partial") {
        const { trackFileCount = 0, trackCount = 0 } = stats;
        if (trackCount > 0) {
            return `${trackFileCount}/${trackCount} Tracks`;
        }
    }

    if (stats && status === "complete") {
        // Removed misleading "X Albums Complete" as we don't know monitored album count
        return "Collection Complete";
    }

    return config.label;
}

/**
 * Get progress info for an artist
 * @param {Object} stats - Statistics object from Lidarr
 * @returns {Object} Progress info with counts and percentage
 */
export function getProgressInfo(stats) {
    if (!stats) return null;

    const { albumCount = 0, trackFileCount = 0, trackCount = 0 } = stats;
    const percent = trackCount > 0 ? Math.round((trackFileCount / trackCount) * 100) : 0;

    return {
        albumCount,
        trackFileCount,
        trackCount,
        percent,
        hasProgress: trackCount > 0,
    };
}
