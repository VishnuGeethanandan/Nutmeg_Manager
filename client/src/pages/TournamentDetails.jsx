import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

function TournamentDetails() {
  const { tournamentId } = useParams();
  const navigate = useNavigate();
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDetails();
  }, [tournamentId]);

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

  const { tournament, groupA, groupB, matches } = details;

  const interleavedMatches = useMemo(() => {
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
  }, [matches]);

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
                <div style={{ flex: '0 0 100px', textAlign: 'right' }}>
                  {match.status === 'completed' ? (
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', letterSpacing: '2px' }}>
                      {match.team1Goals} - {match.team2Goals}
                    </div>
                  ) : (
                    <span className="status-badge scheduled">Scheduled</span>
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
    </div>
  );
}

export default TournamentDetails;
