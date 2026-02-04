import React from 'react';
import { Music, RefreshCw, BarChart2 } from 'lucide-react';

const LibraryHeader = ({ totalArtists, loading, onRefresh, activeTab, onTabChange }) => {
    return (
        <div className="relative rounded-[2.5rem] overflow-hidden bg-gray-900 dark:bg-black min-h-[220px] shadow-2xl group mb-8">
            {/* Premium Background Art */}
            <div className="absolute inset-0">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-gray-950 to-purple-950 z-0"></div>
                {/* Abstract Blobs */}
                <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse-slow"></div>
                <div className="absolute bottom-[-20%] left-[-10%] w-[400px] h-[400px] bg-purple-600/20 rounded-full blur-[100px] animate-pulse-slow delay-700"></div>

                {/* Mesh Pattern overlay */}
                <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
            </div>

            <div className="relative z-20 h-full flex flex-col justify-between p-8 md:p-10">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-white/10 backdrop-blur-md rounded-xl border border-white/10">
                                <Music className="w-6 h-6 text-indigo-300" />
                            </div>
                            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight drop-shadow-lg">
                                Your Library
                            </h1>
                        </div>
                        <p className="text-indigo-200/80 font-medium max-w-lg">
                            Manage your collection, view statistics, and explore your music universe.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-1">
                            <button
                                onClick={() => onTabChange('browse')}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'browse'
                                    ? 'bg-white text-indigo-950 shadow-lg scale-105'
                                    : 'text-gray-300 hover:text-white hover:bg-white/5'}`}
                            >
                                <Music className="w-4 h-4" />
                                Browse
                            </button>
                            <button
                                onClick={() => onTabChange('stats')}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'stats'
                                    ? 'bg-white text-indigo-950 shadow-lg scale-105'
                                    : 'text-gray-300 hover:text-white hover:bg-white/5'}`}
                            >
                                <BarChart2 className="w-4 h-4" />
                                Stats
                            </button>
                        </div>

                        <button
                            onClick={onRefresh}
                            disabled={loading}
                            className="p-3 bg-white/10 hover:bg-white/20 border border-white/10 backdrop-blur-md text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed group/refresh"
                            title="Refresh Library"
                        >
                            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : 'group-hover/refresh:rotate-180 transition-transform duration-500'}`} />
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-6 mt-8 md:mt-0">
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black text-white tracking-tight">
                            {loading ? '...' : totalArtists}
                        </span>
                        <span className="text-sm font-bold text-indigo-200 uppercase tracking-widest">Artists</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LibraryHeader;
