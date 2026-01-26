import { useState, useEffect } from "react";
import { X, Loader, Play, Music, ExternalLink, CheckCircle, Download, AlertCircle } from "lucide-react";
import { getLidarrTracks } from "../utils/api";

function AlbumTracksModal({ album, artistName, onClose, onRequest }) {
    const [tracks, setTracks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [requesting, setRequesting] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchTracks = async () => {
            if (!album?.lidarrId) {
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);
            try {
                const data = await getLidarrTracks(album.lidarrId, album.artistId);
                setTracks(data.sort((a, b) => (a.trackNumber || 0) - (b.trackNumber || 0)));
            } catch (err) {
                console.error("Failed to fetch tracks:", err);
                setError("Failed to load track information from Lidarr.");
            } finally {
                setLoading(false);
            }
        };

        fetchTracks();

        // Disable body scroll
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = "unset";
        };
    }, [album]);

    const handleRequest = async () => {
        if (!onRequest) return;
        setRequesting(true);
        try {
            await onRequest(album.lidarrId);
        } finally {
            setRequesting(false);
        }
    };

    const getYoutubeSearchUrl = (trackTitle) => {
        const query = encodeURIComponent(`${artistName} ${trackTitle}`);
        return `https://www.youtube.com/results?search_query=${query}`;
    };

    const formatFileSize = (bytes) => {
        if (!bytes) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB", "TB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                            <Music className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 truncate">
                                {album.title}
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                {artistName} • {album.year || "Unknown Year"}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <Loader className="w-12 h-12 text-primary-600 animate-spin mb-4" />
                            <p className="text-gray-600 dark:text-gray-400">Loading tracklist...</p>
                        </div>
                    ) : error ? (
                        <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-500/20 rounded-xl p-6 text-center">
                            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                            <p className="text-red-700 dark:text-red-300 mb-4">{error}</p>
                            <button
                                onClick={onClose}
                                className="btn btn-secondary"
                            >
                                Close Modal
                            </button>
                        </div>
                    ) : tracks.length > 0 ? (
                        <div className="space-y-1">
                            {tracks.map((track) => (
                                <div
                                    key={track.id}
                                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
                                >
                                    <div className="flex items-center gap-4 min-w-0 flex-1">
                                        <span className="text-sm font-mono text-gray-400 w-6">
                                            {track.trackNumber}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                                                {track.title}
                                            </h4>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                {track.hasFile ? (
                                                    <span className="flex items-center text-[10px] uppercase font-bold text-green-600 dark:text-green-500">
                                                        <CheckCircle className="w-3 h-3 mr-1" />
                                                        {track.quality?.quality?.name || "Available"}
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center text-[10px] uppercase font-bold text-gray-400">
                                                        <Download className="w-3 h-3 mr-1" />
                                                        Missing
                                                    </span>
                                                )}
                                                {track.hasFile && track.size > 0 && (
                                                    <span className="text-[10px] text-gray-500 dark:text-gray-500">
                                                        • {formatFileSize(track.size)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <a
                                            href={getYoutubeSearchUrl(track.title)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="btn btn-secondary btn-xs py-1 px-2 flex items-center gap-1.5 text-[10px] uppercase font-bold text-red-600 hover:text-red-700 dark:text-red-500 dark:hover:text-red-400 border-red-100 dark:border-red-900/30"
                                            title="Preview on YouTube"
                                        >
                                            <Play className="w-3 h-3 fill-current" />
                                            Preview
                                        </a>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20">
                            <Music className="w-16 h-16 text-gray-200 dark:text-gray-800 mx-auto mb-4" />
                            <p className="text-gray-500 italic">No track information available in Lidarr yet.</p>
                            <p className="text-sm text-gray-400 mt-2">Try syncing the artist with Lidarr first.</p>
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-800 flex justify-between items-center rounded-b-2xl">
                    <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">
                        {tracks.length} Tracks Found
                    </p>
                    <div className="flex gap-2">
                        {album.monitored ? (
                            <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs font-bold uppercase border border-green-200 dark:border-green-500/20">
                                <CheckCircle className="w-3.5 h-3.5 mr-2" />
                                Monitored
                            </span>
                        ) : (
                            onRequest && (
                                <button
                                    onClick={handleRequest}
                                    disabled={requesting}
                                    className="btn btn-secondary btn-sm inline-flex items-center"
                                >
                                    {requesting ? (
                                        <Loader className="w-3.5 h-3.5 mr-2 animate-spin" />
                                    ) : (
                                        <Download className="w-3.5 h-3.5 mr-2" />
                                    )}
                                    {requesting ? "Requesting..." : "Request Album"}
                                </button>
                            )
                        )}
                        <button
                            onClick={onClose}
                            className="btn btn-primary btn-sm"
                            disabled={requesting}
                        >
                            Done
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AlbumTracksModal;
