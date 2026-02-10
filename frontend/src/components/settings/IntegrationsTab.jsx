import React, { useState } from 'react';
import { Music, Layers, Box, CheckCircle, RefreshCw, Activity, Radio } from 'lucide-react';
import { saveNavidromeConfig, deleteNavidromeConfig, testLidarrConnection, testLastfmConnection, triggerDiscoveryRefresh } from '../../utils/api';
import { useToast } from '../../contexts/ToastContext';
import {
    SettingsCard,
    SettingsCardHeader,
    SettingsSectionTitle,
    SettingsGrid,
    SettingsInput,
    FormField,
    StatusBadge
} from './SettingsComponents';

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
    const [testingLastfm, setTestingLastfm] = useState(false);
    const [lastfmValid, setLastfmValid] = useState(null);

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

    const handleTestLastfm = async () => {
        if (!settings.lastfmApiKey) {
            showError("Please enter a Last.fm API key first");
            return;
        }
        setTestingLastfm(true);
        setLastfmValid(null);
        try {
            await testLastfmConnection(settings.lastfmApiKey);
            setLastfmValid(true);
            showSuccess("Last.fm API key is valid! Refreshing discovery data...");
            triggerDiscoveryRefresh().catch(console.error);
        } catch (err) {
            setLastfmValid(false);
            showError(err.response?.data?.error || "Last.fm connection failed");
        } finally {
            setTestingLastfm(false);
        }
    };

    return (
        <section className="space-y-6">
            {/* Lidarr Section */}
            <SettingsCard>
                <SettingsCardHeader
                    icon={() => <img src="/arralogo.svg" alt="Lidarr" className="w-8 h-8" />}
                    iconBg="bg-primary-100 dark:bg-primary-950/30"
                    title="Lidarr"
                    description="Managed music requests and metadata"
                    badge={settings.lidarrUrl && settings.lidarrApiKey && <StatusBadge>Configured</StatusBadge>}
                />

                <SettingsGrid cols={2}>
                    <FormField label="Lidarr URL">
                        <SettingsInput
                            value={settings.lidarrUrl}
                            onChange={(val) => handleUpdate("lidarrUrl", val)}
                            placeholder="http://localhost:8686"
                            validateUrl
                        />
                    </FormField>
                    <FormField label="Lidarr API Key">
                        <SettingsInput
                            type="password"
                            value={settings.lidarrApiKey}
                            onChange={(val) => handleUpdate("lidarrApiKey", val)}
                        />
                    </FormField>
                </SettingsGrid>

                <div className="flex justify-end mt-4">
                    <TestButton
                        onClick={handleTestLidarr}
                        loading={testingLidarr}
                        disabled={!settings.lidarrUrl || !settings.lidarrApiKey}
                    />
                </div>
            </SettingsCard>

            {/* Last.fm Section */}
            <SettingsCard>
                <SettingsCardHeader
                    icon={Radio}
                    iconBg="bg-red-100 dark:bg-red-950/30"
                    iconColor="text-red-600 dark:text-red-400"
                    title="Last.fm"
                    description="Enables Top Hits charts, better images, and enhanced discovery"
                    badge={lastfmValid && <StatusBadge>Valid</StatusBadge>}
                />

                <div className="flex gap-2">
                    <div className="flex-1">
                        <FormField label="API Key">
                            <SettingsInput
                                type="password"
                                value={settings.lastfmApiKey}
                                onChange={(val) => {
                                    handleUpdate("lastfmApiKey", val);
                                    setLastfmValid(null);
                                }}
                                placeholder="Optional - enhances discovery features"
                            />
                        </FormField>
                    </div>
                    <div className="pt-7">
                        <TestButton
                            onClick={handleTestLastfm}
                            loading={testingLastfm}
                            disabled={!settings.lastfmApiKey}
                            success={lastfmValid}
                            label="Test"
                        />
                    </div>
                </div>
            </SettingsCard>

            {/* Music Streaming Services */}
            <SettingsCard>
                <SettingsSectionTitle>Streaming Services</SettingsSectionTitle>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 -mt-4">Connect your media streaming servers to sync your library.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Navidrome Card */}
                    <ServiceCard
                        icon={Music}
                        name="Navidrome"
                        description={navidromeStatus.connected
                            ? `${navidromeStatus.username} @ ${new URL(navidromeStatus.url).hostname}`
                            : "Stream your music library"}
                        connected={navidromeStatus.connected}
                        onConnect={() => setShowNavidromeForm(true)}
                        onDisconnect={handleDisconnectNavidrome}
                        showForm={showNavidromeForm}
                    />

                    {/* Placeholder Cards */}
                    <PlaceholderCard icon={Layers} name="Plex" />
                    <PlaceholderCard icon={Box} name="Jellyfin" />
                </div>

                {/* Navidrome Config Form */}
                {showNavidromeForm && (
                    <NavidromeForm
                        config={navidromeConfig}
                        onConfigChange={updateNavidromeConfig}
                        onSubmit={handleConnectNavidrome}
                        onCancel={() => setShowNavidromeForm(false)}
                        loading={connectingNavidrome}
                    />
                )}
            </SettingsCard>
        </section>
    );
}

