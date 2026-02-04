import React from 'react';
import { Search, ChevronDown, Filter } from 'lucide-react';

const LibraryControls = ({ searchTerm, onSearchChange, sortBy, onSortChange }) => {
    return (
        <div className="sticky top-4 z-30 mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="p-2 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl flex flex-col sm:flex-row gap-3">
                {/* Search Input */}
                <div className="relative flex-1 group/search">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within/search:text-primary-500 transition-colors" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder="Search your library..."
                        className="w-full bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white border-0 rounded-xl py-3 pl-12 pr-4 outline-none focus:ring-2 focus:ring-primary-500/20 transition-all font-medium placeholder:text-gray-400"
                    />
                </div>

                {/* Sort Dropdown */}
                <div className="relative sm:w-56">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                        <Filter className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    </div>
                    <select
                        value={sortBy}
                        onChange={(e) => onSortChange(e.target.value)}
                        className="w-full h-full bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white border-0 rounded-xl py-3 pl-10 pr-10 outline-none focus:ring-2 focus:ring-primary-500/20 transition-all font-bold cursor-pointer appearance-none"
                    >
                        <option value="name">Name (A-Z)</option>
                        <option value="added">Date Added (Newest)</option>
                        <option value="albums">Album Count</option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LibraryControls;
