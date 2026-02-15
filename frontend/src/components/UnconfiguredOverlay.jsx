import React from 'react';
import { Settings, AlertTriangle, Database } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { PERMISSIONS } from '../utils/permissions';

export default function UnconfiguredOverlay({ type = 'lidarr' }) {
    const navigate = useNavigate();
    const { user } = useAuth();
    const isAdmin = user?.permissions?.includes(PERMISSIONS.ADMIN);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-gray-900/90 backdrop-blur-sm">
            <div className="max-w-md p-8 text-center bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 mx-4">
                <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Database className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
                </div>

                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                    {isAdmin ? "Configuration Required" : "System Maintenance"}
                </h2>

                <p className="text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
                    {isAdmin
                        ? "The music database (Lidarr) is not configured or reachable. Please verify your settings to restore functionality."
                        : "We're currently performing some upgrades to the music database. Please check back soon!"}
                </p>

                {isAdmin ? (
                    <button
                        onClick={() => navigate('/settings')}
                        className="btn btn-primary w-full flex items-center justify-center gap-2"
                    >
                        <Settings className="w-4 h-4" />
                        Go to Settings
                    </button>
                ) : (
                    <div className="flex items-center justify-center gap-2 text-sm text-yellow-600 dark:text-yellow-500 bg-yellow-50 dark:bg-yellow-900/10 py-2 px-4 rounded-lg">
                        <AlertTriangle className="w-4 h-4" />
                        <span>Admin attention required</span>
                    </div>
                )}
            </div>
        </div>
    );
}
