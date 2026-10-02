import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import api from '../services/api';

function PlayerDashboard() {
  const { user, logout, playerProfile, activeTeam, hasProfile } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [activeTournament, setActiveTournament] = useState(null);
  const [selectedTournament, setSelectedTournament] = useState('');
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isJoiningTeam, setIsJoiningTeam] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [teamErrorMsg, setTeamErrorMsg] = useState('');
  
  const [showCaptainModal, setShowCaptainModal] = useState(false);
  const [achievementsText, setAchievementsText] = useState('');

  useEffect(() => {
    if (hasProfile) {
      fetchRequests();
      fetchTournaments();
      fetchActiveTournament();
    }
  }, [hasProfile]);

  const fetchActiveTournament = async () => {
    try {
      const res = await api.get('/tournaments/active');
      if (res.data && res.data.data) {
        setActiveTournament(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch active tournament', err);
    }
  };

  useEffect(() => {
    if (selectedTournament) {
      fetchTeams(selectedTournament);
    } else {
      setTeams([]);
    }
  }, [selectedTournament]);

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

  const fetchTeams = async (tId) => {
    try {
      const res = await api.get(`/teams?tournamentId=${tId}`);
      setTeams(res.data.teams || []);
    } catch (err) {
      console.error('Failed to fetch teams', err);
    }
  };

  const handleRequestCaptain = async (tournamentIdParam = null) => {
    const tId = tournamentIdParam || selectedTournament;
    if (!tId) return;
    setErrorMsg('');
    setIsSubmitting(true);
    try {
      await api.post('/captain-requests', { tournamentId: tId, achievements: achievementsText });
      await fetchRequests();
      setShowCaptainModal(false);
      setAchievementsText('');
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to submit request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinTeam = async () => {
    if (!selectedTeam) return;
    setTeamErrorMsg('');
    setIsJoiningTeam(true);
    try {
      await api.post('/players/join-team', { teamId: selectedTeam });
      window.location.reload(); // Quick way to refresh profile context
    } catch (err) {
      setTeamErrorMsg(err.response?.data?.message || 'Failed to join team');
    } finally {
      setIsJoiningTeam(false);
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

  const currentRequestForActive = activeTournament 
    ? requests.find(req => req.tournamentId?._id === activeTournament._id || req.tournamentId === activeTournament._id)
    : null;

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
        
        {hasProfile && activeTournament && (
          <div className="cta-card glass-card" style={{ animation: 'fadeSlideUp 0.5s ease-out', marginBottom: 'var(--spacing-xl)', borderColor: 'var(--color-primary-light)' }}>
            <div className="cta-card-icon">🏆</div>
            <h2 className="cta-card-title">Tournament {activeTournament.name} {activeTournament.year} is {activeTournament.status === 'ongoing' ? 'Ongoing' : 'Upcoming'}!</h2>
            
            <button
              className="btn btn-secondary"
              style={{ width: 'auto', marginBottom: '1rem', marginTop: '1rem' }}
              onClick={() => navigate(`/tournaments/${activeTournament._id}`)}
            >
              View Tournament Hub
            </button>
            
            {!currentRequestForActive && activeTournament.status === 'upcoming' && (
              <>
                <p className="cta-card-description">
                  Represent your department! You can request to be the team captain for the upcoming tournament.
                </p>
                {errorMsg && <div className="form-alert error" style={{ marginBottom: '1rem' }}>{errorMsg}</div>}
                <button
                  className="btn btn-primary"
                  style={{ width: 'auto', marginTop: 'var(--spacing-md)' }}
                  onClick={() => {
                    setSelectedTournament(upcomingTournament._id);
                    setShowCaptainModal(true);
                  }}
                  disabled={isSubmitting}
                >
                  Request to be Captain for {playerProfile?.departmentName}
                </button>
              </>
            )}

            {currentRequestForActive && currentRequestForActive.status === 'pending' && (
              <p className="cta-card-description" style={{ color: 'var(--color-warning)' }}>
                ⏳ Captaincy Request Pending for {activeTournament.year}
              </p>
            )}

            {currentRequestForActive && currentRequestForActive.status === 'approved' && (
              <>
                <p className="cta-card-description" style={{ color: 'var(--color-success)' }}>
                  ✅ You are the approved Captain for {activeTournament.year}!
                </p>
                <button
                  className="btn btn-primary"
                  style={{ width: 'auto', marginTop: 'var(--spacing-md)' }}
                  onClick={() => navigate('/player/squad', { state: { teamId: currentRequestForActive.teamId } })}
                >
                  Manage Squad
                </button>
              </>
            )}
            
            {currentRequestForActive && currentRequestForActive.status === 'rejected' && (
              <p className="cta-card-description" style={{ color: 'var(--color-error)' }}>
                ❌ Your captaincy request for {activeTournament.year} was rejected.
              </p>
            )}
          </div>
        )}

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
                <div className="info-item-value" style={{ color: activeTeam ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
                  {activeTeam ? (
                    <>
                      {activeTeam.name}
                      {(playerProfile.isCaptain || activeTeam.captainId === playerProfile._id) && (
                        <span style={{ marginLeft: 'var(--spacing-xs)', color: 'var(--color-warning)' }} title="Captain">👑</span>
                      )}
                    </>
                  ) : (
                    'Not assigned'
                  )}
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

        {/* ── Join Team Section ── */}
        {hasProfile && !activeTeam && (
          <div className="welcome-card" style={{ animation: 'fadeSlideUp 0.6s ease-out', marginTop: 'var(--spacing-xl)' }}>
            <div className="welcome-card-header">
              <div className="welcome-greeting">
                <h2>Join a Team</h2>
                <p>Select a team for the upcoming tournament</p>
              </div>
            </div>

            {teamErrorMsg && (
              <div className="form-alert error" style={{ marginBottom: 'var(--spacing-md)' }}>
                {teamErrorMsg}
              </div>
            )}

            {teams.length > 0 ? (
              <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center' }}>
                <select 
                  className="form-input" 
                  style={{ width: 'auto' }}
                  value={selectedTeam}
                  onChange={(e) => setSelectedTeam(e.target.value)}
                >
                  <option value="" disabled>Select a team...</option>
                  {teams.map(team => (
                    <option key={team._id} value={team._id}>{team.name}</option>
                  ))}
                </select>
                <button 
                  className="btn btn-primary" 
                  style={{ width: 'auto' }}
                  onClick={handleJoinTeam}
                  disabled={isJoiningTeam || !selectedTeam}
                >
                  {isJoiningTeam ? 'Joining...' : 'Join Team'}
                </button>
              </div>
            ) : (
              <p style={{ color: 'var(--color-text-muted)' }}>No teams created yet for the selected tournament.</p>
            )}
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
                        {req.status === 'approved' && (
                          <button 
                            className="btn btn-primary" 
                            style={{ padding: '0.25rem 0.5rem', width: 'auto', fontSize: '0.875rem', marginLeft: 'var(--spacing-md)' }}
                            onClick={() => navigate('/player/squad', { state: { teamId: req.teamId } })}
                          >
                            Manage Squad
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        {/* Captain Request Modal */}
        {showCaptainModal && (
          <div className="modal-overlay" onClick={() => !isSubmitting && setShowCaptainModal(false)}>
            <div className="modal-content glass-card" onClick={e => e.stopPropagation()}>
              <h2>Request Captaincy</h2>
              <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-md)' }}>
                Let the admins know why you should be the captain for <strong>{playerProfile?.departmentName}</strong>.
              </p>
              {errorMsg && <div className="form-alert error" style={{ marginBottom: '1rem' }}>{errorMsg}</div>}
              <div style={{ marginBottom: '1rem' }}>
                <label className="form-label">Football Achievements / Message (Optional)</label>
                <textarea 
                  className="form-input" 
                  rows="4" 
                  placeholder="E.g., Played in the university team for 2 years, lead the defense last tournament..."
                  value={achievementsText}
                  onChange={(e) => setAchievementsText(e.target.value)}
                  maxLength={1000}
                ></textarea>
              </div>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost" onClick={() => setShowCaptainModal(false)} disabled={isSubmitting}>Cancel</button>
                <button className="btn btn-primary" onClick={() => handleRequestCaptain()} disabled={isSubmitting}>
                  {isSubmitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default PlayerDashboard;
