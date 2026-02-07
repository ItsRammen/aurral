import React from 'react';

export default function GeneralTab({ settings, handleUpdate }) {
    return (
        <section className="space-y-6">
            <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-8 shadow-sm space-y-8">
                <div className="space-y-6">
                    <h3 className="text-lg font-black text-gray-900 dark:text-white mb-4">Application Settings</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest pl-1">Application Title</label>
                            <input
                                type="text"
                                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl py-3 px-4 outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm"
                                value={settings.appName || ""}
                                onChange={(e) => handleUpdate("appName", e.target.value)}
                                placeholder="Aurral"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest pl-1">Application URL</label>
                            <input
                                type="text"
                                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl py-3 px-4 outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm"
                                value={settings.appUrl || ""}
                                onChange={(e) => handleUpdate("appUrl", e.target.value)}
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
                                onChange={(e) => handleUpdate("lastfmApiKey", e.target.value)}
                                placeholder="Optional"
                            />
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 italic px-1">Used for fetching artist metadata and images</p>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest pl-1">Contact Email</label>
                            <input
                                type="email"
                                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl py-3 px-4 outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm"
                                value={settings.contactEmail || ""}
                                onChange={(e) => handleUpdate("contactEmail", e.target.value)}
                                placeholder="user@example.com"
                            />
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 italic px-1">Used for MusicBrainz identification</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-gray-100 dark:border-gray-800">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest pl-1">Version</label>
                            <div className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl py-3 px-4 text-sm text-gray-500 dark:text-gray-400 font-mono">
                                v{__APP_VERSION__}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
