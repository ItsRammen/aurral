import React, { useState, useEffect } from "react";
import {
    Loader,
    Database,
    PieChart,
    TrendingUp,
    AlertCircle,
    Users,
    Disc,
    Layers,
    HardDrive
} from "lucide-react";
import { getLibraryStats } from "../../utils/api";

function LibraryStats() {
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
                setError("Failed to load library statistics.");
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
                <div className="relative w-20 h-20">
                    <div className="absolute inset-0 border-4 border-gray-200 dark:border-gray-800 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <p className="text-gray-500 font-bold mt-6 animate-pulse">Analyzing Library Data...</p>
            </div>
        );
    }

    if (error || !stats) {
        return (
            <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-3xl p-12 text-center">
                <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Error Loading Stats</h3>
                <p className="text-gray-500 dark:text-gray-400">{error}</p>
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

    const radius = 80;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (health / 100) * circumference;

    const statCards = [
        { label: "Total Artists", value: totalArtists, icon: Users, bg: "bg-blue-500", text: "text-blue-500" },
        { label: "Total Albums", value: totalAlbums, icon: Disc, bg: "bg-indigo-500", text: "text-indigo-500" },
        { label: "Total Tracks", value: totalTracks, icon: Layers, bg: "bg-purple-500", text: "text-purple-500" },
        { label: "Storage Size", value: formatSize(totalSize), icon: HardDrive, bg: "bg-emerald-500", text: "text-emerald-500" },
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Top Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((item, i) => (
                    <div key={i} className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4 group hover:shadow-lg transition-all hover:-translate-y-1">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${item.text} bg-opacity-10 bg-current group-hover:scale-110 transition-transform`}>
                            <item.icon className="w-7 h-7" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{item.label}</p>
                            <p className="text-3xl font-black text-gray-900 dark:text-white leading-tight mt-1">{item.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Collection Health Gauge */}
                <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-8 flex flex-col items-center shadow-sm">
                    <div className="w-full flex items-center gap-3 mb-8">
                        <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-xl text-primary-600 dark:text-primary-400">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Library Health</h3>
                    </div>

                    <div className="relative w-56 h-56 mb-8">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle
                                cx="112"
                                cy="112"
                                r={radius}
                                stroke="currentColor"
                                strokeWidth="20"
                                fill="transparent"
                                className="text-gray-100 dark:text-gray-800"
                            />
                            <circle
                                cx="112"
                                cy="112"
                                r={radius}
                                stroke="currentColor"
                                strokeWidth="20"
                                strokeDasharray={circumference}
                                strokeDashoffset={offset}
                                strokeLinecap="round"
                                fill="transparent"
                                className="text-primary-500 drop-shadow-[0_0_10px_rgba(var(--primary-500),0.3)] transition-all duration-1000 ease-out"
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-5xl font-black text-gray-900 dark:text-white tracking-tighter">{health}%</span>
                            <span className="text-xs font-bold text-green-500 bg-green-100 dark:bg-green-900/30 px-3 py-1 rounded-full mt-2">COMPLETION</span>
                        </div>
                    </div>

                    <div className="w-full space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                        <div className="flex justify-between items-center text-sm font-medium">
                            <span className="text-gray-500">Available Tracks</span>
                            <span className="font-bold text-gray-900 dark:text-white">{availableTracks}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm font-medium">
                            <span className="text-gray-500">Missing Tracks</span>
                            <span className="font-bold text-red-500">{totalTracks - availableTracks}</span>
                        </div>
                    </div>
                </div>

                {/* Top Genres Bar Chart */}
                <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-8 lg:col-span-2 shadow-sm">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl text-indigo-600 dark:text-indigo-400">
                            <PieChart className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Top Genres</h3>
                    </div>

                    <div className="space-y-6">
                        {genreCounts.length > 0 ? (
                            genreCounts.map((genre, i) => {
                                const percentage = (genre.count / genreCounts[0].count) * 100;
                                return (
                                    <div key={i} className="group">
                                        <div className="flex justify-between text-sm mb-2">
                                            <span className="font-bold text-gray-700 dark:text-gray-300 group-hover:text-primary-500 transition-colors">{genre.name}</span>
                                            <span className="font-mono text-gray-500">{genre.count}</span>
                                        </div>
                                        <div className="h-3 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-indigo-500 to-primary-500 rounded-full transition-all duration-1000 ease-out relative overflow-hidden"
                                                style={{ width: `${percentage}%`, transitionDelay: `${i * 100}ms` }}
                                            >
                                                <div className="absolute inset-0 bg-white/20 animate-shine" />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                                <PieChart className="w-12 h-12 mb-4 opacity-20" />
                                <p>No genre data available</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Storage Breakdown */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl text-emerald-600 dark:text-emerald-400">
                        <Database className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Largest Artists</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-2">
                    {topStorage.length > 0 ? (
                        topStorage.map((artist, i) => (
                            <div key={i} className="flex justify-between items-center py-3 px-4 border border-transparent hover:border-gray-100 dark:hover:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-2xl transition-all group cursor-default">
                                <div className="flex items-center gap-4 min-w-0">
                                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-500">{i + 1}</span>
                                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300 truncate group-hover:text-emerald-500 transition-colors">{artist.name}</span>
                                </div>
                                <span className="text-sm font-mono font-bold text-gray-900 dark:text-white">{formatSize(artist.size)}</span>
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

export default LibraryStats;
