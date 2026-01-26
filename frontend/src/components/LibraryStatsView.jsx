import { useState, useEffect } from "react";
import {
    Loader,
    Music,
    Database,
    PieChart,
    TrendingUp,
    AlertCircle,
    Users,
    Disc,
    Layers,
    HardDrive
} from "lucide-react";
import { getLibraryStats } from "../utils/api";

function LibraryStatsView() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchStats = async () => {
            setLoading(true);
            try {
                const data = await getLibraryStats();
                setStats(data);
            } catch (err) {
                console.error("Failed to fetch library stats:", err);
                setError("Failed to load library statistics. Make sure Lidarr is connected.");
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    const formatSize = (bytes) => {
        if (!bytes) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB", "TB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-32">
                <Loader className="w-12 h-12 text-primary-500 animate-spin mb-4" />
                <p className="text-gray-500">Calculating library insights...</p>
            </div>
        );
    }

    if (error || !stats) {
        return (
            <div className="card text-center py-16">
                <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Error Loading Stats</h3>
                <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">{error}</p>
            </div>
        );
    }

    const {
        totalArtists,
        totalAlbums,
        totalTracks,
        availableTracks,
        totalSize,
        health,
        genreCounts,
        topStorage
    } = stats;

    // SVG Health Gauge Constants
    const radius = 80;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (health / 100) * circumference;

    const colorMap = {
        blue: "bg-blue-500/10 text-blue-500",
        indigo: "bg-indigo-500/10 text-indigo-500",
        purple: "bg-purple-500/10 text-purple-500",
        emerald: "bg-emerald-500/10 text-emerald-500",
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Top Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: "Total Artists", value: totalArtists, icon: Users, color: "blue" },
                    { label: "Total Albums", value: totalAlbums, icon: Disc, color: "indigo" },
                    { label: "Total Tracks", value: totalTracks, icon: Layers, color: "purple" },
                    { label: "Storage Size", value: formatSize(totalSize), icon: HardDrive, color: "emerald" },
                ].map((item, i) => (
                    <div key={i} className="card p-6 flex items-center gap-4 hover:shadow-md transition-shadow">
                        <div className={`p-3 rounded-xl ${colorMap[item.color]}`}>
                            <item.icon className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{item.label}</p>
                            <p className="text-2xl font-black text-gray-900 dark:text-white leading-tight">{item.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Collection Health (Gauge) */}
                <div className="card p-8 lg:col-span-1 flex flex-col items-center">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-2 self-start w-full">
                        <TrendingUp className="w-5 h-5 text-primary-500" />
                        Library Health
                    </h3>

                    <div className="relative w-48 h-48 mb-6">
                        <svg className="w-full h-full transform -rotate-90">
                            {/* Background Circle */}
                            <circle
                                cx="96"
                                cy="96"
                                r={radius}
                                stroke="currentColor"
                                strokeWidth="16"
                                fill="transparent"
                                className="text-gray-100 dark:text-gray-800"
                            />
                            {/* Progress Circle */}
                            <circle
                                cx="96"
                                cy="96"
                                r={radius}
                                stroke="currentColor"
                                strokeWidth="16"
                                strokeDasharray={circumference}
                                strokeDashoffset={offset}
                                strokeLinecap="round"
                                fill="transparent"
                                className="text-primary-500 transition-all duration-1000 ease-out"
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-4xl font-black text-gray-900 dark:text-white">{health}%</span>
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-none mt-1">Available</span>
                        </div>
                    </div>

                    <div className="w-full space-y-4">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Available Tracks</span>
                            <span className="font-bold text-gray-900 dark:text-gray-200">{availableTracks}</span>
                        </div>
                        <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div className="h-full bg-primary-500 rounded-full" style={{ width: `${health}%` }}></div>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Wanted Tracks</span>
                            <span className="font-bold text-gray-900 dark:text-gray-200">{totalTracks - availableTracks}</span>
                        </div>
                    </div>
                </div>

                {/* Top Genres (Bar Chart) */}
                <div className="card p-8 lg:col-span-2">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-8 flex items-center gap-2">
                        <PieChart className="w-5 h-5 text-indigo-500" />
                        Top Genres in Library
                    </h3>

                    <div className="space-y-6">
                        {genreCounts.length > 0 ? (
                            genreCounts.map((genre, i) => {
                                const percentage = (genre.count / genreCounts[0].count) * 100;
                                return (
                                    <div key={i} className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="font-semibold text-gray-700 dark:text-gray-300">{genre.name}</span>
                                            <span className="text-gray-500">{genre.count} Artists</span>
                                        </div>
                                        <div className="h-2 w-full bg-gray-50 dark:bg-gray-800/50 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-indigo-500 to-primary-500 rounded-full transition-all duration-1000 ease-out"
                                                style={{ width: `${percentage}%`, transitionDelay: `${i * 100}ms` }}
                                            ></div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <p className="text-gray-400 italic text-center py-10">No genre data available.</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Storage Breakdown */}
            <div className="card p-8">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-2">
                    <Database className="w-5 h-5 text-emerald-500" />
                    Top Storage Consumers
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                    {topStorage.length > 0 ? (
                        topStorage.map((artist, i) => (
                            <div key={i} className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-black/10 transition-colors px-2 rounded-lg group">
                                <div className="flex items-center gap-3 min-w-0">
                                    <span className="text-xs font-mono text-gray-400 w-4">{i + 1}</span>
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate group-hover:text-primary-500">{artist.name}</span>
                                </div>
                                <span className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">{formatSize(artist.size)}</span>
                            </div>
                        ))
                    ) : (
                        <p className="text-gray-400 italic col-span-2 text-center py-10">No storage data available.</p>
                    )}
                </div>
            </div>
        </div>
    );
}

export default LibraryStatsView;
