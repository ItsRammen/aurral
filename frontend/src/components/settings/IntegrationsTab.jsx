import React, { useState } from 'react';
import { Music, Layers, Box, CheckCircle, RefreshCw, Activity } from 'lucide-react';
import { saveNavidromeConfig, deleteNavidromeConfig, testLidarrConnection } from '../../utils/api';
import { useToast } from '../../contexts/ToastContext';

export default function IntegrationsTab({
    settings,
    handleUpdate,
    navidromeStatus,
    setNavidromeStatus,
    setNavidromeConfig: updateNavidromeConfig,
    navidromeConfig
}) {
    const { showSuccess, showError } = useToast();
    const [connectingNavidrome, setConnectingNavidrome] = useState(false);
    const [showNavidromeForm, setShowNavidromeForm] = useState(false);
    const [testingLidarr, setTestingLidarr] = useState(false);

    const handleConnectNavidrome = async (e) => {
        e.preventDefault();
        setConnectingNavidrome(true);
        try {
            const response = await saveNavidromeConfig(navidromeConfig);
            if (response.success) {
                showSuccess("Navidrome connected successfully");
                setNavidromeStatus({ connected: true, url: navidromeConfig.url, username: navidromeConfig.username });
                setShowNavidromeForm(false);
                updateNavidromeConfig(prev => ({ ...prev, password: "" }));
            }
        } catch (err) {
            showError(err.response?.data?.error || "Failed to connect to Navidrome");
        } finally {
            setConnectingNavidrome(false);
        }
    };

    const handleDisconnectNavidrome = async () => {
        if (!window.confirm("Are you sure you want to disconnect Navidrome? This will remove all Navidrome integration features.")) return;

        try {
            await deleteNavidromeConfig();
            showSuccess("Navidrome disconnected");
            setNavidromeStatus({ connected: false });
            updateNavidromeConfig({ url: "", username: "", password: "" });
        } catch (err) {
            showError("Failed to disconnect Navidrome");
        }
    };

    const handleTestLidarr = async (e) => {
        e.preventDefault();
        if (!settings.lidarrUrl || !settings.lidarrApiKey) {
            showError("Please enter Lidarr URL and API Key first");
            return;
        }

        setTestingLidarr(true);
        try {
            await testLidarrConnection({
                lidarrUrl: settings.lidarrUrl,
                lidarrApiKey: settings.lidarrApiKey
            });
            showSuccess("Lidarr connection successful!");
        } catch (err) {
            showError(err.response?.data?.error || "Lidarr connection failed");
        } finally {
            setTestingLidarr(false);
        }
    };

    return (
        <section className="space-y-6">
            {/* Lidarr Section (Moved Above) */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-8 shadow-sm">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-primary-100 dark:bg-primary-950/30 flex items-center justify-center">
                        <img src="/arralogo.svg" alt="Lidarr" className="w-8 h-8" />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-gray-900 dark:text-white">Lidarr</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Managed music requests and metadata</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest pl-1">Lidarr URL</label>
                        <input
                            type="text"
                            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl py-3 px-4 outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm"
                            value={settings.lidarrUrl || ""}
                            onChange={(e) => handleUpdate("lidarrUrl", e.target.value)}
                            placeholder="http://localhost:8686"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest pl-1">Lidarr API Key</label>
                        <input
                            type="password"
                            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl py-3 px-4 outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm"
                            value={settings.lidarrApiKey || ""}
                            onChange={(e) => handleUpdate("lidarrApiKey", e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex justify-end mt-4">
                    <button
                        onClick={handleTestLidarr}
                        disabled={testingLidarr || !settings.lidarrUrl || !settings.lidarrApiKey}
                        className="px-6 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-xl text-sm font-bold transition-all flex items-center gap-2 disabled:opacity-50"
                        type="button"
                    >
                        {testingLidarr ? (
                            <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                Testing...
                            </>
                        ) : (
                            <>
                                <Activity className="w-4 h-4" />
                                Test Connection
                            </>
                        )}
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-8 shadow-sm">
                <h3 className="text-lg font-black text-gray-900 dark:text-white mb-6">Music Services</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Configure your media streaming servers to sync your library.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Navidrome Card */}
                    <div className={`p-6 rounded-3xl border transition-all ${navidromeStatus.connected
                        ? "bg-primary-500/5 border-primary-500/20"
                        : "bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700"
                        }`}>
                        <div className="flex items-center justify-between mb-6">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${navidromeStatus.connected ? "bg-primary-500 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-400"
                                }`}>
                                <Music className="w-6 h-6" />
                            </div>
                            {navidromeStatus.connected && (
                                <span className="flex items-center gap-1 text-[10px] font-black uppercase text-green-500 bg-green-500/10 px-2 py-1 rounded-full">
                                    <CheckCircle className="w-3 h-3" /> Connected
                                </span>
                            )}
                        </div>

                        <h4 className="text-lg font-bold text-gray-900 dark:text-white">Navidrome</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-6">
                            {navidromeStatus.connected
                                ? `Linked to ${navidromeStatus.username} @ ${new URL(navidromeStatus.url).hostname}`
                                : "Stream your library directly from your Navidrome server."}
                        </p>

                        {!navidromeStatus.connected && !showNavidromeForm && (
                            <button
                                onClick={() => setShowNavidromeForm(true)}
                                className="w-full py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl text-xs font-bold hover:scale-[1.02] transition-all"
                            >
                                Connect Account
                            </button>
                        )}

                        {navidromeStatus.connected && (
                            <button
                                onClick={handleDisconnectNavidrome}
                                className="w-full py-2.5 bg-red-500/10 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold hover:bg-red-500/20 transition-all"
                            >
                                Disconnect
                            </button>
                        )}
                    </div>

                    {/* Plex Placeholder */}
                    <div className="p-6 rounded-3xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 flex flex-col items-center text-center grayscale opacity-50 cursor-not-allowed text-gray-500">
                        <div className="w-12 h-12 rounded-2xl bg-gray-200 dark:bg-gray-700 mb-4 flex items-center justify-center text-gray-400">
                            <Layers className="w-6 h-6" />
                        </div>
                        <h4 className="font-bold">Plex</h4>
                        <span className="text-[10px] uppercase font-black text-gray-400 mt-2 tracking-widest">Coming Soon</span>
                    </div>

                    {/* Jellyfin Placeholder */}
                    <div className="p-6 rounded-3xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 flex flex-col items-center text-center grayscale opacity-50 cursor-not-allowed text-gray-500">
                        <div className="w-12 h-12 rounded-2xl bg-gray-200 dark:bg-gray-700 mb-4 flex items-center justify-center text-gray-400">
                            <Box className="w-6 h-6" />
                        </div>
                        <h4 className="font-bold">Jellyfin</h4>
                        <span className="text-[10px] uppercase font-black text-gray-400 mt-2 tracking-widest">Coming Soon</span>
                    </div>
                </div>

                {/* Navidrome Config Form */}
                {showNavidromeForm && (
                    <div className="mt-8 p-8 bg-gray-50 dark:bg-gray-800/50 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-6">
                            <h4 className="font-bold text-gray-900 dark:text-white">Connect Navidrome</h4>
                            <button onClick={() => setShowNavidromeForm(false)} className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">Cancel</button>
                        </div>

                        <form onSubmit={handleConnectNavidrome} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2 space-y-2">
                                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest pl-1">Server URL</label>
                                <input
                                    type="url"
                                    required
                                    className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm"
                                    placeholder="https://music.yourdomain.com"
                                    value={navidromeConfig.url}
                                    onChange={e => updateNavidromeConfig({ ...navidromeConfig, url: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest pl-1">Username</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm"
                                    value={navidromeConfig.username}
                                    onChange={e => updateNavidromeConfig({ ...navidromeConfig, username: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest pl-1">Password / API Token</label>
                                <input
                                    type="password"
                                    required
                                    className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm"
                                    value={navidromeConfig.password}
                                    onChange={e => updateNavidromeConfig({ ...navidromeConfig, password: e.target.value })}
                                />
                            </div>
                            <div className="md:col-span-2 pt-4">
                                <button
                                    type="submit"
                                    disabled={connectingNavidrome}
                                    className="w-full py-3 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-xl font-bold shadow-lg shadow-primary-500/20 transition-all flex items-center justify-center gap-2"
                                >
                                    {connectingNavidrome ? (
                                        <>
                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                            Verifying...
                                        </>
                                    ) : (
                                        "Save & Connect"
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </section>
    );
}
