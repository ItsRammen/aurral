import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import ProfileHeader from '../components/profile/ProfileHeader';
import OverviewTab from '../components/profile/OverviewTab';
import SettingsTab from '../components/profile/SettingsTab';
import TabNav from '../components/TabNav';

function ProfilePage() {
    const { user, setUser } = useAuth();
    const [activeTab, setActiveTab] = useState('overview');
    const [stats, setStats] = useState({
        totalRequests: 0,
        totalLikes: 0,
        recentRequests: [],
        recentLikes: [],
        topGenres: [],
        achievements: [],
        monthlyStats: { requestsThisMonth: 0, requestsChange: 0, likesThisMonth: 0, likesChange: 0 },
        accountAge: 0
    });
    const [isLoading, setIsLoading] = useState(true);
    const [avatar, setAvatar] = useState(null);

    useEffect(() => {
        if (user) {
            fetchStats();
            fetchAvatar();
        }
    }, [user]);

    const fetchStats = async () => {
        try {
            const response = await api.get(`/users/${user.id}/stats`);
            setStats(response.data);
        } catch (error) {
            console.error("Failed to fetch user stats:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchAvatar = async () => {
        try {
            const response = await api.get(`/users/${user.id}/avatar`);
            if (response.data.avatar) {
                setAvatar(response.data.avatar);
            }
        } catch (error) {
            console.error("Failed to fetch avatar:", error);
        }
    };

    if (!user) return null;

    return (
        <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header Area */}
            <ProfileHeader user={user} avatar={avatar} />

            {/* Tabs Navigation */}
            <TabNav
                tabs={[
                    { id: 'overview', label: 'Overview' },
                    { id: 'settings', label: 'Account Settings' }
                ]}
                activeTab={activeTab}
                onChange={setActiveTab}
                centered
            />

            {/* Tab Content */}
            <div className="min-h-[500px]">
                {activeTab === 'overview' ? (
                    <OverviewTab stats={stats} isLoading={isLoading} user={user} />
                ) : (
                    <SettingsTab
                        avatar={avatar}
                        setAvatar={setAvatar}
                        user={user}
                        setUser={setUser}
                    />
                )}
            </div>
        </div>
    );
}

export default ProfilePage;
