import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

function SpectatorDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="dashboard-layout">
      {/* Header */}
      <header className="dashboard-header">
        <div className="dashboard-header-brand">
          <div className="brand-icon-sm">⚽</div>
          <h1>Nutmeg Manager</h1>
        </div>
        <div className="dashboard-header-actions">
          <span className="role-badge spectator">👀 Spectator</span>
          <button className="btn btn-danger" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="dashboard-content">
        <div className="welcome-card">
          <div className="welcome-card-header">
            <div className="welcome-avatar spectator">
              {user?.name?.charAt(0)?.toUpperCase() || 'S'}
            </div>
            <div className="welcome-greeting">
              <h2>Welcome, {user?.name || 'Spectator'}</h2>
              <p>You are logged in as a Spectator</p>
            </div>
          </div>

          <div className="welcome-info">
            <div className="info-item">
              <div className="info-item-label">Name</div>
              <div className="info-item-value">{user?.name}</div>
            </div>
            <div className="info-item">
              <div className="info-item-label">Email</div>
              <div className="info-item-value">{user?.email}</div>
            </div>
            <div className="info-item">
              <div className="info-item-label">Role</div>
              <div className="info-item-value" style={{ textTransform: 'capitalize' }}>
                {user?.role}
              </div>
            </div>
          </div>

          <div className="welcome-placeholder">
            👀 Tournament fixtures, results, and standings will appear here in future modules.
          </div>
        </div>
      </main>
    </div>
  );
}

export default SpectatorDashboard;
