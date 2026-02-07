import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Lock, User, ArrowRight, ArrowLeft, Mail } from 'lucide-react';
import api from '../utils/api';

// --- Internal Components ---

const AmbientBackground = () => (
  <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
    <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] bg-primary-900/20 rounded-full blur-[120px] animate-pulse-slow"></div>
    <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] bg-gray-900/40 rounded-full blur-[120px] animate-pulse-slow delay-1000"></div>
    <div className="absolute top-[40%] left-[50%] -translate-x-1/2 w-[30vw] h-[30vw] bg-primary-500/5 rounded-full blur-[100px]"></div>
  </div>
);

const LogoHeader = () => (
  <div className="flex flex-col items-center mb-10 text-center">
    <div className="relative group cursor-default">
      <div className="absolute inset-0 bg-primary-500 blur-2xl opacity-10 group-hover:opacity-20 transition-opacity duration-500 rounded-full"></div>
      <div className="w-24 h-24 bg-white/5 backdrop-blur-3xl border border-white/5 rounded-3xl flex items-center justify-center relative shadow-2xl transition-transform duration-500 group-hover:scale-105 group-hover:border-white/10">
        <img src="/arralogo.svg" alt="Aurral Logo" className="w-12 h-12 drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]" />
      </div>
    </div>
    <h1 className="mt-8 text-4xl font-bold tracking-tight text-white drop-shadow-sm">
      Aurral
    </h1>
    <p className="mt-2 text-base text-gray-400 font-medium tracking-normal opacity-90">
      Personal Music Management
    </p>
  </div>
);

const FloatingInput = ({ label, icon: Icon, ...props }) => {
  return (
    <div className="relative group/input">
      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
        <Icon className="h-5 w-5 text-gray-500 group-focus-within/input:text-primary-500 transition-colors" />
      </div>
      <input
        {...props}
        className="block w-full pl-12 pr-4 pt-5 pb-2 bg-white/5 border border-white/5 rounded-xl text-white placeholder-transparent focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 transition-all font-medium peer"
        placeholder={label}
      />
      <label
        className="absolute left-12 top-3.5 text-gray-500 text-xs font-bold uppercase tracking-widest transition-all 
                   peer-placeholder-shown:text-sm peer-placeholder-shown:text-gray-500 peer-placeholder-shown:top-3.5 peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal
                   peer-focus:top-1.5 peer-focus:text-[10px] peer-focus:text-primary-400 peer-focus:uppercase peer-focus:tracking-widest
                   peer-[:not(:placeholder-shown)]:top-1.5 peer-[:not(:placeholder-shown)]:text-[10px] peer-[:not(:placeholder-shown)]:text-gray-400 peer-[:not(:placeholder-shown)]:uppercase peer-[:not(:placeholder-shown)]:tracking-widest pointer-events-none"
      >
        {label}
      </label>
    </div>
  );
};

