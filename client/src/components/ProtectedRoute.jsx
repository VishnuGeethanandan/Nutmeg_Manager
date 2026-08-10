import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * ProtectedRoute — Guards routes based on authentication and role.
 *
 * Props:
 *   children   — Component to render if authorized
 *   roles      — Optional array of allowed roles (e.g., ['admin'])
 */
function ProtectedRoute({ children, roles }) {
  const { user, loading, isAuthenticated } = useAuth();

  // Show nothing while auth state is being determined
  if (loading) {
    return (
      <div className="auth-layout">
        <div className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    );
  }

  // Not logged in → redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If roles are specified, check the user's role
  if (roles && !roles.includes(user.role)) {
    // Redirect to their own dashboard instead
    const dashboardMap = {
      admin: '/admin/dashboard',
      player: '/player/dashboard',
      spectator: '/spectator/dashboard',
    };
    return <Navigate to={dashboardMap[user.role] || '/login'} replace />;
  }

  return children;
}

export default ProtectedRoute;
