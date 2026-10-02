import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import api from '../services/api';

function SpectatorDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [upcomingTournament, setUpcomingTournament] = useState(null);

  useEffect(() => {
    fetchUpcomingTournament();
  }, []);

  const fetchUpcomingTournament = async () => {
    try {
      const res = await api.get('/tournaments/upcoming');
      if (res.data && res.data.data) {
        setUpcomingTournament(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch upcoming tournament', err);
    }
  };

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
            👀 Player statistics, match events, and standings will appear here in future modules.
          </div>
        </div>

        {upcomingTournament && (
          <div className="cta-card glass-card" style={{ animation: 'fadeSlideUp 0.6s ease-out', marginTop: 'var(--spacing-xl)', borderColor: 'var(--color-primary-light)' }}>
            <div className="cta-card-icon">🏆</div>
            <h2 className="cta-card-title">Tournament {upcomingTournament.name} {upcomingTournament.year} is Upcoming!</h2>
            <p className="cta-card-description">
              View the allocated groups and the match fixture schedule!
            </p>
            
            <button
              className="btn btn-primary"
              style={{ width: 'auto', marginTop: '1rem' }}
              onClick={() => navigate(`/tournaments/${upcomingTournament._id}`)}
            >
              View Tournament Hub
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default SpectatorDashboard;
