import React from "react";
import {
    Clock,
    XCircle,
    UserCheck,
    Radio,
    AlertTriangle,
    CheckCircle,
    Loader,
} from "lucide-react";
import { STATUS_CONFIG, computeArtistStatus, getStatusLabel, getProgressInfo } from "../utils/artistStatus";

const ICON_MAP = {
    Clock,
    XCircle,
    UserCheck,
    Radio,
    AlertTriangle,
    CheckCircle,
    Loader,
};

/**
 * ArtistStatusBadge - Unified status display component
 * 
 * @param {Object} props
 * @param {Object} props.artist - Lidarr artist object with statistics
 * @param {Object} props.request - Optional request object with status
 * @param {string} props.variant - Display variant: "badge" | "pill" | "overlay"
 * @param {boolean} props.showStats - Show album/track counts
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.loading - Show loading spinner
 */
function ArtistStatusBadge({
    artist,
    request,
    variant = "badge",
    showStats = false,
    className = "",
    loading = false,
}) {
    const status = computeArtistStatus(artist, request);

    if (!status && !loading) return null;

    const config = STATUS_CONFIG[status] || STATUS_CONFIG.requested;
    const Icon = ICON_MAP[config.icon] || Clock;
    const stats = artist?.statistics;
    const label = getStatusLabel(status, stats);
    const progress = showStats ? getProgressInfo(stats) : null;

    if (loading) {
        return (
            <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase bg-gray-100 dark:bg-gray-800 text-gray-500 ${className}`}>
                <Loader className="w-3.5 h-3.5 animate-spin" />
                Loading...
            </span>
        );
    }

    // Overlay variant - for card overlays
    if (variant === "overlay") {
        return (
            <div className={`absolute bottom-2 left-2 right-2 ${className}`}>
                <div
                    className={`py-1 px-2 rounded text-[10px] font-bold uppercase text-center backdrop-blur-md shadow-lg text-white ${config.badgeClass}`}
                >
                    <span className="flex flex-col leading-tight">
                        <span>{label}</span>
                        {progress?.hasProgress && showStats && (
                            <span className="text-[8px] opacity-90 normal-case font-medium">
                                {progress.trackFileCount} / {progress.trackCount} Tracks
                            </span>
                        )}
                    </span>
                </div>
            </div>
        );
    }

    // Pill variant - compact
    if (variant === "pill") {
        return (
            <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${config.bgClass} ${config.textClass} ${className}`}
            >
                <Icon className="w-3 h-3" />
                {label}
            </span>
        );
    }

    // Default badge variant
    return (
        <span
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase ${config.bgClass} ${config.textClass} ${className}`}
        >
            <Icon className="w-3.5 h-3.5" />
            {label}
        </span>
    );
}

export default ArtistStatusBadge;
