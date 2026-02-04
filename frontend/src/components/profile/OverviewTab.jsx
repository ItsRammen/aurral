import React from 'react';
import ProfileStats from './ProfileStats';
import AchievementsList from './AchievementsList';
import RequestsHistory from './RequestsHistory';
import MusicTaste from './MusicTaste';

const OverviewTab = ({ stats, isLoading, user }) => {
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Stats Cards */}
            <ProfileStats stats={stats} isLoading={isLoading} user={user} />

            {/* Music Taste & Achievements Grid */}
            <div className="space-y-6">
                {/* Stack genres visually above achievements if both exist, or maybe side-by-side on large screens?? 
                     Let's keep them stacked for now to ensure width, or put Taste inside a grid if small.
                 */}
                <MusicTaste genres={stats.topGenres} />
                <AchievementsList achievements={stats.achievements} />
            </div>

            {/* Recent Requests */}
            <RequestsHistory requests={stats.recentRequests} isLoading={isLoading} />
        </div>
    );
};

export default OverviewTab;
