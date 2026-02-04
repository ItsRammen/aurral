import React from 'react';
import { Tag } from 'lucide-react';

const MusicTaste = ({ genres }) => {
    if (!genres || genres.length === 0) return null;

    return (
        <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
            <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-3 mb-6">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-950/40 rounded-xl">
                    <Tag className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                Your Music Taste
            </h2>
            <div className="flex flex-wrap gap-2">
                {genres.map((genre, i) => (
                    <span
                        key={i}
                        className="px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-bold border border-gray-100 dark:border-gray-700 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-600 dark:hover:text-primary-400 hover:border-primary-200 dark:hover:border-primary-800 transition-colors cursor-default"
                    >
                        {genre.name}
                    </span>
                ))}
            </div>
            <p className="text-xs text-gray-400 mt-4 font-medium flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-gray-400"></span>
                Based on your likes and requests history
            </p>
        </div>
    );
};

export default MusicTaste;
