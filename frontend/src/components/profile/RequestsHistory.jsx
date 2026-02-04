import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, ChevronRight, Loader, Music } from 'lucide-react';
import ArtistImage from '../ArtistImage';

const RequestsHistory = ({ requests, isLoading }) => {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
                <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                    <div className="p-2 bg-primary-100 dark:bg-primary-950/40 rounded-xl">
                        <Clock className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                    </div>
                    Recent Requests
                </h2>
                <Link to="/requests" className="text-sm font-bold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors flex items-center gap-1 bg-primary-50 dark:bg-primary-900/20 px-3 py-1.5 rounded-lg">
                    View All <ChevronRight className="w-4 h-4" />
                </Link>
            </div>

            {isLoading ? (
                <div className="flex gap-4 overflow-x-auto pb-4 mask-fade-right scrollbar-hide">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="min-w-[280px] h-24 bg-gray-100 dark:bg-gray-800/50 rounded-2xl animate-pulse flex items-center justify-center border border-gray-200 dark:border-gray-800">
                            <Loader className="w-6 h-6 text-gray-400 animate-spin opacity-50" />
                        </div>
                    ))}
                </div>
            ) : requests.length > 0 ? (
                <div className="flex gap-4 overflow-x-auto pb-4 mask-fade-right snap-x scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-800 scrollbar-track-transparent p-1">
                    {requests.map((request) => (
                        <Link
                            key={request.id}
                            to={`/artist/${request.mbid}`}
                            className="min-w-[280px] bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 flex items-center gap-4 group hover:border-primary-500/50 hover:shadow-lg hover:-translate-y-0.5 transition-all snap-start"
                        >
                            <div className="w-16 h-16 rounded-xl overflow-hidden shadow-md shrink-0 border border-gray-100 dark:border-gray-700">
                                <ArtistImage mbid={request.mbid} name={request.artistName} className="w-full h-full object-cover" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="font-black text-gray-900 dark:text-white truncate text-base group-hover:text-primary-500 transition-colors">{request.artistName || 'Unknown Artist'}</p>
                                <div className="flex items-center justify-between mt-1">
                                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 font-medium">
                                        <Clock className="w-3 h-3" />
                                        {request.timestamp && !isNaN(new Date(request.timestamp).getTime())
                                            ? new Date(request.timestamp).toLocaleDateString()
                                            : 'Recently'}
                                    </p>
                                    <div className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${request.status === 'monitored'
                                        ? 'bg-green-100 dark:bg-green-950/40 text-green-600 dark:text-green-400'
                                        : 'bg-yellow-100 dark:bg-yellow-950/40 text-yellow-600 dark:text-yellow-400'
                                        }`}>
                                        {request.status}
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            ) : (
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-800 p-12 text-center text-gray-500 dark:text-gray-400">
                    <Music className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p className="text-sm font-bold">No requests yet.</p>
                    <Link to="/discover" className="text-xs text-primary-500 font-bold hover:underline mt-2 inline-block">Start adding music &rarr;</Link>
                </div>
            )}
        </div>
    );
};

export default RequestsHistory;
