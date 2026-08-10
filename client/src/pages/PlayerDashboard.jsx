import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

function PlayerDashboard() {
  const { user, logout, playerProfile, hasProfile } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const photoUrl = playerProfile?.photo
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
          <button className="btn btn-danger" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="dashboard-content">
        {!hasProfile ? (
          /* ── Profile Not Created CTA ── */
          <div className="cta-card glass-card" style={{ animation: 'fadeSlideUp 0.5s ease-out' }}>
            <div className="cta-card-icon">🏃</div>
            <h2 className="cta-card-title">Complete Your Player Profile</h2>
            <p className="cta-card-description">
              You need to set up your football profile before you can join a team
              and participate in the Nutmeg tournament.
            </p>
            <div className="cta-card-checklist">
              <div className="cta-check-item">📋 Personal information</div>
              <div className="cta-check-item">⚽ Football position &amp; jersey number</div>
              <div className="cta-check-item">📷 Profile photo</div>
            </div>
            <button
              className="btn btn-primary"
              style={{ width: 'auto', marginTop: 'var(--spacing-lg)' }}
              onClick={() => navigate('/player/profile/create')}
            >
              Complete Profile →
            </button>
          </div>
        ) : (
          /* ── Profile Summary ── */
          <div className="welcome-card" style={{ animation: 'fadeSlideUp 0.5s ease-out' }}>
            <div className="welcome-card-header">
              <div className="profile-avatar-wrapper">
                {photoUrl ? (
                  <img src={photoUrl} alt={playerProfile.name} className="dashboard-profile-photo" />
                ) : (
                  <div className="welcome-avatar player">
                    {playerProfile.name?.charAt(0)?.toUpperCase() || 'P'}
                  </div>
                )}
              </div>
              <div className="welcome-greeting">
                <h2>Welcome, {playerProfile.name || user?.name || 'Player'}</h2>
                <p>
                  {positionEmoji[playerProfile.position] || '⚽'}{' '}
                  {playerProfile.position} · #{playerProfile.jerseyNumber} · {playerProfile.departmentName}
                </p>
              </div>
            </div>

            <div className="welcome-info">
              <div className="info-item">
                <div className="info-item-label">Admission No.</div>
                <div className="info-item-value">{playerProfile.admissionNumber}</div>
              </div>
              <div className="info-item">
                <div className="info-item-label">Position</div>
                <div className="info-item-value">{playerProfile.position}</div>
              </div>
              <div className="info-item">
                <div className="info-item-label">Jersey</div>
                <div className="info-item-value">#{playerProfile.jerseyNumber}</div>
              </div>
              <div className="info-item">
                <div className="info-item-label">Team Status</div>
                <div className="info-item-value" style={{ color: 'var(--color-text-muted)' }}>
                  Not assigned
                </div>
              </div>
            </div>

            <div className="profile-actions" style={{ marginTop: 'var(--spacing-xl)' }}>
              <button
                className="btn btn-primary"
                style={{ width: 'auto' }}
                onClick={() => navigate('/player/profile')}
              >
                View Full Profile
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => navigate('/player/profile/edit')}
              >
                ✏️ Edit Profile
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default PlayerDashboard;
