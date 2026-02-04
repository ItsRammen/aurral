import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);

  // Helper to decode JWT without a library
  const parseJwt = (token) => {
    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
      return null;
    }
  };

  const checkAuthStatus = async () => {
    const token = localStorage.getItem('auth_token');

    // Check if setup is needed
    try {
      const health = await api.get('/health');
      if (health.data.needsSetup) {
        setNeedsSetup(true);
      }
    } catch (e) {
      console.error("Health check failed in AuthContext", e);
    }

    if (token) {
      try {
        const response = await api.get('/auth/me');
        setUser(response.data);
        setIsAuthenticated(true);
      } catch (e) {
        console.error("Auth verify failed:", e);
        localStorage.removeItem('auth_token');
        setUser(null);
        setIsAuthenticated(false);
      }
    }

    setIsLoading(false);
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const login = async (username, password) => {
    try {
      const response = await api.post('/auth/login', { username, password });
      const { token, user } = response.data;

      localStorage.setItem('auth_token', token);
      setUser(user);
      setIsAuthenticated(true);
      return { success: true };
    } catch (error) {
      // console.error("Login failed:", error); 
      return {
        success: false,
        error: error.response?.data?.error || "Login failed"
      };
    }
  };

  const initSetup = async (username, password) => {
    try {
      const response = await api.post('/auth/init', { username, password });
      const { token, user } = response.data;

      localStorage.setItem('auth_token', token);
      setUser(user);
      setIsAuthenticated(true);
      setNeedsSetup(false);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || "Setup failed"
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    setUser(null);
    setIsAuthenticated(false);
    window.location.href = '/login';
  };

  const hasPermission = (permission) => {
    if (!user) return false;
    if (user.permissions.includes('admin')) return true;
    return user.permissions.includes(permission);
  };

  return (
    <AuthContext.Provider value={{
      user,
      setUser,
      isAuthenticated,
      isLoading,
      login,
      logout,
      initSetup,
      hasPermission,
      needsSetup
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
