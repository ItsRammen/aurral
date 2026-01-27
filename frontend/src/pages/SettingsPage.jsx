import { useState, useEffect } from "react";
import {
  Settings,
  Database,
  Info,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Image,
  Trash2,
  TrendingUp,
  Save,
  Globe,
  Users,
  Music,
  Box,
  Activity,
  Layers,
} from "lucide-react";
import api, {
  checkHealth,
  getLidarrRootFolders,
  getLidarrQualityProfiles,
  getLidarrMetadataProfiles,
  getAppSettings,
  updateAppSettings,
} from "../utils/api";
import { useToast } from "../contexts/ToastContext";

function SettingsPage() {
  const [health, setHealth] = useState(null);
  const [rootFolders, setRootFolders] = useState([]);
  const [qualityProfiles, setQualityProfiles] = useState([]);
  const [metadataProfiles, setMetadataProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshingDiscovery, setRefreshingDiscovery] = useState(false);
  const [clearingCache, setClearingCache] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  const { showSuccess, showError, showInfo } = useToast();

  const [settings, setSettings] = useState({
    rootFolderPath: "",
    qualityProfileId: "",
    metadataProfileId: "",
    monitored: true,
    searchForMissingAlbums: false,
    albumFolders: true,
    lidarrUrl: "",
    lidarrApiKey: "",
    lastfmApiKey: "",
    contactEmail: "",
    discoveryRefreshInterval: 24,
    appName: "Aurral",
    appUrl: "",
    defaultPermissions: ["request"],
  });

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const [healthData, savedSettings] = await Promise.all([
          checkHealth(),
          getAppSettings(),
        ]);
        setHealth(healthData);
        setSettings(savedSettings);

        if (healthData.lidarrConfigured) {
          const [folders, quality, metadata] = await Promise.all([
            getLidarrRootFolders(),
            getLidarrQualityProfiles(),
            getLidarrMetadataProfiles(),
          ]);
          setRootFolders(folders);
          setQualityProfiles(quality);
          setMetadataProfiles(metadata);
        }
      } catch (err) {
        console.error("Failed to fetch settings:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateAppSettings(settings);
      showSuccess("Default settings saved successfully!");
    } catch (err) {
      showError("Failed to save settings: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRefreshDiscovery = async () => {
    if (refreshingDiscovery) return;
    setRefreshingDiscovery(true);
    try {
      await api.post("/discover/refresh");
      showInfo(
        "Discovery refresh started in background. This may take a few minutes to fully hydrate images.",
      );
      const healthData = await checkHealth();
      setHealth(healthData);
    } catch (err) {
      showError(
        "Failed to start refresh: " +
        (err.response?.data?.message || err.message),
      );
    } finally {
      setRefreshingDiscovery(false);
    }
  };

  const handleClearCache = async () => {
    if (
      !window.confirm(
        "Are you sure you want to clear the discovery and image cache? This will reset all recommendations until the next refresh.",
      )
    )
      return;
    setClearingCache(true);
    try {
      await api.post("/discover/clear");
      showSuccess("Cache cleared successfully.");
      const healthData = await checkHealth();
      setHealth(healthData);
    } catch (err) {
      showError(
        "Failed to clear cache: " +
        (err.response?.data?.message || err.message),
      );
    } finally {
      setClearingCache(false);
    }
  };

  const tabs = [
    { id: "general", label: "General", icon: Globe },
    { id: "users", label: "Users", icon: Users },
    { id: "music", label: "Music Services", icon: Music },
    { id: "services", label: "Services", icon: Box },
    { id: "jobs", label: "Jobs & Cache", icon: Activity },
    { id: "about", label: "About", icon: Info },
  ];

  return (
    <div className="min-h-screen pb-32 animate-fade-in relative max-w-5xl mx-auto px-4 md:px-8">
      {/* Settings Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Settings</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Configure global and default settings for Aurral.</p>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 mb-8 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-bold transition-all border-b-2 whitespace-nowrap ${isActive
                ? "border-primary-500 text-primary-600 dark:text-primary-400 bg-primary-500/5"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900/50"
                }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-primary-500" : ""}`} />
              {tab.label}
            </button>
          )
        })}
      </div>

      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
        {activeTab === "general" && (
          <section className="space-y-6">
            <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-8 shadow-sm space-y-8">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest pl-1">Application Title</label>
                    <input
                      type="text"
                      className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl py-3 px-4 outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm"
                      value={settings.appName || ""}
                      onChange={(e) => setSettings({ ...settings, appName: e.target.value })}
                      placeholder="Aurral"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest pl-1">Application URL</label>
                    <input
                      type="text"
                      className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl py-3 px-4 outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm"
                      value={settings.appUrl || ""}
                      onChange={(e) => setSettings({ ...settings, appUrl: e.target.value })}
                      placeholder="https://aurral.yourdomain.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-gray-100 dark:border-gray-800">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest pl-1">Last.fm API Key</label>
                    <input
                      type="password"
                      className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl py-3 px-4 outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm"
                      value={settings.lastfmApiKey || ""}
                      onChange={(e) => setSettings({ ...settings, lastfmApiKey: e.target.value })}
                      placeholder="Optional"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest pl-1">Contact Email</label>
                    <input
                      type="email"
                      className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl py-3 px-4 outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm"
                      value={settings.contactEmail || ""}
                      onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })}
                      placeholder="user@example.com"
                    />
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 italic px-1">Used for MusicBrainz identification</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {activeTab === "users" && (
          <section className="space-y-6">
            <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-8 shadow-sm">
              <h3 className="text-lg font-black text-gray-900 dark:text-white mb-6">Default User Settings</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Set the default permissions for all newly created users.</p>

              <div className="space-y-4">
                {[
                  { id: 'request', label: 'Request', desc: 'Allows users to submit new music requests.' },
                  { id: 'auto_approve', label: 'Auto-Approve', desc: 'Automatically approves any requests made by the user.' },
                  { id: 'manage_requests', label: 'Manage Requests', desc: 'Allows users to approve or deny requests from others.' },
                  { id: 'manage_users', label: 'Manage Users', desc: 'Allows users to create and edit other users.' },
                ].map((perm) => (
                  <label key={perm.id} className="group flex items-center justify-between p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750 transition-all cursor-pointer border border-transparent hover:border-primary-500/20">
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-900 dark:text-white">{perm.label}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{perm.desc}</span>
                    </div>
                    <div className="relative">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={settings.defaultPermissions?.includes(perm.id)}
                        onChange={(e) => {
                          const current = settings.defaultPermissions || [];
                          const updated = e.target.checked
                            ? [...current, perm.id]
                            : current.filter(p => p !== perm.id);
                          setSettings({ ...settings, defaultPermissions: updated });
                        }}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none dark:bg-gray-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </section>
        )}

        {activeTab === "music" && (
          <section className="space-y-6">
            <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-8 shadow-sm">
              <h3 className="text-lg font-black text-gray-900 dark:text-white mb-6">Music Services</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Configure your media streaming servers to sync your library.</p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {['Plex', 'Navidrome', 'Jellyfin'].map(service => (
                  <div key={service} className="p-6 rounded-3xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 flex flex-col items-center text-center group grayscale opacity-50 cursor-not-allowed text-gray-500">
                    <div className="w-12 h-12 rounded-2xl bg-gray-200 dark:bg-gray-700 mb-4 flex items-center justify-center text-gray-400">
                      <Music className="w-6 h-6" />
                    </div>
                    <h4 className="font-bold">{service}</h4>
                    <span className="text-[10px] uppercase font-black text-gray-400 mt-2 tracking-widest">Coming Soon</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {activeTab === "services" && (
          <section className="space-y-6">
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
                    onChange={(e) => setSettings({ ...settings, lidarrUrl: e.target.value })}
                    placeholder="http://localhost:8686"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest pl-1">Lidarr API Key</label>
                  <input
                    type="password"
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl py-3 px-4 outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm"
                    value={settings.lidarrApiKey || ""}
                    onChange={(e) => setSettings({ ...settings, lidarrApiKey: e.target.value })}
                  />
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-gray-100 dark:border-gray-800 space-y-6">
                <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary-500" /> Default Artist Options
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest pl-1">Root Folder</label>
                    <select
                      className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl py-3 px-4 outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm"
                      value={settings.rootFolderPath || ""}
                      onChange={(e) => setSettings({ ...settings, rootFolderPath: e.target.value })}
                    >
                      <option value="">Select folder...</option>
                      {rootFolders.map((f) => (
                        <option key={f.id} value={f.path}>{f.path}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest pl-1">Quality Profile</label>
                    <select
                      className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl py-3 px-4 outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm"
                      value={settings.qualityProfileId || ""}
                      onChange={(e) => setSettings({ ...settings, qualityProfileId: parseInt(e.target.value) || "" })}
                    >
                      <option value="">Select profile...</option>
                      {qualityProfiles.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest pl-1">Metadata Profile</label>
                    <select
                      className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl py-3 px-4 outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm"
                      value={settings.metadataProfileId || ""}
                      onChange={(e) => setSettings({ ...settings, metadataProfileId: parseInt(e.target.value) || "" })}
                    >
                      <option value="">Select profile...</option>
                      {metadataProfiles.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  {[
                    { id: 'monitored', label: 'Monitor Artist' },
                    { id: 'searchForMissingAlbums', label: 'Search for missing albums on add' },
                    { id: 'albumFolders', label: 'Create album folders' },
                  ].map(opt => (
                    <label key={opt.id} className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 cursor-pointer group">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{opt.label}</span>
                      <div className="relative">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={settings[opt.id]}
                          onChange={(e) => setSettings({ ...settings, [opt.id]: e.target.checked })}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none dark:bg-gray-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {activeTab === "jobs" && (
          <section className="space-y-6">
            <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-8 shadow-sm">
              <h3 className="text-lg font-black text-gray-900 dark:text-white mb-6">Jobs & Cache</h3>

              <div className="space-y-8">
                <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white">Discovery Refresh</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Manage how often the discovery cache is updated.</p>
                    </div>
                    <button
                      onClick={handleRefreshDiscovery}
                      disabled={refreshingDiscovery || health?.discovery?.isUpdating}
                      className="px-6 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-xl text-xs font-black transition-all shadow-lg shadow-primary-500/20"
                    >
                      {health?.discovery?.isUpdating ? "Running..." : "Run Now"}
                    </button>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex-1 space-y-2">
                      <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest pl-1">Refresh Interval (Hours)</label>
                      <input
                        type="number"
                        min="1"
                        max="168"
                        className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl py-2 px-4 outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm"
                        value={settings.discoveryRefreshInterval || 24}
                        onChange={(e) => setSettings({ ...settings, discoveryRefreshInterval: parseInt(e.target.value) || 1 })}
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 mt-6">Last updated: {health?.discovery?.lastUpdated ? new Date(health.discovery.lastUpdated).toLocaleString() : 'Never'}</p>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-red-50/50 dark:bg-red-900/10 rounded-3xl border border-red-100 dark:border-red-900/30 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-red-700 dark:text-red-400">Clear Cache</h4>
                    <p className="text-xs text-red-600/70 dark:text-red-400/60">Reset all discovery recommendations and image caches.</p>
                  </div>
                  <button
                    onClick={handleClearCache}
                    disabled={clearingCache}
                    className="px-6 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-xs font-black transition-all shadow-lg shadow-red-500/20"
                  >
                    Clear All Cache
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {activeTab === "about" && (
          <section className="space-y-6">
            <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-8 shadow-sm">
              <div className="flex items-center gap-6 mb-8">
                <img src="/arralogo.svg" alt="Aurral" className="w-16 h-16" />
                <div>
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white">Aurral</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Version 1.0.0 "Overseerr Style"</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-gray-100 dark:border-gray-800">
                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase text-gray-400 tracking-widest">System Health</h4>
                  {health && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Backend API</span>
                        <span className={`font-bold ${health.status === 'ok' ? 'text-green-500' : 'text-red-500'}`}>{health.status === 'ok' ? 'Connected' : 'Error'}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Lidarr Connection</span>
                        <span className={`font-bold ${health.lidarrStatus === 'connected' ? 'text-green-500' : 'text-yellow-500'}`}>{health.lidarrStatus === 'connected' ? 'Connected' : 'Check Settings'}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Last.fm Integration</span>
                        <span className={`font-bold ${health.lastfmConfigured ? 'text-green-500' : 'text-gray-400'}`}>{health.lastfmConfigured ? 'Configured' : 'Missing Key'}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase text-gray-400 tracking-widest">About the Stack</h4>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Aurral is built with a modern React frontend and a robust Node.js backend. It leverages MusicBrainz and Last.fm for top-tier metadata and discovery, and seamlessly integrates with the Lidarr API for media library automation.
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* Floating Save Button */}
      <div className="sticky bottom-6 mt-12 flex justify-end z-40 pointer-events-none">
        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="pointer-events-auto flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-xl font-bold shadow-xl shadow-primary-500/30 transition-all hover:scale-[1.02] active:scale-95 text-sm"
        >
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              Saving...
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
  );
}

export default SettingsPage;

