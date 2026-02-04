import { useState, useEffect } from "react";
import { Save, Loader } from "lucide-react";
import {
  checkHealth,
  getLidarrRootFolders,
  getLidarrQualityProfiles,
  getLidarrMetadataProfiles,
  getAppSettings,
  updateAppSettings,
  getNavidromeStatus,
  getJobStatus,
} from "../utils/api";
import { useToast } from "../contexts/ToastContext";

// Components
import SettingsTabs from "../components/settings/SettingsTabs";
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

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const [healthData, savedSettings, naviStatus, jobsData] = await Promise.all([
          checkHealth(),
          getAppSettings(),
          getNavidromeStatus(),
          getJobStatus(),
        ]);
        setHealth(healthData);
        setSettings(savedSettings);
        setJobs(jobsData);
        setNavidromeStatus(naviStatus);
        if (naviStatus.connected) {
          setNavidromeConfig(prev => ({ ...prev, url: naviStatus.url, username: naviStatus.username }));
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
    <div className="min-h-screen pb-32 animate-fade-in relative max-w-5xl mx-auto px-4 md:px-8">
      {/* Settings Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Settings</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Configure global and default settings for Aurral.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn btn-primary shadow-lg shadow-primary-500/20 px-6 py-2.5 flex items-center gap-2"
        >
          {saving ? <Loader className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          Save Changes
        </button>
      </div>

      {/* Tabs Navigation */}
      <SettingsTabs activeTab={activeTab} setActiveTab={setActiveTab} />

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
