import React, { useState, useEffect } from 'react';
import { Database, RefreshCw, Trash2, TrendingUp, HardDrive, Image, CheckCircle2, XCircle, Clock } from 'lucide-react';
import api, { checkHealth, runNavidromeJob, getJobStatus, getSystemStats } from '../../utils/api';
import { useToast } from '../../contexts/ToastContext';
import {
    SettingsCard,
    SettingsSectionTitle,
    SettingsToggle,
    SettingsRow
} from './SettingsComponents';

export default function SystemTab({ settings, handleUpdate, jobs, setJobs, setHealth }) {
    const { showSuccess, showError, showInfo } = useToast();
    const [refreshingDiscovery, setRefreshingDiscovery] = useState(false);
    const [refreshingPersonal, setRefreshingPersonal] = useState(false);
    const [clearingCache, setClearingCache] = useState(false);
    const [runningNavidromeJob, setRunningNavidromeJob] = useState(false);
    const [systemStats, setSystemStats] = useState(null);
    const [loadingStats, setLoadingStats] = useState(true);

    useEffect(() => { fetchSystemStats(); }, []);

    const fetchSystemStats = async () => {
        setLoadingStats(true);
        try {
            const stats = await getSystemStats();
            setSystemStats(stats);
        } catch (err) {
            console.error("Failed to fetch system stats:", err);
        } finally {
            setLoadingStats(false);
        }
    };

    const handleRefreshDiscovery = async () => {
        if (refreshingDiscovery) return;
        setRefreshingDiscovery(true);
        try {
            await api.post("/discover/refresh");
            showInfo("Discovery refresh started in background.");
            const healthData = await checkHealth();
            setHealth(healthData);
        } catch (err) {
            showError("Failed to start refresh: " + (err.response?.data?.message || err.message));
        } finally {
            setRefreshingDiscovery(false);
        }
    };

    const handleRefreshPersonal = async () => {
        if (refreshingPersonal) return;
        setRefreshingPersonal(true);
        try {
            await api.post("/discover/personal/refresh");
            showInfo("Personalized discovery refresh started in background.");
            const healthData = await checkHealth();
            setHealth(healthData);
        } catch (err) {
            showError("Failed to start refresh: " + (err.response?.data?.message || err.message));
        } finally {
            setRefreshingPersonal(false);
        }
    };

    const handleClearCache = async () => {
        if (!window.confirm("Clear discovery and image cache? This resets recommendations until next refresh.")) return;
        setClearingCache(true);
        try {
            await api.post("/discover/clear");
            showSuccess("Cache cleared successfully.");
            const healthData = await checkHealth();
            setHealth(healthData);
            fetchSystemStats();
        } catch (err) {
            showError("Failed to clear cache: " + (err.response?.data?.message || err.message));
        } finally {
            setClearingCache(false);
        }
    };

    const handleRunNavidromeJob = async () => {
        setRunningNavidromeJob(true);
        try {
            await runNavidromeJob();
            showSuccess("Navidrome refresh job started");
            setTimeout(async () => {
                const jobsData = await getJobStatus();
                setJobs(jobsData);
            }, 1000);
        } catch (err) {
            showError("Failed to start job");
        } finally {
            setRunningNavidromeJob(false);
        }
    };

    const getLastRun = (jobName) => {
        const job = jobs.filter(j => j.name === jobName)
            .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt))[0];
        if (!job) return "Never run";
        return new Date(job.completedAt || job.startedAt).toLocaleString();
    };

    const getJobState = (jobName) => {
        const job = jobs.filter(j => j.name === jobName)
            .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt))[0];
        return job?.status || 'idle';
    };

    return (
        <section className="space-y-6">
            {/* Image Cache Stats */}
            {systemStats?.imageCache && (
                <SettingsCard>
                    <div className="flex items-center justify-between mb-6">
                        <SettingsSectionTitle className="mb-0">Image Cache</SettingsSectionTitle>
                        <button
                            onClick={fetchSystemStats}
                            disabled={loadingStats}
                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                            <RefreshCw className={`w-4 h-4 text-gray-500 ${loadingStats ? 'animate-spin' : ''}`} />
                        </button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <StatCard icon={Image} value={systemStats.imageCache.total} label="Total" color="gray" />
                        <StatCard icon={CheckCircle2} value={systemStats.imageCache.cachedLocally} label="Cached" color="green" />
                        <StatCard icon={Clock} value={systemStats.imageCache.pendingDownload} label="Pending" color="yellow" />
                        <StatCard icon={XCircle} value={systemStats.imageCache.notFound} label="Not Found" color="red" />
                        <StatCard icon={HardDrive} value={systemStats.imageCache.diskUsage} label="Disk Usage" color="blue" />
                    </div>
                </SettingsCard>
            )}

            {/* System Actions */}
            <SettingsCard>
                <SettingsSectionTitle>System Maintenance</SettingsSectionTitle>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <ActionButton
                        icon={RefreshCw}
                        title="Refresh Discovery"
                        description="Update recommendations and trending data"
                        onClick={handleRefreshDiscovery}
                        loading={refreshingDiscovery}
                        color="primary"
                    />
                    <ActionButton
                        icon={TrendingUp}
                        title="Update Personal"
                        description="Recalculate user recommendations"
                        onClick={handleRefreshPersonal}
                        loading={refreshingPersonal}
                        color="purple"
                    />
                    <ActionButton
                        icon={Database}
                        title="Sync Navidrome"
                        description="Trigger library sync manually"
                        onClick={handleRunNavidromeJob}
                        loading={runningNavidromeJob}
                        color="blue"
                    />
                    <ActionButton
                        icon={Trash2}
                        title="Clear Cache"
                        description="Purge discovery and image cache"
                        onClick={handleClearCache}
                        loading={clearingCache}
                        color="red"
                    />
                </div>
            </SettingsCard>

            {/* Network Configuration */}
            <SettingsCard>
                <SettingsSectionTitle>Network Configuration</SettingsSectionTitle>
                <SettingsToggle
                    checked={settings.proxyTrusted}
                    onChange={(val) => handleUpdate("proxyTrusted", val)}
                    label="Behind Reverse Proxy"
                    description="Enable if Aurral is behind Nginx, Apache, Cloudflare, etc."
                />
            </SettingsCard>

            {/* Scheduler */}
            <SettingsCard>
                <SettingsSectionTitle>Scheduler & Jobs</SettingsSectionTitle>

                <SettingsRow className="mb-6">
                    <div>
                        <h5 className="font-bold text-gray-900 dark:text-white">Discovery Refresh Interval</h5>
                        <p className="text-xs text-gray-500">How often to fetch new data from external APIs (hours)</p>
                    </div>
                    <input
                        type="number"
                        min="1"
                        max="168"
                        className="w-20 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl py-2 px-3 text-center font-bold outline-none focus:ring-2 focus:ring-primary-500"
                        value={settings.discoveryRefreshInterval || 24}
                        onChange={(e) => handleUpdate("discoveryRefreshInterval", parseInt(e.target.value))}
                    />
                </SettingsRow>

                <JobHistoryTable jobs={['DiscoveryRefresh', 'PersonalDiscovery', 'NavidromeSync']} getLastRun={getLastRun} getJobState={getJobState} />
            </SettingsCard>
        </section>
    );
}

