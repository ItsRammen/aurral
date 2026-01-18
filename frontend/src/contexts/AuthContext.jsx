import React, { createContext, useContext, useState, useEffect } from 'react';
import { checkHealth, verifyCredentials } from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuthStatus = async () => {
    try {
      // First check if auth is required by backend
      const healthData = await checkHealth();
      const isRequired = healthData.authRequired;
      const authUser = healthData.authUser || 'admin';
      setAuthRequired(isRequired);
      
      // Store the expected username if we have one
      if (isRequired) {
         localStorage.setItem('auth_user', authUser);
      }

      if (!isRequired) {
        setIsAuthenticated(true);
        setIsLoading(false);
        return;
      }

      // If required, check if we have a valid stored password
      const storedPassword = localStorage.getItem('auth_password');
      const storedUser = localStorage.getItem('auth_user') || 'admin';

      if (storedPassword) {
        // Verify credentials with backend
        try {
           const isValid = await verifyCredentials(storedPassword, storedUser);
           setIsAuthenticated(isValid);
           if (!isValid) {
             // If validation fails, clear the invalid credentials
             localStorage.removeItem('auth_password');
           }
        } catch (e) {
           console.error("Credential verification failed", e);
           // On network error, we can't confirm, but usually we'd assume not authenticated
           // or keep the previous state if we had one. But here we are initializing.
        }
      } else {
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error("Auth check failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const login = async (password, username = 'admin') => {
    if (!password) return false;
    
    try {
      // Actually verify with backend before setting state
      const isValid = await verifyCredentials(password, username);
      if (isValid) {
        localStorage.setItem('auth_password', password);
        localStorage.setItem('auth_user', username);
        setIsAuthenticated(true);
        window.location.reload(); 
        return true;
      }
      return false;
    } catch (e) {
      console.error("Login failed:", e);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_password');
    localStorage.removeItem('auth_user');
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, login, logout, authRequired }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
