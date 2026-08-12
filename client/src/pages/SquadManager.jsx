import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

function SquadManager() {
  const { user, playerProfile, hasProfile } = useAuth();
  const navigate = useNavigate();
  
  const [team, setTeam] = useState(null);
  const [roster, setRoster] = useState([]);
  const [eligiblePlayers, setEligiblePlayers] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  
  // A captain must select a tournament context. For now, assume the latest active one.
  // In a robust implementation, we would pass this or select it. Let's fetch tournaments first.
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState('');

  useEffect(() => {
    if (!hasProfile) {
      navigate('/player/dashboard');
      return;
    }
    fetchTournaments();
  }, [hasProfile, navigate]);

  useEffect(() => {
    if (selectedTournament) {
      fetchSquadData();
    }
  }, [selectedTournament]);

  const fetchTournaments = async () => {
    try {
      const res = await api.get('/tournaments');
      const activeTournaments = res.data.tournaments || [];
      setTournaments(activeTournaments);
      if (activeTournaments.length > 0) {
        setSelectedTournament(activeTournaments[0]._id);
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error('Failed to fetch tournaments', err);
      setErrorMsg('Failed to load tournaments.');
      setLoading(false);
    }
  };

  const fetchSquadData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const teamRes = await api.get(`/squad/my-team?tournamentId=${selectedTournament}`);
      setTeam(teamRes.data.team);
      setRoster(teamRes.data.roster);
      
      const eligibleRes = await api.get(`/squad/eligible-players?tournamentId=${selectedTournament}`);
      setEligiblePlayers(eligibleRes.data.players);
    } catch (err) {
      console.error('Failed to fetch squad data', err);
      if (err.response?.status === 404 || err.response?.status === 403) {
        setErrorMsg('You are not the captain of a team for this tournament.');
      } else {
        setErrorMsg(err.response?.data?.message || 'Failed to load squad data.');
      }
      setTeam(null);
      setRoster([]);
      setEligiblePlayers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPlayer = async (playerId) => {
    try {
      await api.post('/squad/roster', {
        tournamentId: selectedTournament,
        playerId
      });
      // Refresh data
      fetchSquadData();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to add player');
    }
  };

  const handleRemovePlayer = async (playerId) => {
    if (!window.confirm('Are you sure you want to remove this player from the squad?')) return;
    try {
      await api.delete(`/squad/roster/${playerId}?tournamentId=${selectedTournament}`);
      // Refresh data
      fetchSquadData();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to remove player');
    }
  };

  const isSquadFull = roster.length >= 15;
  const isSquadValid = roster.length >= 9 && roster.length <= 15;

  if (loading) {
    return <div className="dashboard-layout"><div className="dashboard-content">Loading...</div></div>;
  }

  return (
    <div className="dashboard-layout">
      {/* Header */}
      <header className="dashboard-header">
        <div className="dashboard-header-brand">
          <div className="brand-icon-sm">⚽</div>
          <h1>Manage Squad</h1>
        </div>
        <div className="dashboard-header-actions">
          <button className="btn btn-ghost" onClick={() => navigate('/player/dashboard')}>
            ← Back to Dashboard
          </button>
        </div>
      </header>

      <main className="dashboard-content">
        <div className="welcome-card" style={{ marginBottom: 'var(--spacing-lg)' }}>
          <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center' }}>
            <label style={{ fontWeight: '500' }}>Select Tournament:</label>
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
          </div>
        </div>

        {errorMsg && (
          <div className="form-alert error" style={{ marginBottom: 'var(--spacing-md)' }}>
            {errorMsg}
          </div>
        )}

        {team && (
          <>
            {/* Team Info */}
            <div className="welcome-card" style={{ animation: 'fadeSlideUp 0.3s ease-out' }}>
              <div className="welcome-card-header">
                <div>
                  <h2 style={{ fontSize: '1.5rem', marginBottom: 'var(--spacing-xs)' }}>{team.name}</h2>
                  <p style={{ color: 'var(--color-text-muted)' }}>Department: {playerProfile.departmentName}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: '600', color: isSquadValid ? 'var(--color-success)' : 'var(--color-warning)' }}>
                    {roster.length} / 15 Players
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                    {roster.length < 9 ? `Need ${9 - roster.length} more` : (isSquadFull ? 'Squad full' : 'Valid squad size')}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-lg)', marginTop: 'var(--spacing-lg)' }}>
              
              {/* Current Roster */}
              <div className="glass-card" style={{ animation: 'fadeSlideUp 0.4s ease-out' }}>
                <h3 style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 'var(--spacing-sm)', marginBottom: 'var(--spacing-md)' }}>
                  Current Squad ({roster.length})
                </h3>
                
                {roster.length === 0 ? (
                  <p style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>No players added yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                    {roster.map(p => {
                      const isCaptain = p._id === team.captainId?._id || p._id === playerProfile._id;
                      return (
                        <div key={p._id} className="info-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: 'var(--spacing-sm) var(--spacing-md)', borderRadius: 'var(--radius-md)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                            <div className="welcome-avatar player" style={{ width: '40px', height: '40px', fontSize: '1rem' }}>
                              {p.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: '500' }}>{p.name} {isCaptain && <span title="Captain">👑</span>}</div>
                              <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>{p.position} · #{p.jerseyNumber}</div>
                            </div>
                          </div>
                          {!isCaptain && (
                            <button 
                              className="btn btn-ghost" 
                              style={{ color: 'var(--color-danger)', padding: '0.25rem 0.5rem', width: 'auto' }}
                              onClick={() => handleRemovePlayer(p._id)}
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Eligible Players */}
              <div className="glass-card" style={{ animation: 'fadeSlideUp 0.5s ease-out' }}>
                <h3 style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 'var(--spacing-sm)', marginBottom: 'var(--spacing-md)' }}>
                  Available Players ({eligiblePlayers.length})
                </h3>
                
                {eligiblePlayers.length === 0 ? (
                  <p style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>No more unassigned players available in your department.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                    {eligiblePlayers.map(p => (
                      <div key={p._id} className="info-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: 'var(--spacing-sm) var(--spacing-md)', borderRadius: 'var(--radius-md)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                          <div className="welcome-avatar player" style={{ width: '40px', height: '40px', fontSize: '1rem' }}>
                            {p.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: '500' }}>{p.name}</div>
                            <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>{p.position} · #{p.jerseyNumber}</div>
                          </div>
                        </div>
                        <button 
                          className="btn btn-primary" 
                          style={{ padding: '0.25rem 0.75rem', width: 'auto', fontSize: '0.875rem' }}
                          onClick={() => handleAddPlayer(p._id)}
                          disabled={isSquadFull}
                        >
                          Add
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default SquadManager;