// Helper Components
function StatCard({ icon: Icon, value, label, color }) {
    const colorMap = {
        gray: 'bg-gray-50 dark:bg-gray-800 text-gray-400',
        green: 'bg-green-50 dark:bg-green-900/20 text-green-500',
        yellow: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-500',
        red: 'bg-red-50 dark:bg-red-900/20 text-red-500',
        blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-500',
    };
    const textColorMap = {
        gray: 'text-gray-900 dark:text-white',
        green: 'text-green-600 dark:text-green-400',
        yellow: 'text-yellow-600 dark:text-yellow-400',
        red: 'text-red-600 dark:text-red-400',
        blue: 'text-blue-600 dark:text-blue-400',
    };

    return (
        <div className={`p-4 rounded-2xl text-center ${colorMap[color].split(' ').slice(0, 2).join(' ')}`}>
            <Icon className={`w-5 h-5 mx-auto mb-2 ${colorMap[color].split(' ').slice(2).join(' ')}`} />
            <p className={`text-2xl font-black ${textColorMap[color]}`}>{value}</p>
            <p className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">{label}</p>
        </div>
    );
}

function ActionButton({ icon: Icon, title, description, onClick, loading, color }) {
    const colorMap = {
        primary: 'bg-primary-50 dark:bg-primary-900/10 border-primary-100 dark:border-primary-900/30 hover:bg-primary-100 dark:hover:bg-primary-900/20 text-primary-600',
        purple: 'bg-purple-50 dark:bg-purple-900/10 border-purple-100 dark:border-purple-900/30 hover:bg-purple-100 dark:hover:bg-purple-900/20 text-purple-600',
        blue: 'bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/20 text-blue-600',
        red: 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600',
    };

    return (
        <button
            onClick={onClick}
            disabled={loading}
            className={`p-4 rounded-2xl border text-left transition-all ${colorMap[color]}`}
        >
            <Icon className={`w-5 h-5 mb-2 ${loading ? "animate-spin" : ""}`} />
            <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-1">{title}</h4>
            <p className="text-[10px] text-gray-500">{description}</p>
        </button>
    );
}

function JobHistoryTable({ jobs, getLastRun, getJobState }) {
    const statusColors = {
        running: 'bg-blue-100 text-blue-600',
        completed: 'bg-green-100 text-green-600',
        failed: 'bg-red-100 text-red-600',
        idle: 'bg-gray-100 text-gray-500',
    };

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="text-xs text-gray-400 uppercase border-b border-gray-100 dark:border-gray-800">
                        <th className="py-2 px-4">Job Name</th>
                        <th className="py-2 px-4">Last Run</th>
                        <th className="py-2 px-4">Status</th>
                    </tr>
                </thead>
                <tbody className="text-sm">
                    {jobs.map(job => (
                        <tr key={job} className="border-b border-gray-50 dark:border-gray-800/50 last:border-0">
                            <td className="py-3 px-4 font-medium text-gray-900 dark:text-white">{job}</td>
                            <td className="py-3 px-4 text-gray-500">{getLastRun(job)}</td>
                            <td className="py-3 px-4">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusColors[getJobState(job)] || statusColors.idle}`}>
                                    {getJobState(job)}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