// --- Main Page Component ---

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, setUser, checkAuthStatus } = useAuth();

  // Auth Config State
  const [oidcEnabled, setOidcEnabled] = useState(() => {
    return localStorage.getItem('auth_idp_enabled') === 'true';
  });
  const [configLoaded, setConfigLoaded] = useState(() => {
    return localStorage.getItem('auth_idp_enabled') !== null;
  });
  const [ssoLoading, setSsoLoading] = useState(false);

  // View State (Toggle between SSO and Password)
  // Default to password if no SSO, or SSO if available
  const [showPasswordForm, setShowPasswordForm] = useState(!oidcEnabled);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check for OIDC token in URL
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    const errorMsg = params.get('error');
    const debugMsg = params.get('debug');

    console.log("🔐 Login Page Mounted");
    console.log("📍 Location:", location.pathname + location.search);
    console.log("❓ Params:", Object.fromEntries(params.entries()));

    if (debugMsg) {
      console.warn("🐛 Server Debug Message:", debugMsg);
      // Optional: Show toast or alert for debug? No, console is what they asked for.
    }

    if (errorMsg) {
      console.error("❌ Login Error Parameter:", errorMsg);
      setError(errorMsg === 'oidc_failed' ? 'SSO Login Failed' : errorMsg);
    }

    if (token) {
      localStorage.setItem('auth_token', token);
      // Use checkAuthStatus to properly update both user and isAuthenticated state
      checkAuthStatus().then(() => {
        navigate('/');
      }).catch(() => setError('Failed to verify token'));
    }

    // Check OIDC config
    api.get('/auth/config').then(res => {
      const enabled = res.data.oidcEnabled;
      setOidcEnabled(enabled);
      localStorage.setItem('auth_idp_enabled', enabled);
      // If we haven't manually toggled, set view based on availability
      if (!showPasswordForm && !enabled) {
        setShowPasswordForm(true);
      }
    }).catch(() => { })
      .finally(() => setConfigLoaded(true));
  }, [location, setUser, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await login(username, password);

    if (result.success) {
      // Redirect handled by AuthContext
    } else {
      setError(result.error || 'Invalid credentials');
    }
    setLoading(false);
  };

  const handleSSOLogin = () => {
    setSsoLoading(true);
    window.location.href = '/api/auth/oidc';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white overflow-hidden relative selection:bg-primary-500/30 font-sans">
      <AmbientBackground />

      <div className="w-full max-w-md p-6 relative z-10 animate-fade-in-up">
        <LogoHeader />

        {/* Glass Card */}
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-b from-white/10 to-transparent rounded-3xl blur opacity-20 group-hover:opacity-30 transition duration-1000"></div>
          <div className="relative backdrop-blur-xl bg-gray-950/50 border border-white/5 rounded-3xl p-8 shadow-2xl ring-1 ring-white/5 min-h-[420px] flex flex-col justify-center">

            {!configLoaded ? (
              /* Loading Skeleton */
              <div className="space-y-8 animate-pulse">
                <div className="text-center space-y-3">
                  <div className="h-6 w-32 bg-white/10 rounded-lg mx-auto"></div>
                  <div className="h-4 w-48 bg-white/5 rounded-lg mx-auto"></div>
                </div>
                <div className="space-y-6">
                  <div className="h-12 w-full bg-white/5 rounded-xl"></div>
                  <div className="h-12 w-full bg-white/5 rounded-xl"></div>
                  <div className="h-12 w-full bg-white/10 rounded-xl mt-8"></div>
                </div>
              </div>
            ) : (
              <div className="animate-in fade-in duration-300">
                {/* Header Text */}
                <div className="mb-8 text-center">
                  <h2 className="text-xl font-bold text-white mb-2">Welcome Back</h2>
                  <p className="text-sm text-gray-400">
                    {oidcEnabled && !showPasswordForm
                      ? "Sign in with your organization"
                      : "Enter your credentials to access your library"}
                  </p>
                </div>

                {/* Main Content Area */}
                <div className="space-y-6">

                  {/* Error Message */}
                  {error && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3 animate-shake">
                      <div className="w-2 h-2 bg-red-500 rounded-full shrink-0"></div>
                      <p className="text-sm text-red-400 font-medium">{error}</p>
                    </div>
                  )}

                  {/* SSO Button (Primary if enabled & password hidden) */}
                  {oidcEnabled && !showPasswordForm && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                      <button
                        type="button"
                        onClick={handleSSOLogin}
                        disabled={ssoLoading}
                        className="w-full group relative flex items-center justify-center gap-2 py-4 bg-white text-gray-900 hover:bg-gray-100 font-bold rounded-xl shadow-lg shadow-white/5 transition-all disabled:opacity-75 disabled:cursor-not-allowed"
                      >
                        {ssoLoading ? (
                          <div className="w-5 h-5 border-2 border-gray-900/30 border-t-gray-900 rounded-full animate-spin"></div>
                        ) : (
                          <>
                            <span>Log in with SSO</span>
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                          </>
                        )}
                      </button>

                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t border-gray-800"></span>
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-gray-950 px-2 text-gray-500">Or</span>
                        </div>
                      </div>

                      <button
                        onClick={() => setShowPasswordForm(true)}
                        className="w-full py-3 text-sm font-bold text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition-all"
                      >
                        Continue with Password
                      </button>
                    </div>
                  )}

                  {/* Password Form */}
                  {showPasswordForm && (
                    <form className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300" onSubmit={handleSubmit}>
                      <FloatingInput
                        label="Username"
                        icon={User}
                        name="username"
                        type="text"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                      />

                      <FloatingInput
                        label="Password"
                        icon={Lock}
                        name="password"
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full group relative flex items-center justify-center gap-2 py-4 bg-primary-600 hover:bg-primary-500 text-white font-bold rounded-xl shadow-lg shadow-black/20 hover:shadow-primary-500/10 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden mt-2"
                      >
                        <div className="relative flex items-center gap-2">
                          {loading ? (
                            <>
                              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                              <span>Signing in...</span>
                            </>
                          ) : (
                            <>
                              <span>Sign In</span>
                              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </>
                          )}
                        </div>
                      </button>

                      {oidcEnabled && (
                        <button
                          type="button"
                          onClick={() => setShowPasswordForm(false)}
                          className="w-full py-2 text-xs font-bold text-gray-500 hover:text-gray-300 transition-colors flex items-center justify-center gap-1"
                        >
                          <ArrowLeft className="w-3 h-3" /> Back to SSO Login
                        </button>
                      )}
                    </form>
                  )}

                </div>
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-gray-600 mt-10 opacity-60 hover:opacity-100 transition-opacity">
          &copy; {new Date().getFullYear()} Aurral Project
        </p>
      </div>
    </div>
  );
};

export default Login;
