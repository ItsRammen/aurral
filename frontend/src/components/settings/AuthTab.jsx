import React, { useState } from 'react';
import { Shield, Check } from 'lucide-react';

export default function AuthTab({ settings, handleUpdate }) {
    const [callbackType, setCallbackType] = useState('exact');

    return (
        <section className="space-y-6">
            <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-8 shadow-sm">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-primary-100 dark:bg-primary-950/30 flex items-center justify-center">
                        <Shield className="w-8 h-8 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-gray-900 dark:text-white">Authentication</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Configure external identity providers (OIDC/OAuth2).</p>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                        <div>
                            <h4 className="font-bold text-gray-900 dark:text-white">Enable OpenID Connect</h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Allow users to log in with an external provider (e.g., Authentik, Authelia).</p>
                        </div>
                        <div className="relative">
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={settings.oidcEnabled || false}
                                    onChange={(e) => handleUpdate("oidcEnabled", e.target.checked)}
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none dark:bg-gray-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                            </label>
                        </div>
                    </div>

                    {settings.oidcEnabled && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2">
                            <div className="md:col-span-2 space-y-2">
                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest pl-1">Issuer URL</label>
                                <input
                                    type="url"
                                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl py-3 px-4 outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm"
                                    value={settings.oidcIssuerUrl || ""}
                                    onChange={(e) => handleUpdate("oidcIssuerUrl", e.target.value)}
                                    placeholder="https://auth.example.com/application/o/aurral/"
                                />
                                <p className="text-[10px] text-gray-400 dark:text-gray-500 px-1">Base URL of your IdP application.</p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest pl-1">Client ID</label>
                                <input
                                    type="text"
                                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl py-3 px-4 outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm"
                                    value={settings.oidcClientId || ""}
                                    onChange={(e) => handleUpdate("oidcClientId", e.target.value)}
                                    placeholder="aurral-client-id"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest pl-1">Client Secret</label>
                                <input
                                    type="password"
                                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl py-3 px-4 outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm"
                                    value={settings.oidcClientSecret || ""}
                                    onChange={(e) => handleUpdate("oidcClientSecret", e.target.value)}
                                    placeholder="••••••••••••••••"
                                />
                            </div>

                            <div className="md:col-span-2 space-y-2 pt-4 border-t border-gray-100 dark:border-gray-800">
                                <h5 className="font-bold text-sm text-gray-900 dark:text-white">Advanced Overrides (Optional)</h5>
                                <p className="text-xs text-gray-500 mb-4">Only set these if auto-discovery fails or you need custom endpoints.</p>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Auth URL</label>
                                        <input
                                            type="text"
                                            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl py-2 px-3 text-xs outline-none focus:ring-1 focus:ring-primary-500/20 focus:border-primary-500"
                                            value={settings.oidcAuthorizationUrl || ""}
                                            onChange={(e) => handleUpdate("oidcAuthorizationUrl", e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Token URL</label>
                                        <input
                                            type="text"
                                            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl py-2 px-3 text-xs outline-none focus:ring-1 focus:ring-primary-500/20 focus:border-primary-500"
                                            value={settings.oidcTokenUrl || ""}
                                            onChange={(e) => handleUpdate("oidcTokenUrl", e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">User Info URL</label>
                                        <input
                                            type="text"
                                            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl py-2 px-3 text-xs outline-none focus:ring-1 focus:ring-primary-500/20 focus:border-primary-500"
                                            value={settings.oidcUserInfoUrl || ""}
                                            onChange={(e) => handleUpdate("oidcUserInfoUrl", e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Callback URL (Read Only)</label>
                                            <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
                                                <button
                                                    onClick={() => setCallbackType('exact')}
                                                    className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all ${callbackType === 'exact' ? 'bg-white dark:bg-gray-700 text-primary-500 shadow-sm' : 'text-gray-400 hover:text-gray-300'}`}
                                                >
                                                    Exact
                                                </button>
                                                <button
                                                    onClick={() => setCallbackType('regex')}
                                                    className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all ${callbackType === 'regex' ? 'bg-white dark:bg-gray-700 text-primary-500 shadow-sm' : 'text-gray-400 hover:text-gray-300'}`}
                                                >
                                                    Regex
                                                </button>
                                            </div>
                                        </div>
                                        <input
                                            type="text"
                                            disabled
                                            className="w-full bg-gray-100 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl py-2 px-3 text-xs text-gray-500 cursor-not-allowed font-mono"
                                            value={callbackType === 'exact'
                                                ? `${window.location.protocol}//${window.location.hostname}:3001/api/auth/oidc/callback`
                                                : `^http://.*:3001/api/auth/oidc/callback$`
                                            }
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

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
                                        handleUpdate("defaultPermissions", updated);
                                    }}
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none dark:bg-gray-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                            </div>
                        </label>
                    ))}
                </div>
            </div>
        </section>
    );
}
