import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import AdminDashboard from './pages/AdminDashboard';
import PlayerDashboard from './pages/PlayerDashboard';
import PlayerProfileForm from './pages/PlayerProfileForm';
import PlayerProfileView from './pages/PlayerProfileView';
import SquadManager from './pages/SquadManager';
import SpectatorDashboard from './pages/SpectatorDashboard';
import TournamentDetails from './pages/TournamentDetails';

function RootRedirect() {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="auth-layout">
        <div className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const dashboardMap = {
    admin: '/admin/dashboard',
    player: '/player/dashboard',
    spectator: '/spectator/dashboard',
  };

  return <Navigate to={dashboardMap[user.role] || '/login'} replace />;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Protected Routes — Admin */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute roles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Protected Routes — Player */}
          <Route
            path="/player/dashboard"
            element={
              <ProtectedRoute roles={['player']}>
                <PlayerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/player/profile/create"
            element={
              <ProtectedRoute roles={['player']}>
                <PlayerProfileForm isEdit={false} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/player/profile/edit"
            element={
              <ProtectedRoute roles={['player']}>
                <PlayerProfileForm isEdit={true} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/player/squad"
            element={
              <ProtectedRoute roles={['player']}>
                <SquadManager />
              </ProtectedRoute>
            }
          />
          <Route
            path="/player/profile"
            element={
              <ProtectedRoute roles={['player']}>
                <PlayerProfileView />
              </ProtectedRoute>
            }
          />

          {/* Protected Routes — Spectator */}
          <Route
            path="/spectator/dashboard"
            element={
              <ProtectedRoute roles={['spectator']}>
                <SpectatorDashboard />
              </ProtectedRoute>
            }
          />

          {/* Shared Protected Routes */}
          <Route
            path="/tournaments/:tournamentId"
            element={
              <ProtectedRoute roles={['admin', 'player', 'spectator']}>
                <TournamentDetails />
              </ProtectedRoute>
            }
          />

          {/* Root redirect */}
          <Route path="/" element={<RootRedirect />} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
