import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { updateAppSettings } from '../utils/api';
import { Shield, Lock, Server, CheckCircle, Database, ArrowRight } from 'lucide-react';

export default function SetupPage() {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        confirmPassword: '',
        lidarrUrl: 'http://localhost:8686',
        lidarrApiKey: ''
    });
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const { initSetup } = useAuth();
    const navigate = useNavigate();

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleCreateAdmin = async (e) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        setLoading(true);
        setError(null);

        const result = await initSetup(formData.username, formData.password);

        if (result.success) {
            setStep(2);
        } else {
            setError(result.error);
        }
        setLoading(false);
    };

    const handleConfigureLidarr = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await updateAppSettings({
                lidarrUrl: formData.lidarrUrl,
                lidarrApiKey: formData.lidarrApiKey
            });
            navigate('/');
        } catch (err) {
            setError("Failed to save Lidarr settings: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-500/10 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary-700/10 rounded-full blur-[100px] pointer-events-none"></div>

            <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center mb-10">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-2xl mb-4 border border-primary-200 dark:border-primary-800/50 overflow-hidden">
                    <img src="/arralogo.svg" alt="Aurral Logo" className="w-10 h-10" />
                </div>
                <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                    Setup Aurral
                </h2>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 font-medium">
                    {step === 1 ? "Create your administrator account" : "Connect to your Lidarr instance"}
                </p>
            </div>

            <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
                <div className="card shadow-xl border-gray-200/50 dark:border-gray-800/50 backdrop-blur-sm bg-white/80 dark:bg-gray-900/80 py-8 px-6 sm:px-10">

                    {/* Stepper */}
                    <div className="mb-10">
                        <div className="flex items-center justify-center relative">
                            {/* Line connecting steps */}
                            <div className="absolute top-1/2 left-1/4 right-1/4 h-0.5 bg-gray-200 dark:bg-gray-800 -translate-y-1/2 z-0"></div>
                            <div
                                className="absolute top-1/2 left-1/4 h-0.5 bg-primary-500 transition-all duration-500 -translate-y-1/2 z-0"
                                style={{ width: step === 2 ? '50%' : '0%' }}
                            ></div>

                            <div className="flex justify-between w-full relative z-10">
                                <div className="flex flex-col items-center gap-2">
                                    <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300 ${step >= 1 ? 'bg-primary-500 border-primary-500 text-white shadow-lg shadow-primary-500/20' : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-400'}`}>
                                        {step > 1 ? <CheckCircle className="w-6 h-6" /> : <Shield className="w-5 h-5" />}
                                    </div>
                                    <span className={`text-[10px] uppercase tracking-wider font-bold ${step >= 1 ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400'}`}>Account</span>
                                </div>

                                <div className="flex flex-col items-center gap-2">
                                    <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300 ${step >= 2 ? 'bg-primary-500 border-primary-500 text-white shadow-lg shadow-primary-500/20' : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-400'}`}>
                                        <Server className="w-5 h-5" />
                                    </div>
                                    <span className={`text-[10px] uppercase tracking-wider font-bold ${step >= 2 ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400'}`}>Lidarr</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 p-4 rounded-xl flex gap-3 animate-shake">
                            <Shield className="h-5 w-5 text-red-500 shrink-0" />
                            <p className="text-sm text-red-700 dark:text-red-400 font-medium">{error}</p>
                        </div>
                    )}

                    {step === 1 ? (
                        <form className="space-y-5" onSubmit={handleCreateAdmin}>
                            <div className="space-y-1.5">
                                <label className="label">Username</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                        <Shield className="h-4.5 w-4.5 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                                    </div>
                                    <input
                                        name="username"
                                        type="text"
                                        required
                                        value={formData.username}
                                        onChange={handleInputChange}
                                        className="input pl-11"
                                        placeholder="admin"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="label">Password</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                        <Lock className="h-4.5 w-4.5 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                                    </div>
                                    <input
                                        name="password"
                                        type="password"
                                        required
                                        value={formData.password}
                                        onChange={handleInputChange}
                                        className="input pl-11"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="label">Confirm Password</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                        <Lock className="h-4.5 w-4.5 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                                    </div>
                                    <input
                                        name="confirmPassword"
                                        type="password"
                                        required
                                        value={formData.confirmPassword}
                                        onChange={handleInputChange}
                                        className="input pl-11"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="btn btn-primary w-full h-11 text-base font-semibold mt-4 group"
                            >
                                {loading ? 'Creating Account...' : (
                                    <div className="flex items-center gap-2">
                                        <span>Continue to System Configuration</span>
                                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                )}
                            </button>
                        </form>
                    ) : (
                        <form className="space-y-5" onSubmit={handleConfigureLidarr}>
                            <div className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900/30 p-4 rounded-xl flex gap-3 mb-6">
                                <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                                <p className="text-sm text-green-700 dark:text-green-400 font-medium">Account created successfully!</p>
                            </div>

                            <div className="space-y-1.5">
                                <label className="label">Lidarr URL</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                        <Server className="h-4.5 w-4.5 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                                    </div>
                                    <input
                                        name="lidarrUrl"
                                        type="url"
                                        required
                                        value={formData.lidarrUrl}
                                        onChange={handleInputChange}
                                        className="input pl-11"
                                        placeholder="http://localhost:8686"
                                    />
                                </div>
                                <p className="text-[10px] text-gray-500 dark:text-gray-500 mt-1 ml-1 font-medium">Include http:// or https://</p>
                            </div>

                            <div className="space-y-1.5">
                                <label className="label">Lidarr API Key</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                        <Database className="h-4.5 w-4.5 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                                    </div>
                                    <input
                                        name="lidarrApiKey"
                                        type="text"
                                        required
                                        value={formData.lidarrApiKey}
                                        onChange={handleInputChange}
                                        className="input pl-11 font-mono text-xs"
                                        placeholder="Your 32-character API key"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="btn btn-primary w-full h-11 text-base font-semibold mt-4"
                            >
                                {loading ? 'Saving Settings...' : 'Finish Setup & Enter Aurral'}
                            </button>
                        </form>
                    )}
                </div>

                <p className="text-center text-xs text-gray-500 dark:text-gray-500 mt-8">
                    Need help? Check the <a href="https://github.com/YourRepo/Aurral" className="text-primary-600 dark:text-primary-400 hover:underline">documentation</a>
                </p>
            </div>
        </div>
    );
}
