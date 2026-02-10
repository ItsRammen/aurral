import React, { useState, useEffect } from "react";
import {
    Download,
    AlertTriangle,
    RefreshCw,
    CheckCircle,
    Clock,
    XCircle,
    ChevronDown,
    ChevronUp,
    RotateCw
} from "lucide-react";
import api from "../utils/api";

/**
 * DownloadProgressPanel - Shows active downloads with progress
 * Can be used in sidebar or as a standalone component
 */
function DownloadProgressPanel({ variant = "full", className = "" }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(true);
    const [retrying, setRetrying] = useState(null);

    const fetchProgress = async () => {
        try {
            const response = await api.get("/lidarr/queue/progress");
            setData(response.data);
        } catch (error) {
            console.error("Failed to fetch download progress:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProgress();
        // Poll every 5 seconds for real-time updates
        const interval = setInterval(fetchProgress, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleRetry = async (id) => {
        setRetrying(id);
        try {
            await api.post(`/lidarr/queue/${id}/retry`);
            setTimeout(fetchProgress, 1000);
        } catch (error) {
            console.error("Failed to retry download:", error);
        } finally {
            setRetrying(null);
        }
    };

    const formatSize = (bytes) => {
        if (!bytes) return "0 B";
        const sizes = ["B", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
    };

    const getStatusIcon = (item) => {
        if (item.stuck) {
            return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
        }
        if (item.trackedDownloadStatus === "ok" || item.status === "completed") {
            return <CheckCircle className="w-4 h-4 text-green-500" />;
        }
        return <Download className="w-4 h-4 text-blue-500 animate-pulse" />;
    };

    const getStatusText = (item) => {
        if (item.stuck) return "Stuck";
        if (item.trackedDownloadStatus === "ok") return "Importing";
        return `${item.progress}%`;
    };

    if (loading) {
        return (
            <div className={`p-4 ${className}`}>
                <div className="flex items-center gap-2 text-gray-500">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Loading...</span>
                </div>
            </div>
        );
    }

    if (!data || data.items.length === 0) {
        // Mini variant shows nothing when empty
        if (variant === "mini") return null;

        return (
            <div className={`p-4 text-center ${className}`}>
                <Download className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No active downloads</p>
            </div>
        );
    }

    // Mini variant - just show count badge
    if (variant === "mini") {
        return (
            <div className={`flex items-center gap-2 ${className}`}>
                <Download className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium">{data.summary.total}</span>
                {data.summary.stuck > 0 && (
                    <span className="flex items-center gap-1 text-xs text-yellow-600">
                        <AlertTriangle className="w-3 h-3" />
                        {data.summary.stuck}
                    </span>
                )}
            </div>
        );
    }

    return (
        <div className={`bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden ${className}`}>
            {/* Header */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <Download className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="text-left">
                        <h3 className="font-bold text-gray-900 dark:text-white">
                            Downloads
                        </h3>
                        <p className="text-xs text-gray-500">
                            {data.summary.total} active
                            {data.summary.stuck > 0 && (
                                <span className="text-yellow-600 ml-2">
                                    • {data.summary.stuck} stuck
                                </span>
                            )}
                            {data.summary.openIssues > 0 && (
                                <span className="text-red-600 ml-2">
                                    • {data.summary.openIssues} issues
                                </span>
                            )}
                        </p>
                    </div>
                </div>
                {expanded ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
            </button>

            {/* Content */}
            {expanded && (
                <div className="border-t border-gray-100 dark:border-gray-800">
                    <div className="max-h-64 overflow-y-auto">
                        {data.items.map((item) => (
                            <div
                                key={item.id}
                                className="p-3 border-b border-gray-50 dark:border-gray-800/50 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                            >
                                <div className="flex items-start gap-3">
                                    {getStatusIcon(item)}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                            {item.albumTitle}
                                        </p>
                                        <p className="text-xs text-gray-500 truncate">
                                            {item.artistName}
                                        </p>

                                        {/* Progress bar */}
                                        <div className="mt-2 flex items-center gap-2">
                                            <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-300 ${item.stuck
                                                        ? "bg-yellow-500"
                                                        : item.progress >= 100
                                                            ? "bg-green-500"
                                                            : "bg-blue-500"
                                                        }`}
                                                    style={{ width: `${Math.min(item.progress, 100)}%` }}
                                                />
                                            </div>
                                            <span className="text-xs font-medium text-gray-500 w-12 text-right">
                                                {getStatusText(item)}
                                            </span>
                                        </div>

                                        {/* Retry info */}
                                        {item.retryCount > 0 && (
                                            <p className="text-xs text-yellow-600 mt-1">
                                                Retry {item.retryCount}/3
                                            </p>
                                        )}
                                    </div>

                                    {/* Retry button for stuck items */}
                                    {item.stuck && (
                                        <button
                                            onClick={() => handleRetry(item.id)}
                                            disabled={retrying === item.id}
                                            className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                            title="Retry download"
                                        >
                                            <RotateCw className={`w-4 h-4 ${retrying === item.id ? "animate-spin" : ""}`} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default DownloadProgressPanel;
