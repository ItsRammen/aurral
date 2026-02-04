import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useState, useEffect, Suspense, lazy } from "react";
import Layout from "./components/Layout";
import { checkHealth } from "./utils/api";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ToastProvider } from "./contexts/ToastContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { PlayerProvider } from "./contexts/PlayerContext";
import ReloadPrompt from "./components/ReloadPrompt";
import MiniPlayer from "./components/MiniPlayer";

// Lazy Load Pages
const SearchResultsPage = lazy(() => import("./pages/SearchResultsPage"));
const DiscoverPage = lazy(() => import("./pages/DiscoverPage"));
const LibraryPage = lazy(() => import("./pages/LibraryPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const ArtistDetailsPage = lazy(() => import("./pages/ArtistDetailsPage"));
const RequestsPage = lazy(() => import("./pages/RequestsPage"));
const UsersPage = lazy(() => import("./pages/UsersPage"));
const SetupPage = lazy(() => import("./pages/SetupPage"));
const Login = lazy(() => import("./pages/Login"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading, needsSetup } = useAuth(); // needsSetup logic needs to be robust

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (needsSetup) {
    return <Navigate to="/setup" replace />;
  }

  // If initial setup is required, redirect to setup page
  // We need a robust way to check "needs setup" globally. 
  // For now, let's assume /setup is public and triggered by backend state or auth failure?
  // Let's implement based on user being null but no token.
  // Actually, let's just protect standard routes.

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const PermissionRoute = ({ children, permission }) => {
  const { hasPermission } = useAuth();
  if (!hasPermission(permission)) {
    return <Navigate to="/" replace />;
  }
  return children;
};

function AppContent() {
  const [isHealthy, setIsHealthy] = useState(null);
  const [lidarrConfigured, setLidarrConfigured] = useState(false);
  const [lidarrStatus, setLidarrStatus] = useState("unknown");
  const { isAuthenticated, needsSetup } = useAuth();

  useEffect(() => {
    const checkApiHealth = async () => {
      try {
        const health = await checkHealth();
        setIsHealthy(health.status === "ok");
        setLidarrConfigured(health.lidarrConfigured);
        setLidarrStatus(health.lidarrStatus || "unknown");
      } catch (error) {
        console.error("Health check failed:", error);
        setIsHealthy(false);
        setLidarrStatus("unknown");
      }
    };

    if (isAuthenticated) {
      checkApiHealth();
      const interval = setInterval(checkApiHealth, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  return (
    <Router>
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      }>
        <Routes>
          <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} />
          <Route path="/setup" element={needsSetup ? <SetupPage /> : <Navigate to="/" replace />} />

          <Route path="/" element={
            <ProtectedRoute>
              <Layout isHealthy={isHealthy} lidarrConfigured={lidarrConfigured} lidarrStatus={lidarrStatus}>
                <DiscoverPage />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/search" element={
            <ProtectedRoute>
              <Layout isHealthy={isHealthy} lidarrConfigured={lidarrConfigured} lidarrStatus={lidarrStatus}>
                <SearchResultsPage />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/library" element={
            <ProtectedRoute>
              <Layout isHealthy={isHealthy} lidarrConfigured={lidarrConfigured} lidarrStatus={lidarrStatus}>
                <LibraryPage />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/requests" element={
            <ProtectedRoute>
              <Layout isHealthy={isHealthy} lidarrConfigured={lidarrConfigured} lidarrStatus={lidarrStatus}>
                <RequestsPage />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/artist/:mbid" element={
            <ProtectedRoute>
              <Layout isHealthy={isHealthy} lidarrConfigured={lidarrConfigured} lidarrStatus={lidarrStatus}>
                <ArtistDetailsPage />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/settings" element={
            <ProtectedRoute>
              <PermissionRoute permission="admin">
                <Layout isHealthy={isHealthy} lidarrConfigured={lidarrConfigured} lidarrStatus={lidarrStatus}>
                  <SettingsPage />
                </Layout>
              </PermissionRoute>
            </ProtectedRoute>
          } />

          <Route path="/users" element={
            <ProtectedRoute>
              <PermissionRoute permission="admin">
                <Layout isHealthy={isHealthy} lidarrConfigured={lidarrConfigured} lidarrStatus={lidarrStatus}>
                  <UsersPage />
                </Layout>
              </PermissionRoute>
            </ProtectedRoute>
          } />

          <Route path="/profile" element={
            <ProtectedRoute>
              <Layout isHealthy={isHealthy} lidarrConfigured={lidarrConfigured} lidarrStatus={lidarrStatus}>
                <ProfilePage />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <PlayerProvider>
            <AppContent />
            <MiniPlayer />
            <ReloadPrompt />
          </PlayerProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
