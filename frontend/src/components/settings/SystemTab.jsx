import React, { useState } from 'react';
import { Database, RefreshCw, Trash2, TrendingUp } from 'lucide-react';
import api, { checkHealth, runNavidromeJob, getJobStatus } from '../../utils/api';
import { useToast } from '../../contexts/ToastContext';

export default function SystemTab({ settings, handleUpdate, jobs, setJobs, setHealth }) {
    const { showSuccess, showError, showInfo } = useToast();
    const [refreshingDiscovery, setRefreshingDiscovery] = useState(false);
    const [refreshingPersonal, setRefreshingPersonal] = useState(false);
    const [clearingCache, setClearingCache] = useState(false);
    const [runningNavidromeJob, setRunningNavidromeJob] = useState(false);

    // Handlers (Moved from SettingsPage)
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

    const handleRunNavidromeJob = async () => {
        setRunningNavidromeJob(true);
        try {
            await runNavidromeJob();
            showSuccess("Navidrome refresh job started in background");
            setTimeout(async () => {
                const jobsData = await getJobStatus();
                setJobs(jobsData);
            }, 1000);
        } catch (err) {
            showError("Failed to start job");
        } finally {
            setRunningNavidromeJob(false);
        }
    }

    const getLastRun = (jobName) => {
        const job = jobs.filter(j => j.name === jobName)
            .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt))[0];
        if (!job) return "Never run";

        const date = new Date(job.completedAt || job.startedAt);
        return date.toLocaleString();
    };

    const getJobState = (jobName) => {
        const job = jobs.filter(j => j.name === jobName)
            .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt))[0];
        return job?.status || 'idle';
    }


    return (
        <section className="space-y-6">
            {/* System Actions */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-8 shadow-sm">
                <h3 className="text-lg font-black text-gray-900 dark:text-white mb-6">System Maintenance</h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <button
                        onClick={handleRefreshDiscovery}
                        disabled={refreshingDiscovery}
                        className="p-4 rounded-2xl bg-primary-50 dark:bg-primary-900/10 border border-primary-100 dark:border-primary-900/30 text-left hover:bg-primary-100 dark:hover:bg-primary-900/20 transition-all group"
                    >
                        <RefreshCw className={`w-6 h-6 text-primary-600 mb-3 ${refreshingDiscovery ? "animate-spin" : ""}`} />
                        <h4 className="font-bold text-gray-900 dark:text-white mb-1">Refresh Discovery</h4>
                        <p className="text-xs text-gray-500">Force update recommendations and trending data.</p>
                    </button>

                    <button
                        onClick={handleRefreshPersonal}
                        disabled={refreshingPersonal}
                        className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-900/30 text-left hover:bg-purple-100 dark:hover:bg-purple-900/20 transition-all"
                    >
                        <TrendingUp className={`w-6 h-6 text-purple-600 mb-3 ${refreshingPersonal ? "animate-spin" : ""}`} />
                        <h4 className="font-bold text-gray-900 dark:text-white mb-1">Update Personal Stats</h4>
                        <p className="text-xs text-gray-500">Recalculate user specific recommendations.</p>
                    </button>

                    <button
                        onClick={handleClearCache}
                        disabled={clearingCache}
                        className="p-4 rounded-2xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 text-left hover:bg-red-100 dark:hover:bg-red-900/20 transition-all"
                    >
                        <Trash2 className="w-6 h-6 text-red-600 mb-3" />
                        <h4 className="font-bold text-gray-900 dark:text-white mb-1">Clear Cache</h4>
                        <p className="text-xs text-gray-500">Purge discovery data and cached images.</p>
                    </button>

                    <button
                        onClick={handleRunNavidromeJob}
                        disabled={runningNavidromeJob}
                        className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 text-left hover:bg-blue-100 dark:hover:bg-blue-900/20 transition-all"
                    >
                        <Database className={`w-6 h-6 text-blue-600 mb-3 ${runningNavidromeJob ? "animate-spin" : ""}`} />
                        <h4 className="font-bold text-gray-900 dark:text-white mb-1">Sync Navidrome</h4>
                        <p className="text-xs text-gray-500">Manually trigger Navidrome library sync.</p>
                    </button>
                </div>
            </div>

            {/* Scheduler */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-8 shadow-sm">
                <h3 className="text-lg font-black text-gray-900 dark:text-white mb-6">Scheduler & Jobs</h3>

                <div className="space-y-4 mb-8">
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                        <div>
                            <h5 className="font-bold text-gray-900 dark:text-white">Discovery Refresh Interval</h5>
                            <p className="text-xs text-gray-500">How often to fetch new data from external APIs (hours).</p>
                        </div>
                        <input
                            type="number"
                            min="1"
                            max="168"
                            className="w-20 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl py-2 px-3 text-center font-bold outline-none focus:ring-2 focus:ring-primary-500"
                            value={settings.discoveryRefreshInterval || 24}
                            onChange={(e) => handleUpdate("discoveryRefreshInterval", parseInt(e.target.value))}
                        />
                    </div>
                </div>

                <div className="space-y-4">
                    <h5 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest pl-1 mb-2">Job History</h5>
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
                                {['DiscoveryRefresh', 'PersonalDiscovery', 'NavidromeSync'].map(job => (
                                    <tr key={job} className="border-b border-gray-50 dark:border-gray-800/50 last:border-0">
                                        <td className="py-3 px-4 font-medium text-gray-900 dark:text-white">{job}</td>
                                        <td className="py-3 px-4 text-gray-500">{getLastRun(job)}</td>
                                        <td className="py-3 px-4">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${getJobState(job) === 'running' ? 'bg-blue-100 text-blue-600' :
                                                    getJobState(job) === 'completed' ? 'bg-green-100 text-green-600' :
                                                        getJobState(job) === 'failed' ? 'bg-red-100 text-red-600' :
                                                            'bg-gray-100 text-gray-500'
                                                }`}>
                                                {getJobState(job)}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </section>
    );
}
