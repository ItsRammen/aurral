import React from 'react';
import { Music, Heart, Calendar, TrendingUp, TrendingDown } from 'lucide-react';

const ProfileStats = ({ stats, isLoading, user }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Total Requests */}
            <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4 group hover:shadow-lg transition-all hover:border-primary-500/20">
                <div className="w-14 h-14 rounded-2xl bg-primary-100 dark:bg-primary-950/40 flex items-center justify-center text-primary-600 dark:text-primary-400 group-hover:scale-110 transition-transform shadow-inner">
                    <Music className="w-7 h-7" />
                </div>
                <div className="flex-1">
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Total Requests</p>
                    <div className="flex items-center gap-2">
                        {isLoading ? (
                            <div className="h-8 w-16 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse mt-1" />
                        ) : (
                            <p className="text-3xl font-black text-gray-900 dark:text-white leading-none mt-1">{stats.totalRequests}</p>
                        )}
                        {stats.monthlyStats && stats.monthlyStats.requestsChange !== 0 && (
                            <span className={`flex items-center text-xs font-bold px-2 py-0.5 rounded-full ${stats.monthlyStats.requestsChange > 0 ? 'bg-green-100 dark:bg-green-900/30 text-green-600' : 'bg-red-100 dark:bg-red-900/30 text-red-600'}`}>
                                {stats.monthlyStats.requestsChange > 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                                {Math.abs(stats.monthlyStats.requestsChange)}
                            </span>
                        )}
                    </div>
                    <p className="text-[10px] text-gray-400 mt-2 font-medium">
                        {stats.monthlyStats?.requestsThisMonth || 0} this month
                    </p>
                </div>
            </div>

            {/* Total Likes */}
            <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4 group hover:shadow-lg transition-all hover:border-red-500/20">
                <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-950/40 flex items-center justify-center text-red-600 dark:text-red-400 group-hover:scale-110 transition-transform shadow-inner">
                    <Heart className="w-7 h-7" />
                </div>
                <div className="flex-1">
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Liked Artists</p>
                    <div className="flex items-center gap-2">
                        {isLoading ? (
                            <div className="h-8 w-16 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse mt-1" />
                        ) : (
                            <p className="text-3xl font-black text-gray-900 dark:text-white leading-none mt-1">{stats.totalLikes}</p>
                        )}
                        {stats.monthlyStats && stats.monthlyStats.likesChange !== 0 && (
                            <span className={`flex items-center text-xs font-bold px-2 py-0.5 rounded-full ${stats.monthlyStats.likesChange > 0 ? 'bg-green-100 dark:bg-green-900/30 text-green-600' : 'bg-red-100 dark:bg-red-900/30 text-red-600'}`}>
                                {stats.monthlyStats.likesChange > 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                                {Math.abs(stats.monthlyStats.likesChange)}
                            </span>
                        )}
                    </div>
                    <p className="text-[10px] text-gray-400 mt-2 font-medium">
                        {stats.monthlyStats?.likesThisMonth || 0} this month
                    </p>
                </div>
            </div>

            {/* Account Age */}
            <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4 group hover:shadow-lg transition-all hover:border-indigo-500/20">
                <div className="w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform shadow-inner">
                    <Calendar className="w-7 h-7" />
                </div>
                <div className="flex-1">
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Account Age</p>
                    {isLoading ? (
                        <div className="h-8 w-24 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse mt-1" />
                    ) : (
                        <p className="text-3xl font-black text-gray-900 dark:text-white leading-none mt-1">
                            {stats.accountAge || 0} <span className="text-sm font-bold text-gray-400">days</span>
                        </p>
                    )}
                    <p className="text-[10px] text-gray-400 mt-2 font-medium">
                        Role: {user.permissions.includes('admin') ? 'Administrator' : 'Member'}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ProfileStats;
