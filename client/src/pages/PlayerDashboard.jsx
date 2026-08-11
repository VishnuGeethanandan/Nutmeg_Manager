import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import api from '../services/api';

function PlayerDashboard() {
  const { user, logout, playerProfile, hasProfile } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (hasProfile) {
      fetchRequests();
      fetchTournaments();
    }
  }, [hasProfile]);

  const fetchRequests = async () => {
    try {
      const res = await api.get('/captain-requests/me');
      setRequests(res.data.requests || []);
    } catch (err) {
      console.error('Failed to fetch requests', err);
    }
  };

  const fetchTournaments = async () => {
    try {
      const res = await api.get('/tournaments');
      setTournaments(res.data.tournaments || []);
      if (res.data.tournaments?.length > 0) {
        setSelectedTournament(res.data.tournaments[0]._id);
      }
    } catch (err) {
      console.error('Failed to fetch tournaments', err);
    }
  };

  const handleRequestCaptain = async () => {
    if (!selectedTournament) return;
    setErrorMsg('');
    setIsSubmitting(true);
    try {
      await api.post('/captain-requests', { tournamentId: selectedTournament });
      await fetchRequests();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to submit request');
    } finally {
      setIsSubmitting(false);
    }
  };

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

        {/* ── Captain Request Section ── */}
        {hasProfile && (
          <div className="welcome-card" style={{ animation: 'fadeSlideUp 0.6s ease-out', marginTop: 'var(--spacing-xl)' }}>
            <div className="welcome-card-header">
              <div className="welcome-greeting">
                <h2>Captain Requests</h2>
                <p>Apply to become a team captain for an upcoming tournament</p>
              </div>
            </div>

            {errorMsg && (
              <div className="form-alert error" style={{ marginBottom: 'var(--spacing-md)' }}>
                {errorMsg}
              </div>
            )}

            {tournaments.length > 0 ? (
              <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
                <select 
                  className="form-input" 
                  style={{ width: 'auto' }}
                  value={selectedTournament}
                  onChange={(e) => setSelectedTournament(e.target.value)}
                >
                  {tournaments.map(t => (
                    <option key={t._id} value={t._id}>{t.name} ({t.year})</option>
                  ))}
                </select>
                <button 
                  className="btn btn-primary" 
                  style={{ width: 'auto' }}
                  onClick={handleRequestCaptain}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Submitting...' : 'Request to Become Captain'}
                </button>
              </div>
            ) : (
              <p style={{ color: 'var(--color-text-muted)' }}>No tournaments available.</p>
            )}

            {requests.length > 0 && (
              <div style={{ marginTop: 'var(--spacing-lg)' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: 'var(--spacing-sm)' }}>Your Requests</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                  {requests.map(req => (
                    <div key={req._id} className="info-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--spacing-sm) var(--spacing-md)', background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-md)' }}>
                      <div>
                        <strong>{req.tournamentId?.name || 'Tournament'}</strong>
                        <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                          {new Date(req.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div>
                        <span className={`status-badge ${req.status}`}>
                          {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default PlayerDashboard;
