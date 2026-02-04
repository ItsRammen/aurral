import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api, { verifyNavidromeUser, unlinkNavidromeUser, getNavidromeStatus } from '../../utils/api';
import { useToast } from '../../contexts/ToastContext';
import {
    User,
    Mail,
    Lock,
    Key,
    Save,
    CheckCircle,
    AlertCircle,
    Camera,
    Shield,
    Music,
    Link2,
    Unlink
} from 'lucide-react';

const SettingsTab = ({ avatar, setAvatar, user, setUser }) => {
    const { addToast } = useToast();
    const fileInputRef = useRef(null);

    // Settings form state
    const [email, setEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);

    // Navidrome account linking state
    const [navidromeLinked, setNavidromeLinked] = useState(false);
    const [linkedNavidromeUser, setLinkedNavidromeUser] = useState('');
    const [navidromeUsername, setNavidromeUsername] = useState('');
    const [navidromePassword, setNavidromePassword] = useState('');
    const [isLinkingNavidrome, setIsLinkingNavidrome] = useState(false);
    const [navidromeConfigured, setNavidromeConfigured] = useState(false);

    useEffect(() => {
        if (user) {
            setEmail(user.email || '');
            setLinkedNavidromeUser(user.navidromeUsername || '');
            setNavidromeLinked(!!user.navidromeUsername);
            checkNavidromeConfig();
        }
    }, [user]);

    const checkNavidromeConfig = async () => {
        try {
            const status = await getNavidromeStatus();
            setNavidromeConfigured(status.connected);
        } catch (error) {
            setNavidromeConfigured(false);
        }
    };

    const handleAvatarChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            addToast('Please select an image file', 'error');
            return;
        }

        if (file.size > 500000) {
            addToast('Image must be less than 500KB', 'error');
            return;
        }

        setUploadingAvatar(true);
        const reader = new FileReader();
        reader.onload = async (event) => {
            const base64 = event.target.result;
            try {
                await api.post(`/users/${user.id}/avatar`, { avatar: base64 });
                setAvatar(base64);
                setUser(prev => ({ ...prev, avatar: base64 }));
                addToast('Avatar updated successfully', 'success');
            } catch (error) {
                addToast(error.response?.data?.error || 'Failed to upload avatar', 'error');
            } finally {
                setUploadingAvatar(false);
            }
        };
        reader.readAsDataURL(file);
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

    const handleLinkNavidrome = async () => {
        if (!navidromeUsername || !navidromePassword) {
            addToast('Please enter both username and password', 'error');
            return;
        }
        setIsLinkingNavidrome(true);
        try {
            const result = await verifyNavidromeUser(navidromeUsername, navidromePassword);
            setNavidromeLinked(true);
            setLinkedNavidromeUser(result.username);
            setNavidromeUsername('');
            setNavidromePassword('');
            addToast('Navidrome account linked successfully!', 'success');
        } catch (error) {
            addToast(error.response?.data?.error || 'Failed to verify Navidrome account', 'error');
        } finally {
            setIsLinkingNavidrome(false);
        }
    };

    const handleUnlinkNavidrome = async () => {
        try {
            await unlinkNavidromeUser();
            setNavidromeLinked(false);
            setLinkedNavidromeUser('');
            addToast('Navidrome account unlinked', 'success');
        } catch (error) {
            addToast('Failed to unlink account', 'error');
        }
    };

    const initials = user.username
        ? user.username.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
        : '??';

    return (
        <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <form onSubmit={handleUpdateProfile} className="space-y-6">
                {user.authType === 'oidc' && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-3xl p-6 flex items-start gap-4">
                        <div className="p-3 bg-blue-100 dark:bg-blue-800 rounded-2xl shrink-0">
                            <Shield className="w-6 h-6 text-blue-600 dark:text-blue-300" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-blue-900 dark:text-blue-100 mb-1">
                                Managed by SSO Provider
                            </h3>
                            <p className="text-sm text-blue-700 dark:text-blue-300 leading-relaxed">
                                Your account details (email and password) are managed by your Single Sign-On provider.
                                To change them, please visit your identity provider's settings dashboard.
                            </p>
                        </div>
                    </div>
                )}

                <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-8 shadow-sm space-y-8">
                    {/* General Settings */}
                    <div>
                        <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2 mb-6">
                            <User className="w-5 h-5 text-primary-500" />
                            Account Settings
                        </h3>
                        <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest pl-1">Email Address</label>
                                <div className="relative group/input">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within/input:text-primary-500 transition-colors" />
                                    <input
                                        type="email"
                                        value={email}
                                        disabled={user.authType === 'oidc'}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className={`w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm font-medium ${user.authType === 'oidc' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        placeholder="your@email.com"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-gray-100 dark:bg-gray-800" />

                    {/* Avatar Upload */}
                    <div>
                        <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2 mb-6">
                            <Camera className="w-5 h-5 text-primary-500" />
                            Profile Picture
                        </h3>
                        <div className="flex items-center gap-6">
                            <div className="relative w-24 h-24 rounded-2xl overflow-hidden border-4 border-gray-100 dark:border-gray-800 shadow-lg">
                                {avatar ? (
                                    <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-primary-500 flex items-center justify-center text-white text-2xl font-bold">
                                        {initials}
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 space-y-3">
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploadingAvatar}
                                    className="px-5 py-2.5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
                                >
                                    {uploadingAvatar ? (
                                        <><div className="w-4 h-4 border-2 border-primary-500/20 border-t-primary-500 rounded-full animate-spin" /> Uploading...</>
                                    ) : (
                                        <><Camera className="w-4 h-4" /> Upload New Photo</>
                                    )}
                                </button>
                                <p className="text-xs text-gray-400">Max file size: 500KB. JPG, PNG, GIF supported.</p>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleAvatarChange}
                                    accept="image/*"
                                    className="hidden"
                                />
                            </div>
                        </div>
                    </div>

                    {user.authType !== 'oidc' && (
                        <>
                            <div className="h-px bg-gray-100 dark:bg-gray-800" />
                            <div>
                                <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2 mb-6">
                                    <Lock className="w-5 h-5 text-primary-500" />
                                    Security
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest pl-1">New Password</label>
                                        <div className="relative group/input">
                                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within/input:text-primary-500 transition-colors" />
                                            <input
                                                type="password"
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm font-medium"
                                                placeholder="Leave empty to keep current"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest pl-1">Confirm Password</label>
                                        <div className="relative group/input">
                                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within/input:text-primary-500 transition-colors" />
                                            <input
                                                type="password"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm font-medium"
                                                placeholder="Must match new password"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Navidrome Account Linking */}
                    {navidromeConfigured && (
                        <>
                            <div className="h-px bg-gray-100 dark:bg-gray-800" />
                            <div>
                                <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2 mb-2">
                                    <Music className="w-5 h-5 text-primary-500" />
                                    Navidrome Sync
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                                    Link your personal Navidrome account to sync listening history and get personalized recommendations.
                                </p>

                                {navidromeLinked ? (
                                    <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800/50 rounded-2xl">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900 dark:text-white">Account Linked</p>
                                                <p className="text-xs text-green-600 dark:text-green-400 font-medium">As user: {linkedNavidromeUser}</p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleUnlinkNavidrome}
                                            className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl text-xs font-bold transition-colors"
                                        >
                                            <Unlink className="w-3.5 h-3.5" />
                                            Unlink
                                        </button>
                                    </div>
                                ) : (
                                    <div className="bg-gray-50 dark:bg-black/20 rounded-2xl p-6 border border-gray-100 dark:border-gray-800">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest pl-1">Navidrome Username</label>
                                                <div className="relative group/input">
                                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within/input:text-primary-500 transition-colors" />
                                                    <input
                                                        type="text"
                                                        value={navidromeUsername}
                                                        onChange={(e) => setNavidromeUsername(e.target.value)}
                                                        className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm font-medium"
                                                        placeholder="Your Navidrome username"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest pl-1">Navidrome Password</label>
                                                <div className="relative group/input">
                                                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within/input:text-primary-500 transition-colors" />
                                                    <input
                                                        type="password"
                                                        value={navidromePassword}
                                                        onChange={(e) => setNavidromePassword(e.target.value)}
                                                        className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm font-medium"
                                                        placeholder="Your Navidrome password"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                                            <div className="flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400 opacity-80 max-w-sm">
                                                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                                <span>Credentials are only used once to verify ownership and generate a token. They are not stored.</span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={handleLinkNavidrome}
                                                disabled={isLinkingNavidrome || !navidromeUsername || !navidromePassword}
                                                className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-50 text-white dark:text-gray-900 rounded-xl font-bold text-sm shadow-xl shadow-black/5 transition-all active:scale-95"
                                            >
                                                {isLinkingNavidrome ? (
                                                    <>
                                                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                                        Verifying...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Link2 className="w-4 h-4" />
                                                        Link Account
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    <div className="pt-6 border-t border-gray-100 dark:border-gray-800 flex justify-end">
                        <button
                            type="submit"
                            disabled={isUpdating}
                            className="flex items-center gap-2 px-8 py-3 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-xl font-black shadow-lg shadow-primary-500/20 transition-all active:scale-95"
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
    );
};

export default SettingsTab;
