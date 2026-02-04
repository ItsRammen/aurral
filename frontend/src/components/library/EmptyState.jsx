import React from 'react';
import { Search, Music } from 'lucide-react';

const EmptyState = ({ type = 'search', searchTerm, onAction, actionLabel }) => {
    return (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center animate-in fade-in zoom-in-95 duration-300">
            <div className="w-24 h-24 bg-gray-50 dark:bg-gray-800/50 rounded-full flex items-center justify-center mb-6">
                {type === 'search' ? (
                    <Search className="w-10 h-10 text-gray-300 dark:text-gray-600" />
                ) : (
                    <Music className="w-10 h-10 text-gray-300 dark:text-gray-600" />
                )}
            </div>

            <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">
                {type === 'search' ? 'No Artists Found' : 'Library is Empty'}
            </h3>

            <p className="text-gray-500 dark:text-gray-400 max-w-xs mb-8">
                {type === 'search'
                    ? `We couldn't find any artists matching "${searchTerm}". Try a different search term.`
                    : "Your collection is looking a bit empty. Start scanning your music or add new artists!"}
            </p>

            {onAction && (
                <button
                    onClick={onAction}
                    className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold shadow-lg shadow-primary-500/20 transition-all active:scale-95"
                >
                    {actionLabel || (type === 'search' ? 'Clear Search' : 'Add Artist')}
                </button>
            )}
        </div>
    );
};

export default EmptyState;
