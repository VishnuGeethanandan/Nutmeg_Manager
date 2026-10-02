import { useState, useEffect } from 'react';
import api from '../services/api';

function AdminTournamentManager() {
  const [tournaments, setTournaments] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  
  const [newTournament, setNewTournament] = useState({
    name: '',
    year: new Date().getFullYear(),
    maxTeams: 8,
    teamNames: []
  });
  const [teamInput, setTeamInput] = useState('');

  const predefinedDepts = ["MCA", "CSE", "ECE", "EEE", "MECH", "CIVIL", "MATHS", "ARCH"];

  const handleAddTeam = (e) => {
    e.preventDefault();
    if (!teamInput.trim()) return;
    const tName = teamInput.trim().toUpperCase();
    if (newTournament.teamNames.includes(tName)) {
      setError('Team already added');
      return;
    }
    if (newTournament.teamNames.length >= 8) {
      setError('Maximum 8 teams allowed');
      return;
    }
    setNewTournament(prev => ({
      ...prev,
      teamNames: [...prev.teamNames, tName]
    }));
    setTeamInput('');
    setError('');
  };

  const handleRemoveTeam = (teamToRemove) => {
    setNewTournament(prev => ({
      ...prev,
      teamNames: prev.teamNames.filter(t => t !== teamToRemove)
    }));
  };

  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    try {
      const res = await api.get('/tournaments');
      setTournaments(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch tournaments', err);
    }
  };

  const handleCreateTournament = async (e) => {
    e.preventDefault();
    if (!newTournament.name || !newTournament.year) return;
    if (newTournament.teamNames.length > 0 && newTournament.teamNames.length < 2) {
      setError('Please add at least 2 teams if you are adding teams.');
      return;
    }
    setError('');
    setIsCreating(true);
    try {
      await api.post('/tournaments', newTournament);
      setNewTournament({ name: '', year: new Date().getFullYear(), maxTeams: 8, teamNames: [] });
      fetchTournaments();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create tournament');
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await api.patch(`/tournaments/${id}/status`, { status });
      fetchTournaments();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update status');
    }
  };

  const handleResetPlayers = async () => {
    if (window.confirm('⚠️ WARNING: This will clear the active team and captain status for ALL players. This should only be done at the start of a new season. Are you sure you want to proceed?')) {
      if (window.confirm('Are you ABSOLUTELY sure? This action cannot be undone.')) {
        try {
          const res = await api.post('/tournaments/reset-players');
          alert(`Success! Reset ${res.data.modifiedCount} players.`);
        } catch (err) {
          alert(err.response?.data?.message || 'Failed to reset players');
        }
      }
    }
  };

  const handleAllocateGroups = async (id) => {
    try {
      const res = await api.post(`/tournaments/${id}/allocate-groups`);
      alert(res.data.message || 'Groups allocated successfully!');
      fetchTournaments();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to allocate groups');
    }
  };

  const handleGenerateFixtures = async (id) => {
    try {
      const res = await api.post(`/tournaments/${id}/generate-fixtures`);
      alert(`Success! Generated ${res.data.count} fixtures.`);
      fetchTournaments();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to generate fixtures');
    }
  };

  return (
    <div className="welcome-card" style={{ animation: 'fadeSlideUp 0.5s ease-out' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h2>Tournament Management</h2>
          <p style={{ color: 'var(--color-text-muted)' }}>Manage seasons, update statuses, and reset player data.</p>
        </div>
        <button className="btn btn-danger" onClick={handleResetPlayers}>
          ⚠️ Reset Players for New Season
        </button>
      </div>

      {/* Create Tournament Form */}
      <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(255,255,255,0.1)', padding: '1.5rem', marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1.5rem', color: 'var(--color-primary-light)', fontSize: '1.25rem' }}>Create New Tournament</h3>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 300px' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Tournament Name</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. Nutmeg Cup 2026" 
              value={newTournament.name}
              onChange={(e) => setNewTournament({...newTournament, name: e.target.value})}
            />
          </div>
          <div style={{ flex: '0 0 120px' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Year</label>
            <input 
              type="number" 
              className="form-input" 
              value={newTournament.year}
              onChange={(e) => setNewTournament({...newTournament, year: e.target.value})}
            />
          </div>
        </div>

        <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(0,0,0,0.1)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--color-text-muted)', fontWeight: '500' }}>Add Teams (Max 8)</label>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <input 
              type="text" 
              className="form-input" 
              style={{ maxWidth: '300px', flex: '1 1 200px' }}
              placeholder="Select or type department..." 
              value={teamInput}
              onChange={(e) => setTeamInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTeam(e)}
              list="deptOptions"
              disabled={newTournament.teamNames.length >= 8}
            />
            <datalist id="deptOptions">
              {predefinedDepts.map(dept => <option key={dept} value={dept} />)}
            </datalist>
            <button className="btn btn-secondary" onClick={handleAddTeam} disabled={newTournament.teamNames.length >= 8 || !teamInput.trim()} type="button">
              Add Team
            </button>
            <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginLeft: '0.5rem' }}>
              Teams Added: <strong style={{ color: newTournament.teamNames.length === 8 ? 'var(--color-primary-light)' : 'inherit' }}>{newTournament.teamNames.length} / 8</strong>
            </span>
          </div>
          
          {newTournament.teamNames.length > 0 && (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1rem' }}>
              {newTournament.teamNames.map(team => (
                <div key={team} style={{ background: 'rgba(255,255,255,0.1)', padding: '0.35rem 0.75rem', borderRadius: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                  {team}
                  <button onClick={() => handleRemoveTeam(team)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '1.2rem', lineHeight: '1', display: 'flex', alignItems: 'center' }} title="Remove Team">&times;</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={handleCreateTournament} disabled={isCreating || !newTournament.name || (newTournament.teamNames.length > 0 && newTournament.teamNames.length < 2)} style={{ padding: '0.75rem 2rem' }}>
            {isCreating ? 'Creating...' : 'Create Tournament'}
          </button>
        </div>
      </div>
      
      {error && <div className="form-alert error" style={{ marginBottom: '1rem' }}>{error}</div>}

      {/* Tournaments List */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left' }}>
              <th style={{ padding: '0.75rem' }}>Name</th>
              <th style={{ padding: '0.75rem' }}>Year</th>
              <th style={{ padding: '0.75rem' }}>Status</th>
              <th style={{ padding: '0.75rem' }}>Max Teams</th>
              <th style={{ padding: '0.75rem' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tournaments.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>No tournaments found.</td>
              </tr>
            ) : (
              tournaments.map((t) => (
                <tr key={t._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '0.75rem', fontWeight: '500' }}>{t.name}</td>
                  <td style={{ padding: '0.75rem' }}>{t.year}</td>
                  <td style={{ padding: '0.75rem' }}>
                    <span className={`status-badge ${t.status}`}>
                      {t.status.charAt(0).toUpperCase() + t.status.slice(1)}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem' }}>{t.maxTeams}</td>
                  <td style={{ padding: '0.75rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <select 
                        className="form-input"
                        style={{ width: 'auto', padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
                        value={t.status}
                        onChange={(e) => handleUpdateStatus(t._id, e.target.value)}
                      >
                        <option value="upcoming">Upcoming</option>
                        <option value="ongoing">Ongoing</option>
                        <option value="completed">Completed</option>
                      </select>
                      
                      <button 
                        className="btn btn-secondary"
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
                        onClick={() => handleAllocateGroups(t._id)}
                      >
                        Allocate Groups
                      </button>
                      
                      <button 
                        className="btn btn-secondary"
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
                        onClick={() => handleGenerateFixtures(t._id)}
                      >
                        Generate Fixtures
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AdminTournamentManager;
