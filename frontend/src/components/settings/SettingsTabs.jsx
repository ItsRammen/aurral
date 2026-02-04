import React from 'react';
import { Settings, Shield, Music, Box, Activity } from 'lucide-react';

export default function SettingsTabs({ activeTab, setActiveTab }) {
    const tabs = [
        { id: 'general', label: 'General', icon: Settings },
        { id: 'music', label: 'Music Services', icon: Music },
        { id: 'auth', label: 'Authentication', icon: Shield },
        // { id: 'services', label: 'Services', icon: Box }, // Merged into Music/Integrations or kept if needed. Let's merge Lidarr into Music (Integrations).
        // Actually, current page distinguished Music (Lidarr? Navidrome?) from Services?
        // Let's stick to the plan: IntegrationsTab handles Lidarr/Navidrome/LastFM.
        // So we call it "Integrations" or "Music Services".
        // Let's call it "Integrations".
        { id: 'system', label: 'System', icon: Activity }
    ];

    return (
        <div className="flex overflow-x-auto no-scrollbar pb-2 mb-6 -mx-4 px-4 sm:mx-0 sm:px-0">
            <div className="flex bg-gray-100 dark:bg-gray-900/50 p-1 rounded-xl">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-all whitespace-nowrap ${activeTab === tab.id
                            ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm"
                            : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5"
                            }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>
        </div>
    );
}
