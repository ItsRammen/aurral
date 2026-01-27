import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import {
    User,
    Mail,
    Calendar,
    Lock,
    Key,
    Save,
    CheckCircle,
    AlertCircle,
    Clock,
    Heart,
    Music,
    ChevronRight
} from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import ArtistImage from '../components/ArtistImage';
import { Link } from 'react-router-dom';

function ProfilePage() {
    const { user, setUser } = useAuth();
    const { addToast } = useToast();
    const [activeTab, setActiveTab] = useState('overview');
    const [stats, setStats] = useState({
        totalRequests: 0,
        totalLikes: 0,
        recentRequests: []
    });
    const [isLoading, setIsLoading] = useState(true);

    // Settings form state
    const [email, setEmail] = useState('');
    const [lastfmApiKey, setLastfmApiKey] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        if (user) {
            setEmail(user.email || '');
            setLastfmApiKey(user.lastfmApiKey || '');
            fetchStats();
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

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        if (newPassword && newPassword !== confirmPassword) {
            addToast('Passwords do not match', 'error');
            return;
        }

        setIsUpdating(true);
        try {
            const response = await api.put('/auth/profile', {
                email,
                lastfmApiKey,
                ...(newPassword ? { password: newPassword } : {})
            });

            setUser(prev => ({
                ...prev,
                ...response.data
            }));

            addToast('Profile updated successfully', 'success');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error) {
            addToast(error.response?.data?.error || 'Failed to update profile', 'error');
        } finally {
            setIsUpdating(false);
        }
    };

    if (!user) return null;

    const initials = user.username
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    return (
        <div className="space-y-8">
            {/* Header / Banner area */}
            <div className="relative rounded-3xl overflow-hidden bg-gray-900 dark:bg-black min-h-[200px] shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-r from-primary-900/80 to-transparent z-10" />
                <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-gray-950 to-transparent z-10" />

                {/* Banner Image Placeholder/Pattern */}
                <div className="absolute inset-0 opacity-20 pointer-events-none">
                    <div className="w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary-500 via-gray-900 to-black" />
                </div>

                <div className="relative z-20 p-8 flex flex-col md:flex-row items-center gap-8 h-full pt-12 md:pt-16">
                    <div className="w-24 h-24 md:w-32 md:h-32 rounded-3xl bg-primary-500 flex items-center justify-center text-white text-3xl md:text-5xl font-bold shadow-2xl border-4 border-white/10 shrink-0">
                        {initials}
                    </div>

                    <div className="flex-1 text-center md:text-left space-y-2">
                        <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight">
                            {user.username}
                        </h1>
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-gray-300 text-sm md:text-base font-medium">
                            <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm">
                                <Mail className="w-4 h-4" /> {user.email || 'No email set'}
                            </span>
                            <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm">
                                <Calendar className="w-4 h-4" /> Joined {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'recently'}
                            </span>
                            <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm">
                                <Lock className="w-4 h-4" /> ID: {user.id.split('-')[0]}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800">
                <button
                    onClick={() => setActiveTab('overview')}
                    className={`px-6 py-3 text-sm font-semibold transition-all relative ${activeTab === 'overview'
                        ? 'text-primary-600 dark:text-primary-400'
                        : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-100'
                        }`}
                >
                    Overview
                    {activeTab === 'overview' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500 animate-in fade-in" />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('settings')}
                    className={`px-6 py-3 text-sm font-semibold transition-all relative ${activeTab === 'settings'
                        ? 'text-primary-600 dark:text-primary-400'
                        : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-100'
                        }`}
                >
                    Settings
                    {activeTab === 'settings' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500 animate-in fade-in" />
                    )}
                </button>
            </div>

            <div className="space-y-8 animate-in fade-in duration-500">
                {activeTab === 'overview' ? (
                    <>
                        {/* Stats Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4 group hover:shadow-md transition-shadow">
                                <div className="w-12 h-12 rounded-2xl bg-primary-100 dark:bg-primary-950/30 flex items-center justify-center text-primary-600 dark:text-primary-400 group-hover:scale-110 transition-transform">
                                    <Music className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Total Requests</p>
                                    <p className="text-2xl font-black text-gray-900 dark:text-white leading-none mt-1">{stats.totalRequests}</p>
                                </div>
                            </div>

                            <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4 group hover:shadow-md transition-shadow">
                                <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/30 flex items-center justify-center text-red-600 dark:text-red-400 group-hover:scale-110 transition-transform">
                                    <Heart className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Liked Artists</p>
                                    <p className="text-2xl font-black text-gray-900 dark:text-white leading-none mt-1">{stats.totalLikes}</p>
                                </div>
                            </div>

                            <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4 group hover:shadow-md transition-shadow">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                                    <User className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Account Type</p>
                                    <p className="text-2xl font-black text-gray-900 dark:text-white leading-none mt-1">
                                        {user.permissions.includes('admin') ? 'Administrator' : 'Aurral User'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Recent Requests Scroll */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-primary-500" />
                                    Recent Requests
                                </h2>
                                <Link to="/requests" className="text-sm font-bold text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1">
                                    View All <ChevronRight className="w-4 h-4" />
                                </Link>
                            </div>

                            {isLoading ? (
                                <div className="flex gap-4 overflow-x-auto pb-4 mask-fade-right">
                                    {[...Array(5)].map((_, i) => (
                                        <div key={i} className="min-w-[200px] h-32 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse" />
                                    ))}
                                </div>
                            ) : stats.recentRequests.length > 0 ? (
                                <div className="flex gap-4 overflow-x-auto pb-4 mask-fade-right snap-x">
                                    {stats.recentRequests.map((request) => (
                                        <Link
                                            key={request.id}
                                            to={`/artist/${request.mbid}`}
                                            className="min-w-[280px] bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 flex items-center gap-4 group hover:border-primary-500/50 hover:shadow-lg transition-all snap-start"
                                        >
                                            <div className="w-20 h-20 rounded-xl overflow-hidden shadow-md shrink-0">
                                                <ArtistImage mbid={request.mbid} name={request.artistName} />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-black text-gray-900 dark:text-white truncate text-base">{request.artistName}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {new Date(request.timestamp).toLocaleDateString()}
                                                </p>
                                                <div className={`mt-2 inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${request.status === 'monitored'
                                                    ? 'bg-green-100 dark:bg-green-950/30 text-green-600'
                                                    : 'bg-yellow-100 dark:bg-yellow-950/30 text-yellow-600'
                                                    }`}>
                                                    {request.status}
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-800 p-12 text-center text-gray-500 dark:text-gray-400">
                                    <Music className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                    <p className="text-sm font-medium italic">No requests yet. Start discovery!</p>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    /* Settings Tab */
                    <div className="max-w-2xl balance-column">
                        <form onSubmit={handleUpdateProfile} className="space-y-6">
                            <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-8 shadow-sm space-y-6">
                                <div>
                                    <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2 mb-6">
                                        <User className="w-5 h-5 text-primary-500" />
                                        Account Settings
                                    </h3>
                                    <div className="grid grid-cols-1 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest pl-1">Email Address</label>
                                            <div className="relative">
                                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                <input
                                                    type="email"
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm"
                                                    placeholder="your@email.com"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-gray-100 dark:border-gray-800">
                                    <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2 mb-6">
                                        <Lock className="w-5 h-5 text-primary-500" />
                                        Security
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest pl-1">New Password</label>
                                            <div className="relative">
                                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                <input
                                                    type="password"
                                                    value={newPassword}
                                                    onChange={(e) => setNewPassword(e.target.value)}
                                                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm"
                                                    placeholder="Leave empty to keep current"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest pl-1">Confirm Password</label>
                                            <div className="relative">
                                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                <input
                                                    type="password"
                                                    value={confirmPassword}
                                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm"
                                                    placeholder="Must match new password"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-gray-100 dark:border-gray-800">
                                    <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2 mb-6">
                                        <Key className="w-5 h-5 text-primary-500" />
                                        Integrations
                                    </h3>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest pl-1">Personal Last.fm API Key</label>
                                        <div className="relative">
                                            <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <input
                                                type="text"
                                                value={lastfmApiKey}
                                                onChange={(e) => setLastfmApiKey(e.target.value)}
                                                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm font-mono"
                                                placeholder="Your Last.fm API key (optional)"
                                            />
                                        </div>
                                        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2 italic px-1">
                                            Using a personal key ensures higher reliability for your discovery engine and personal request matching.
                                        </p>
                                    </div>
                                </div>

                                <div className="pt-6 flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={isUpdating}
                                        className="flex items-center gap-2 px-8 py-3 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-2xl font-black shadow-lg shadow-primary-500/20 transition-all active:scale-95"
                                    >
                                        {isUpdating ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                                Updating...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="w-4 h-4" />
                                                Save Changes
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}

// Sparkles icon definition for reference if needed
const Sparkles = ({ className }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
        <path d="M5 3v4" /><path d="M19 17v4" /><path d="M3 5h4" /><path d="M17 19h4" />
    </svg>
);

export default ProfilePage;
