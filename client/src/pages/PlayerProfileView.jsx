import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function PlayerProfileView() {
  const navigate = useNavigate();
  const { user, playerProfile, activeTeam, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  // If no profile, redirect to create
  if (!playerProfile) {
    return (
      <div className="dashboard-layout">
        <header className="dashboard-header">
          <div className="dashboard-header-brand">
            <div className="brand-icon-sm">⚽</div>
            <h1>Nutmeg Manager</h1>
          </div>
          <div className="dashboard-header-actions">
            <button className="btn btn-ghost" onClick={() => navigate('/player/dashboard')}>
              ← Dashboard
            </button>
          </div>
        </header>
        <main className="dashboard-content">
          <div className="glass-card" style={{ textAlign: 'center', padding: 'var(--spacing-2xl)' }}>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-lg)' }}>
              You haven&apos;t created your profile yet.
            </p>
            <button
              className="btn btn-primary"
              style={{ width: 'auto' }}
              onClick={() => navigate('/player/profile/create')}
            >
              Complete Your Profile
            </button>
          </div>
        </main>
      </div>
    );
  }

  const photoUrl = playerProfile.photo
    ? `http://localhost:5000${playerProfile.photo}`
    : null;

  const positionEmoji = {
    Goalkeeper: '🧤',
    Defender: '🛡️',
    Midfielder: '⚙️',
    Forward: '⚡',
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
          <span className="role-badge player">🏃 Player</span>
          <button className="btn btn-ghost" onClick={() => navigate('/player/dashboard')}>
            ← Dashboard
          </button>
          <button className="btn btn-danger" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="dashboard-content">
        <div className="profile-view-card glass-card" style={{ animation: 'fadeSlideUp 0.5s ease-out' }}>
          {/* Profile Header */}
          <div className="profile-header">
            <div className="profile-photo-wrapper">
              {photoUrl ? (
                <img src={photoUrl} alt={playerProfile.name} className="profile-photo" />
              ) : (
                <div className="profile-photo-fallback">
                  {playerProfile.name?.charAt(0)?.toUpperCase() || 'P'}
                </div>
              )}
              <div className="profile-jersey-badge">{playerProfile.jerseyNumber}</div>
            </div>
            <div className="profile-header-info">
              <h2 className="profile-name">{playerProfile.name}</h2>
              <div className="profile-tags">
                <span className="profile-tag position">
                  {positionEmoji[playerProfile.position] || '⚽'} {playerProfile.position}
                </span>
                <span className="profile-tag department">
                  🎓 {playerProfile.departmentName}
                </span>
              </div>
            </div>
          </div>

          {/* Profile Details Grid */}
          <div className="profile-info-grid">
            <div className="info-item">
              <div className="info-item-label">Admission Number</div>
              <div className="info-item-value">{playerProfile.admissionNumber}</div>
            </div>
            <div className="info-item">
              <div className="info-item-label">Department</div>
              <div className="info-item-value">{playerProfile.departmentName}</div>
            </div>
            <div className="info-item">
              <div className="info-item-label">Position</div>
              <div className="info-item-value">{playerProfile.position}</div>
            </div>
            <div className="info-item">
              <div className="info-item-label">Jersey Number</div>
              <div className="info-item-value">#{playerProfile.jerseyNumber}</div>
            </div>
            <div className="info-item">
              <div className="info-item-label">Phone Number</div>
              <div className="info-item-value">
                {playerProfile.phoneNumber || '—'}
              </div>
            </div>
            <div className="info-item">
              <div className="info-item-label">Email</div>
              <div className="info-item-value">{user?.email}</div>
            </div>
          </div>

          {/* Team Status */}
          <div className="profile-team-status">
            <div className="info-item" style={{ textAlign: 'center' }}>
              <div className="info-item-label">Team Status</div>
              <div className="info-item-value" style={{ color: activeTeam ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
                {activeTeam ? (
                  <>
                    ✅ Assigned to: <strong>{activeTeam.name}</strong>
                    {(playerProfile.isCaptain || activeTeam.captainId === playerProfile._id) && (
                      <span style={{ marginLeft: 'var(--spacing-xs)', color: 'var(--color-warning)' }} title="Captain">👑 (Captain)</span>
                    )}
                  </>
                ) : (
                  '⏳ Not assigned to a team yet'
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="profile-actions">
            <button
              className="btn btn-primary"
              style={{ width: 'auto' }}
              onClick={() => navigate('/player/profile/edit')}
            >
              ✏️ Edit Profile
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default PlayerProfileView;
