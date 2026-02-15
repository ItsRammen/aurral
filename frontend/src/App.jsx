import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";
import { useState, useEffect, Suspense, lazy } from "react";
import Layout from "./components/Layout";
import ErrorBoundary from "./components/ErrorBoundary";
import { checkHealth } from "./utils/api";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ToastProvider } from "./contexts/ToastContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { PlayerProvider } from "./contexts/PlayerContext";
import { StreamingProvider } from "./contexts/StreamingContext";
import ReloadPrompt from "./components/ReloadPrompt";
import MiniPlayer from "./components/MiniPlayer";
import { PERMISSIONS } from "./utils/permissions";

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
const IssuesPage = lazy(() => import("./pages/IssuesPage"));

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading, needsSetup } = useAuth();

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

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children || <Outlet />;
};

const PermissionRoute = ({ permission }) => {
  const { hasPermission } = useAuth();
  if (!hasPermission(permission)) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
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

  // Shared layout wrapper for all protected routes
  const ProtectedLayout = () => (
    <ProtectedRoute>
      <Layout isHealthy={isHealthy} lidarrConfigured={lidarrConfigured} lidarrStatus={lidarrStatus}>
        <Outlet />
      </Layout>
    </ProtectedRoute>
  );

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

          {/* All protected routes share Layout */}
          <Route element={<ProtectedLayout />}>
            <Route path="/" element={<DiscoverPage lidarrConfigured={lidarrConfigured} />} />
            <Route path="/search" element={<SearchResultsPage />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/requests" element={<RequestsPage />} />
            <Route path="/artist/:mbid" element={<ArtistDetailsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/issues" element={<IssuesPage />} />

            {/* Admin-only routes */}
            <Route element={<PermissionRoute permission={PERMISSIONS.ADMIN} />}>
              <Route path="/settings" element={<SettingsPage />} />
            </Route>

            {/* User management routes */}
            <Route element={<PermissionRoute permission={PERMISSIONS.MANAGE_USERS} />}>
              <Route path="/users" element={<UsersPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <StreamingProvider>
              <PlayerProvider>
                <AppContent />
                <MiniPlayer />
                <ReloadPrompt />
              </PlayerProvider>
            </StreamingProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
