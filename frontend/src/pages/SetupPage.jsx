import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { updateAppSettings } from '../utils/api';
import { Shield, Lock, Server, CheckCircle, Database, ArrowRight, User } from 'lucide-react';

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
    const { initSetup, checkAuthStatus } = useAuth();
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
            await checkAuthStatus(); // Refresh status to set needsSetup: false
            navigate('/');
        } catch (err) {
            setError("Failed to save Lidarr settings: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white overflow-hidden relative selection:bg-primary-500/30">
            {/* Premium Ambient Background */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] bg-primary-900/20 rounded-full blur-[120px] animate-pulse-slow"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] bg-gray-900/40 rounded-full blur-[120px] animate-pulse-slow delay-1000"></div>
                <div className="absolute top-[40%] left-[50%] -translate-x-1/2 w-[30vw] h-[30vw] bg-primary-500/5 rounded-full blur-[100px]"></div>
            </div>

            <div className="w-full max-w-lg p-6 relative z-10 animate-fade-in-up">
                {/* Header */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-white/5 backdrop-blur-3xl border border-white/10 rounded-2xl mb-6 shadow-2xl ring-1 ring-white/5 mx-auto">
                        <img src="/arralogo.svg" alt="Aurral Logo" className="w-10 h-10 drop-shadow-md" />
                    </div>
                    <h2 className="text-3xl font-black bg-clip-text text-white drop-shadow-sm">
                        Setup Aurral
                    </h2>
                    <p className="mt-2 text-sm text-gray-400 font-medium tracking-normal">
                        {step === 1 ? "Create your administrator account" : "Connect to your Lidarr instance"}
                    </p>
                </div>

                {/* Glass Card */}
                <div className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-b from-white/10 to-transparent rounded-3xl blur opacity-20 group-hover:opacity-30 transition duration-1000"></div>
                    <div className="relative backdrop-blur-xl bg-gray-950/50 border border-white/5 rounded-3xl p-8 shadow-2xl ring-1 ring-white/5">

                        {/* Stepper */}
                        <div className="mb-8">
                            <div className="flex items-center justify-center relative">
                                {/* Line connecting steps */}
                                <div className="absolute top-1/2 left-1/4 right-1/4 h-0.5 bg-white/10 -translate-y-1/2 z-0"></div>
                                <div
                                    className="absolute top-1/2 left-1/4 h-0.5 bg-primary-500 transition-all duration-500 -translate-y-1/2 z-0"
                                    style={{ width: step === 2 ? '50%' : '0%' }}
                                ></div>

                                <div className="flex justify-between w-full relative z-10">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300 font-bold ${step >= 1
                                            ? 'bg-primary-500 border-primary-500 text-white shadow-[0_0_15px_rgba(var(--primary-500),0.5)] scale-110'
                                            : 'bg-transparent border-white/20 text-gray-500'
                                            }`}>
                                            {step > 1 ? <CheckCircle className="w-5 h-5" /> : '1'}
                                        </div>
                                        <span className={`text-[10px] uppercase tracking-widest font-bold ${step >= 1 ? 'text-primary-400' : 'text-gray-600'}`}>Account</span>
                                    </div>

                                    <div className="flex flex-col items-center gap-3">
                                        <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300 font-bold ${step >= 2
                                            ? 'bg-primary-500 border-primary-500 text-white shadow-[0_0_15px_rgba(var(--primary-500),0.5)] scale-110'
                                            : 'bg-gray-900 border-white/10 text-gray-500'
                                            }`}>
                                            <Server className="w-4 h-4" />
                                        </div>
                                        <span className={`text-[10px] uppercase tracking-widest font-bold ${step >= 2 ? 'text-primary-400' : 'text-gray-600'}`}>Lidarr</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div className="mb-6 bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex gap-3 animate-shake items-center">
                                <Shield className="h-5 w-5 text-red-400 shrink-0" />
                                <p className="text-sm text-red-300 font-medium">{error}</p>
                            </div>
                        )}

                        {step === 1 ? (
                            <form className="space-y-6" onSubmit={handleCreateAdmin}>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Username</label>
                                    <div className="relative group/input">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <User className="h-5 w-5 text-gray-500 group-focus-within/input:text-primary-400 transition-colors" />
                                        </div>
                                        <input
                                            name="username"
                                            type="text"
                                            required
                                            value={formData.username}
                                            onChange={handleInputChange}
                                            className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/5 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 transition-all font-medium"
                                            placeholder="admin"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Password</label>
                                    <div className="relative group/input">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <Lock className="h-5 w-5 text-gray-500 group-focus-within/input:text-primary-400 transition-colors" />
                                        </div>
                                        <input
                                            name="password"
                                            type="password"
                                            required
                                            value={formData.password}
                                            onChange={handleInputChange}
                                            className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/5 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 transition-all font-medium"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Confirm Password</label>
                                    <div className="relative group/input">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <Lock className="h-5 w-5 text-gray-500 group-focus-within/input:text-primary-400 transition-colors" />
                                        </div>
                                        <input
                                            name="confirmPassword"
                                            type="password"
                                            required
                                            value={formData.confirmPassword}
                                            onChange={handleInputChange}
                                            className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/5 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 transition-all font-medium"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full group relative flex items-center justify-center gap-2 py-4 bg-primary-600 hover:bg-primary-500 text-white font-bold rounded-xl shadow-lg shadow-black/20 hover:shadow-primary-500/10 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden mt-6"
                                >
                                    <div className="relative flex items-center gap-2">
                                        {loading ? 'Creating Account...' : (
                                            <>
                                                <span>Continue</span>
                                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                            </>
                                        )}
                                    </div>
                                </button>
                            </form>
                        ) : (
                            <form className="space-y-6" onSubmit={handleConfigureLidarr}>
                                <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-xl flex gap-3 mb-6 items-center">
                                    <CheckCircle className="h-5 w-5 text-green-400 shrink-0" />
                                    <p className="text-sm text-green-300 font-medium">Account created successfully!</p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Lidarr URL</label>
                                    <div className="relative group/input">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <Server className="h-5 w-5 text-gray-500 group-focus-within/input:text-primary-400 transition-colors" />
                                        </div>
                                        <input
                                            name="lidarrUrl"
                                            type="url"
                                            required
                                            value={formData.lidarrUrl}
                                            onChange={handleInputChange}
                                            className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/5 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 transition-all font-medium"
                                            placeholder="http://localhost:8686"
                                        />
                                    </div>
                                    <p className="text-[10px] text-gray-500 ml-1">Include http:// or https://</p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Lidarr API Key</label>
                                    <div className="relative group/input">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <Database className="h-5 w-5 text-gray-500 group-focus-within/input:text-primary-400 transition-colors" />
                                        </div>
                                        <input
                                            name="lidarrApiKey"
                                            type="text"
                                            required
                                            value={formData.lidarrApiKey}
                                            onChange={handleInputChange}
                                            className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/5 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 transition-all font-mono text-sm"
                                            placeholder="Your 32-character API key"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full group relative flex items-center justify-center gap-2 py-4 bg-primary-600 hover:bg-primary-500 text-white font-bold rounded-xl shadow-lg shadow-black/20 hover:shadow-primary-500/10 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden mt-6"
                                >
                                    <div className="relative z-10">{loading ? 'Saving Settings...' : 'Finish Setup & Enter Aurral'}</div>
                                </button>
                            </form>
                        )}
                    </div>
                </div>

                <p className="text-center text-xs text-gray-600 mt-10 hover:text-gray-400 transition-colors">
                    Need help? Check the <a href="https://github.com/YourRepo/Aurral" className="text-primary-500 hover:text-primary-400 hover:underline">documentation</a>
                </p>
            </div>
        </div>
    );
}
