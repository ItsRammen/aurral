import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Lock, User } from 'lucide-react';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await login(username, password);

    if (result.success) {
      // Redirect handled by AuthContext or state change in App.jsx
    } else {
      setError(result.error || 'Invalid credentials');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-500/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary-700/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="max-w-md w-full space-y-8 relative z-10">
        <div className="flex flex-col items-center">
          <div className="w-20 h-20 bg-primary-100 dark:bg-primary-900/30 rounded-3xl flex items-center justify-center mb-6 shadow-sm border border-primary-200 dark:border-primary-800/50 transform rotate-3 hover:rotate-0 transition-transform duration-300 overflow-hidden">
            <img src="/arralogo.svg" alt="Aurral Logo" className="w-12 h-12" />
          </div>
          <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">
            AURRAL
          </h1>
          <p className="mt-3 text-gray-600 dark:text-gray-400 font-medium">
            Personal Music Management
          </p>
        </div>

        <div className="card shadow-xl border-gray-200/50 dark:border-gray-800/50 backdrop-blur-sm bg-white/80 dark:bg-gray-900/80 p-8">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Welcome Back
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Sign in to your account to continue
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <label className="label" htmlFor="username">Username</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <User className="h-4.5 w-4.5 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  className="input pl-11"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="label" htmlFor="password">Password</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-4.5 w-4.5 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="input pl-11"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-xl p-3 flex items-center gap-2 text-red-600 dark:text-red-400 text-sm animate-shake">
                <span className="w-1.5 h-1.5 bg-red-600 dark:bg-red-400 rounded-full"></span>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full h-11 text-base font-semibold mt-2"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Signing in...</span>
                </div>
              ) : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-500 dark:text-gray-500 mt-8">
          Aurral &bull; Built for Music Lovers
        </p>
      </div>
    </div>
  );
};

export default Login;