// Helper Components
function TestButton({ onClick, loading, disabled, success, label = "Test Connection" }) {
    return (
        <button
            onClick={onClick}
            disabled={loading || disabled}
            className="px-6 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-xl text-sm font-bold transition-all flex items-center gap-2 disabled:opacity-50"
            type="button"
        >
            {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
            ) : success ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
            ) : (
                <Activity className="w-4 h-4" />
            )}
            {loading ? "Testing..." : label}
        </button>
    );
}

function ServiceCard({ icon: Icon, name, description, connected, onConnect, onDisconnect, showForm }) {
    return (
        <div className={`p-5 rounded-2xl border transition-all ${connected
            ? "bg-primary-500/5 border-primary-500/20"
            : "bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700"
            }`}>
            <div className="flex items-center justify-between mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${connected ? "bg-primary-500 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-400"}`}>
                    <Icon className="w-5 h-5" />
                </div>
                {connected && <StatusBadge>Connected</StatusBadge>}
            </div>

            <h4 className="text-base font-bold text-gray-900 dark:text-white">{name}</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-4">{description}</p>

            {!connected && !showForm && (
                <button onClick={onConnect} className="w-full py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl text-xs font-bold hover:scale-[1.02] transition-all">
                    Connect
                </button>
            )}
            {connected && (
                <button onClick={onDisconnect} className="w-full py-2 bg-red-500/10 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold hover:bg-red-500/20 transition-all">
                    Disconnect
                </button>
            )}
        </div>
    );
}

function PlaceholderCard({ icon: Icon, name }) {
    return (
        <div className="p-5 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 flex flex-col items-center text-center grayscale opacity-50 cursor-not-allowed text-gray-500">
            <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-gray-700 mb-3 flex items-center justify-center text-gray-400">
                <Icon className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-sm">{name}</h4>
            <span className="text-[10px] uppercase font-black text-gray-400 mt-1 tracking-widest">Coming Soon</span>
        </div>
    );
}

function NavidromeForm({ config, onConfigChange, onSubmit, onCancel, loading }) {
    return (
        <div className="mt-6 p-6 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-gray-900 dark:text-white">Connect Navidrome</h4>
                <button onClick={onCancel} className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">Cancel</button>
            </div>

            <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                    <FormField label="Server URL" small>
                        <SettingsInput
                            type="url"
                            value={config.url}
                            onChange={(val) => onConfigChange({ ...config, url: val })}
                            placeholder="https://music.yourdomain.com"
                            validateUrl
                        />
                    </FormField>
                </div>
                <FormField label="Username" small>
                    <SettingsInput
                        value={config.username}
                        onChange={(val) => onConfigChange({ ...config, username: val })}
                    />
                </FormField>
                <FormField label="Password / API Token" small>
                    <SettingsInput
                        type="password"
                        value={config.password}
                        onChange={(val) => onConfigChange({ ...config, password: val })}
                    />
                </FormField>
                <div className="md:col-span-2 pt-2">
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-xl font-bold shadow-lg shadow-primary-500/20 transition-all flex items-center justify-center gap-2"
                    >
                        {loading ? (
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
    );
}
