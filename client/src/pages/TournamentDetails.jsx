import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

function TournamentDetails() {
  const { tournamentId } = useParams();
  const navigate = useNavigate();
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const { user } = useAuth();
  
  // Modal states
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form states
  const [matchDate, setMatchDate] = useState('');
  const [team1Goals, setTeam1Goals] = useState(0);
  const [team2Goals, setTeam2Goals] = useState(0);
  const [team1Cards, setTeam1Cards] = useState(0);
  const [team2Cards, setTeam2Cards] = useState(0);
  const [matchStatus, setMatchStatus] = useState('scheduled');

  useEffect(() => {
    fetchDetails();
  }, [tournamentId]);

  const interleavedMatches = useMemo(() => {
    const matches = details?.matches;
    if (!matches || matches.length === 0) return [];
    const matchesA = matches.filter(m => m.group === 'A');
    const matchesB = matches.filter(m => m.group === 'B');
    const interleaved = [];
    const maxLength = Math.max(matchesA.length, matchesB.length);
    for (let i = 0; i < maxLength; i++) {
      if (i < matchesA.length) interleaved.push(matchesA[i]);
      if (i < matchesB.length) interleaved.push(matchesB[i]);
    }
    return interleaved;
  }, [details]);

  const fetchDetails = async () => {
    try {
      const res = await api.get(`/tournaments/${tournamentId}/details`);
      setDetails(res.data.data);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to load tournament details');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSchedule = (match) => {
    setSelectedMatch(match);
    // Format date for datetime-local input (YYYY-MM-DDThh:mm)
    if (match.matchDate) {
      const d = new Date(match.matchDate);
      const tzOffset = d.getTimezoneOffset() * 60000;
      const localISOTime = (new Date(d - tzOffset)).toISOString().slice(0, 16);
      setMatchDate(localISOTime);
    } else {
      setMatchDate('');
    }
    setScheduleModalOpen(true);
  };

  const handleOpenResult = (match) => {
    setSelectedMatch(match);
    setTeam1Goals(match.team1Goals || 0);
    setTeam2Goals(match.team2Goals || 0);
    setTeam1Cards(match.team1Cards || 0);
    setTeam2Cards(match.team2Cards || 0);
    setMatchStatus(match.status || 'scheduled');
    setResultModalOpen(true);
  };

  const handleUpdateSchedule = async () => {
    if (!selectedMatch) return;
    setIsSubmitting(true);
    try {
      await api.put(`/matches/${selectedMatch._id}`, { matchDate });
      setScheduleModalOpen(false);
      fetchDetails();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to update schedule');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateResult = async () => {
    if (!selectedMatch) return;
    setIsSubmitting(true);
    try {
      await api.put(`/matches/${selectedMatch._id}`, {
        team1Goals: Number(team1Goals),
        team2Goals: Number(team2Goals),
        team1Cards: Number(team1Cards),
        team2Cards: Number(team2Cards),
        status: matchStatus,
      });
      setResultModalOpen(false);
      fetchDetails();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to update result');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="layout-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ color: 'var(--color-primary-light)', fontSize: '1.25rem' }}>Loading Tournament Hub...</div>
      </div>
    );
  }

  if (error || !details) {
    return (
      <div className="layout-container" style={{ padding: '2rem' }}>
        <button className="btn btn-ghost" onClick={() => navigate(-1)} style={{ marginBottom: '1rem' }}>← Back</button>
        <div className="form-alert error">{error || 'Tournament not found.'}</div>
      </div>
    );
  }

  const { tournament, groupA, groupB } = details;

  return (
    <div className="layout-container" style={{ padding: '2rem' }}>
      <button className="btn btn-ghost" onClick={() => navigate(-1)} style={{ marginBottom: '1rem' }}>← Back</button>
      
      {/* Header Banner */}
      <div className="welcome-card glass-card" style={{ animation: 'fadeSlideUp 0.5s ease-out', marginBottom: '2rem', textAlign: 'center', background: 'linear-gradient(145deg, rgba(30, 215, 96, 0.1) 0%, rgba(20, 20, 20, 0.4) 100%)', borderColor: 'var(--color-primary-dark)' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', color: 'var(--color-text)' }}>
          {tournament.name} <span style={{ color: 'var(--color-primary-light)' }}>{tournament.year}</span>
        </h1>
        <p style={{ fontSize: '1.1rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '2px' }}>
          Tournament Hub
        </p>
        <div style={{ marginTop: '1rem' }}>
          <span className={`status-badge ${tournament.status}`} style={{ fontSize: '1rem', padding: '0.5rem 1rem' }}>
            {tournament.status.charAt(0).toUpperCase() + tournament.status.slice(1)}
          </span>
        </div>
      </div>

      {/* Group Allocations */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', marginBottom: '2rem' }}>
        {/* Group A */}
        <div className="glass-card" style={{ flex: '1 1 300px', animation: 'fadeSlideUp 0.6s ease-out' }}>
          <h2 style={{ textAlign: 'center', color: 'var(--color-primary-light)', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
            Group A
          </h2>
          {groupA && groupA.length > 0 ? (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {groupA.map((team, index) => (
                <li key={team._id} style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)', marginBottom: '0.5rem', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ color: 'var(--color-text-muted)', fontWeight: 'bold' }}>{index + 1}</span>
                  <span style={{ fontSize: '1.1rem' }}>{team.name}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '1rem' }}>Group A not allocated yet.</p>
          )}
        </div>

        {/* Group B */}
        <div className="glass-card" style={{ flex: '1 1 300px', animation: 'fadeSlideUp 0.7s ease-out' }}>
          <h2 style={{ textAlign: 'center', color: 'var(--color-primary-light)', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
            Group B
          </h2>
          {groupB && groupB.length > 0 ? (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {groupB.map((team, index) => (
                <li key={team._id} style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)', marginBottom: '0.5rem', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ color: 'var(--color-text-muted)', fontWeight: 'bold' }}>{index + 1}</span>
                  <span style={{ fontSize: '1.1rem' }}>{team.name}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '1rem' }}>Group B not allocated yet.</p>
          )}
        </div>
      </div>

      {/* Fixtures Schedule */}
      <div className="glass-card" style={{ animation: 'fadeSlideUp 0.8s ease-out' }}>
        <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          📅 Fixtures Schedule
        </h2>
        
        {interleavedMatches && interleavedMatches.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {interleavedMatches.map(match => (
              <div key={match._id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 'var(--radius-md)', padding: '1rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                
                {/* Match Meta (Group & Time) */}
                <div style={{ flex: '0 0 120px', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>Group {match.group}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    {match.matchDate ? new Date(match.matchDate).toLocaleString() : 'TBD'}
                  </span>
                </div>

                {/* Teams */}
                <div style={{ flex: '1 1 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', fontSize: '1.25rem', fontWeight: 'bold' }}>
                  <div style={{ textAlign: 'right', flex: 1 }}>{match.team1?.name || 'TBD'}</div>
                  <div style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', fontWeight: 'normal', padding: '0 1rem' }}>VS</div>
                  <div style={{ textAlign: 'left', flex: 1 }}>{match.team2?.name || 'TBD'}</div>
                </div>

                {/* Status / Score */}
                <div style={{ flex: '0 0 auto', minWidth: '150px', textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
                  {match.status === 'completed' ? (
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', letterSpacing: '2px', color: 'var(--color-primary-light)' }}>
                      {match.team1Goals} - {match.team2Goals}
                    </div>
                  ) : (
                    <span className="status-badge scheduled">Scheduled</span>
                  )}

                  {user?.role === 'admin' && (
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <button 
                        className="btn btn-primary" 
                        style={{ 
                          padding: '0.25rem 0.5rem', 
                          fontSize: '0.75rem',
                          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(37, 99, 235, 0.4) 100%)',
                          borderColor: 'rgba(59, 130, 246, 0.5)'
                        }} 
                        onClick={() => handleOpenSchedule(match)}
                      >
                        Schedule
                      </button>
                      <button 
                        className="btn btn-primary" 
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} 
                        onClick={() => handleOpenResult(match)}
                      >
                        Result
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
            <p>No fixtures generated yet.</p>
          </div>
        )}
      </div>

      {/* Schedule Modal */}
      {scheduleModalOpen && selectedMatch && (
        <div className="modal-overlay" onClick={() => !isSubmitting && setScheduleModalOpen(false)}>
          <div className="modal-content glass-card" onClick={e => e.stopPropagation()}>
            <h2 style={{ marginBottom: '1rem' }}>Schedule Match</h2>
            <div style={{ marginBottom: '1.5rem', color: 'var(--color-text-muted)' }}>
              {selectedMatch.team1?.name} vs {selectedMatch.team2?.name}
            </div>
            
            <div style={{ marginBottom: '1rem' }}>
              <label className="form-label">Match Date & Time</label>
              <input 
                type="datetime-local" 
                className="form-input"
                value={matchDate}
                onChange={(e) => setMatchDate(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setScheduleModalOpen(false)} disabled={isSubmitting}>Cancel</button>
              <button className="btn btn-primary" onClick={handleUpdateSchedule} disabled={isSubmitting || !matchDate}>
                {isSubmitting ? 'Saving...' : 'Save Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Result Modal */}
      {resultModalOpen && selectedMatch && (
        <div className="modal-overlay" onClick={() => !isSubmitting && setResultModalOpen(false)}>
          <div className="modal-content glass-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <h2 style={{ marginBottom: '1rem' }}>Update Match Result</h2>
            
            <div style={{ display: 'flex', gap: '2rem', marginBottom: '1.5rem' }}>
              {/* Team 1 */}
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>{selectedMatch.team1?.name}</div>
                <div style={{ marginBottom: '0.5rem' }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Goals</label>
                  <input type="number" min="0" className="form-input" style={{ textAlign: 'center' }} value={team1Goals} onChange={(e) => setTeam1Goals(e.target.value)} />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Cards (Y/R)</label>
                  <input type="number" min="0" className="form-input" style={{ textAlign: 'center' }} value={team1Cards} onChange={(e) => setTeam1Cards(e.target.value)} />
                </div>
              </div>

              {/* Team 2 */}
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>{selectedMatch.team2?.name}</div>
                <div style={{ marginBottom: '0.5rem' }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Goals</label>
                  <input type="number" min="0" className="form-input" style={{ textAlign: 'center' }} value={team2Goals} onChange={(e) => setTeam2Goals(e.target.value)} />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Cards (Y/R)</label>
                  <input type="number" min="0" className="form-input" style={{ textAlign: 'center' }} value={team2Cards} onChange={(e) => setTeam2Cards(e.target.value)} />
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Match Status</label>
              <select className="form-input" value={matchStatus} onChange={(e) => setMatchStatus(e.target.value)}>
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setResultModalOpen(false)} disabled={isSubmitting}>Cancel</button>
              <button className="btn btn-primary" onClick={handleUpdateResult} disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Result'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TournamentDetails;
