import { useState, useEffect } from "react";
import { Save, Loader, AlertTriangle } from "lucide-react";
import {
  checkHealth,
  getLidarrRootFolders,
  getLidarrQualityProfiles,
  getLidarrMetadataProfiles,
  getAppSettings,
  updateAppSettings,
  getNavidromeStatus,
  getJellyfinStatus,
  getPlexStatus,
  getJobStatus,
} from "../utils/api";
import { useToast } from "../contexts/ToastContext";

// Components
import SettingsTabs from "../components/settings/SettingsTabs";
import PageHeader from "../components/PageHeader";
import GeneralTab from "../components/settings/GeneralTab";
import IntegrationsTab from "../components/settings/IntegrationsTab";
import AuthTab from "../components/settings/AuthTab";
import SystemTab from "../components/settings/SystemTab";

function SettingsPage() {
  const [health, setHealth] = useState(null);
  const [rootFolders, setRootFolders] = useState([]);
  const [qualityProfiles, setQualityProfiles] = useState([]);
  const [metadataProfiles, setMetadataProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  const { showSuccess, showError } = useToast();

  // Jobs State
  const [jobs, setJobs] = useState([]);

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
    oidcEnabled: false,
    oidcClientId: "",
    oidcClientSecret: "",
    oidcIssuerUrl: "",
    oidcAuthorizationUrl: "",
    oidcTokenUrl: "",
    oidcUserInfoUrl: "",
    oidcCallbackUrl: "",
  });

  const [navidromeConfig, setNavidromeConfig] = useState({
    url: "",
    username: "",
    password: "",
  });
  const [navidromeStatus, setNavidromeStatus] = useState({ connected: false });

  const [jellyfinConfig, setJellyfinConfig] = useState({
    url: "",
    apiKey: "",
  });
  const [jellyfinStatus, setJellyfinStatus] = useState({ connected: false });

  const [plexConfig, setPlexConfig] = useState({
    url: "",
    token: "",
  });
  const [plexStatus, setPlexStatus] = useState({ connected: false });

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const [healthData, savedSettings, naviStatus, jellyStatus, plexStatus, jobsData] = await Promise.all([
          checkHealth(),
          getAppSettings(),
          getNavidromeStatus(),
          getJellyfinStatus(),
          getPlexStatus(),
          getJobStatus(),
        ]);
        setHealth(healthData);
        setSettings(savedSettings);
        setJobs(jobsData);
        setNavidromeStatus(naviStatus);
        setJellyfinStatus(jellyStatus);
        setPlexStatus(plexStatus);
        if (naviStatus.connected) {
          setNavidromeConfig(prev => ({ ...prev, url: naviStatus.url, username: naviStatus.username }));
        }
        if (jellyStatus.connected) {
          setJellyfinConfig(prev => ({ ...prev, url: jellyStatus.url }));
        }
        if (plexStatus.connected) {
          setPlexConfig(prev => ({ ...prev, url: plexStatus.url }));
        }

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
        showError("Failed to load settings");
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [showError]);

  const handleUpdate = (field, value) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateAppSettings(settings);
      showSuccess("Settings saved successfully");

      // Refresh health check to update steps
      const healthData = await checkHealth();
      setHealth(healthData);
    } catch (err) {
      console.error("Failed to save settings:", err);
      showError("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32 animate-fade-in relative max-w-7xl mx-auto px-4 md:px-8">
      <PageHeader
        title="Settings"
        subtitle="Configure global and default settings for Aurral."
        action={
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn btn-primary shadow-lg shadow-primary-500/20 px-6 py-2.5 flex items-center gap-2"
          >
            {saving ? <Loader className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Save Changes
          </button>
        }
      />

      {/* Security Warnings Banner */}
      {health?.securityWarnings?.length > 0 && (
        <div className="mb-6 bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-amber-600 dark:text-amber-400 text-sm">Security Warning</h4>
            <ul className="text-sm text-amber-700 dark:text-amber-300 mt-1 space-y-1">
              {health.securityWarnings.map((warning, i) => (
                <li key={i}>• {warning}</li>
              ))}
            </ul>
            <p className="text-xs text-amber-600/70 dark:text-amber-400/70 mt-2">
              Set <code className="bg-amber-500/20 px-1 rounded">JWT_SECRET</code> and <code className="bg-amber-500/20 px-1 rounded">SESSION_SECRET</code> environment variables in your Docker container.
            </p>
          </div>
        </div>
      )}

      {/* Tabs Navigation */}
      <SettingsTabs
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        connectionStatus={{
          lidarr: !!(settings.lidarrUrl && settings.lidarrApiKey),
          navidrome: navidromeStatus.connected,
          jellyfin: jellyfinStatus.connected,
          plex: plexStatus.connected,
          lastfm: !!settings.lastfmApiKey
        }}
      />

      {/* Tab Content */}
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
        {activeTab === "general" && (
          <GeneralTab settings={settings} handleUpdate={handleUpdate} />
        )}

        {activeTab === "music" && (
          <IntegrationsTab
            settings={settings}
            handleUpdate={handleUpdate}
            navidromeStatus={navidromeStatus}
            setNavidromeStatus={setNavidromeStatus}
            navidromeConfig={navidromeConfig}
            setNavidromeConfig={setNavidromeConfig}
            jellyfinStatus={jellyfinStatus}
            setJellyfinStatus={setJellyfinStatus}
            jellyfinConfig={jellyfinConfig}
            setJellyfinConfig={setJellyfinConfig}
            plexStatus={plexStatus}
            setPlexStatus={setPlexStatus}
            plexConfig={plexConfig}
            setPlexConfig={setPlexConfig}
          />
        )}

        {activeTab === "auth" && (
          <AuthTab settings={settings} handleUpdate={handleUpdate} />
        )}

        {activeTab === "system" && (
          <SystemTab
            settings={settings}
            handleUpdate={handleUpdate}
            jobs={jobs}
            setJobs={setJobs}
            setHealth={setHealth}
          />
        )}
      </div>
    </div>
  );
}

export default SettingsPage;
