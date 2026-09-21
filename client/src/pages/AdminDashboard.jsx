import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import api from '../services/api';
import AdminTournamentManager from '../components/AdminTournamentManager';

function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  const [tournaments, setTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState('');

  const [captainRequests, setCaptainRequests] = useState([]);
  const [teams, setTeams] = useState([]);
  
  const [newTeamName, setNewTeamName] = useState('');
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);
  const [teamError, setTeamError] = useState('');

  useEffect(() => {
    fetchTournaments();
    fetchCaptainRequests();
  }, []);

  useEffect(() => {
    if (selectedTournament) {
      fetchTeams(selectedTournament);
    } else {
      setTeams([]);
    }
  }, [selectedTournament]);

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

  const fetchCaptainRequests = async () => {
    try {
      const res = await api.get('/captain-requests');
      setCaptainRequests(res.data.requests || []);
    } catch (err) {
      console.error('Failed to fetch captain requests', err);
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

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const handleApproveRequest = async (id) => {
    try {
      await api.patch(`/captain-requests/${id}/approve`);
      fetchCaptainRequests(); // Refresh
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to approve');
    }
  };

  const handleRejectRequest = async (id) => {
    try {
      await api.patch(`/captain-requests/${id}/reject`);
      fetchCaptainRequests(); // Refresh
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reject');
    }
  };

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (!newTeamName || !selectedTournament) return;
    setTeamError('');
    setIsCreatingTeam(true);
    try {
      await api.post('/teams', { name: newTeamName, tournamentId: selectedTournament });
      setNewTeamName('');
      fetchTeams(selectedTournament);
    } catch (err) {
      setTeamError(err.response?.data?.message || 'Failed to create team');
    } finally {
      setIsCreatingTeam(false);
    }
  };

  const handleAssignCaptain = async (teamId, captainId) => {
    try {
      await api.patch(`/teams/${teamId}`, { captainId: captainId || null });
      fetchTeams(selectedTournament);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to assign captain');
    }
  };

  // Get eligible captains for the selected tournament
  const getEligibleCaptains = () => {
    return captainRequests
      .filter(req => req.status === 'approved' && req.tournamentId?._id === selectedTournament)
      .map(req => req.playerId);
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
          <span className="role-badge admin">🛡️ Admin</span>
          <button className="btn btn-danger" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div style={{ padding: '0 2rem', marginTop: '1rem' }}>
        <div className="tabs">
          <button className={`tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
          <button className={`tab ${activeTab === 'tournaments' ? 'active' : ''}`} onClick={() => setActiveTab('tournaments')}>Tournaments</button>
          <button className={`tab ${activeTab === 'captain_requests' ? 'active' : ''}`} onClick={() => setActiveTab('captain_requests')}>Captain Requests</button>
          <button className={`tab ${activeTab === 'teams' ? 'active' : ''}`} onClick={() => setActiveTab('teams')}>Teams</button>
        </div>
      </div>

      {/* Content */}
      <main className="dashboard-content">
        
        {activeTab === 'overview' && (
          <div className="welcome-card" style={{ animation: 'fadeSlideUp 0.5s ease-out' }}>
            <div className="welcome-card-header">
              <div className="welcome-avatar admin">
                {user?.name?.charAt(0)?.toUpperCase() || 'A'}
              </div>
              <div className="welcome-greeting">
                <h2>Welcome, {user?.name || 'Admin'}</h2>
                <p>You are logged in as an Administrator</p>
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
          </div>
        )}

        {activeTab === 'tournaments' && <AdminTournamentManager />}

        {activeTab === 'captain_requests' && (
          <div className="welcome-card" style={{ animation: 'fadeSlideUp 0.5s ease-out' }}>
            <h2>Captain Requests</h2>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }}>Manage player requests to become team captains.</p>
            
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left' }}>
                    <th style={{ padding: '0.75rem' }}>Player</th>
                    <th style={{ padding: '0.75rem' }}>Dept</th>
                    <th style={{ padding: '0.75rem' }}>Tournament</th>
                    <th style={{ padding: '0.75rem' }}>Status</th>
                    <th style={{ padding: '0.75rem' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {captainRequests.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>No requests found.</td>
                    </tr>
                  ) : (
                    captainRequests.map((req) => (
                      <tr key={req._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '0.75rem' }}>
                          <div>{req.playerId?.name}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{req.playerId?.admissionNumber}</div>
                        </td>
                        <td style={{ padding: '0.75rem' }}>{req.playerId?.departmentName}</td>
                        <td style={{ padding: '0.75rem' }}>{req.tournamentId?.name}</td>
                        <td style={{ padding: '0.75rem' }}>
                           <span className={`status-badge ${req.status}`}>
                            {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          {req.status === 'pending' && (
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button className="btn btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }} onClick={() => handleApproveRequest(req._id)}>Approve</button>
                              <button className="btn btn-danger" style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }} onClick={() => handleRejectRequest(req._id)}>Reject</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'teams' && (
          <div className="welcome-card" style={{ animation: 'fadeSlideUp 0.5s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h2>Team Management</h2>
                <p style={{ color: 'var(--color-text-muted)' }}>Create teams and assign captains.</p>
              </div>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <select 
                  className="form-input" 
                  style={{ width: 'auto' }}
                  value={selectedTournament}
                  onChange={(e) => setSelectedTournament(e.target.value)}
                >
                  <option value="">Select Tournament</option>
                  {tournaments.map(t => (
                    <option key={t._id} value={t._id}>{t.name} ({t.year})</option>
                  ))}
                </select>
              </div>
            </div>

            {selectedTournament ? (
              <>
                {/* Create Team Form */}
                <form onSubmit={handleCreateTeam} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', marginBottom: '2rem', padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <div style={{ flex: 1 }}>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="New Team Name" 
                      value={newTeamName}
                      onChange={(e) => setNewTeamName(e.target.value)}
                    />
                    {teamError && <div style={{ color: 'var(--color-error)', fontSize: '0.875rem', marginTop: '0.5rem' }}>{teamError}</div>}
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={isCreatingTeam || !newTeamName}>
                    {isCreatingTeam ? 'Creating...' : 'Create Team'}
                  </button>
                </form>

                {/* Teams List */}
                <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
                  {teams.length === 0 ? (
                    <div style={{ gridColumn: '1 / -1', padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                      No teams created yet for this tournament.
                    </div>
                  ) : (
                    teams.map(team => {
                      const eligibleCaptains = getEligibleCaptains();
                      return (
                        <div key={team._id} style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(255,255,255,0.1)' }}>
                          <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between' }}>
                            {team.name}
                            <span style={{ fontSize: '0.875rem', fontWeight: 'normal', color: 'var(--color-text-muted)' }}>ID: {team._id.slice(-4)}</span>
                          </h3>
                          
                          <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Captain</label>
                            {team.captainId ? (
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.1)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)' }}>
                                <div>
                                  <div style={{ fontWeight: '500' }}>{team.captainId.name}</div>
                                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{team.captainId.departmentName}</div>
                                </div>
                                <button className="btn btn-ghost" style={{ padding: '0.25rem' }} onClick={() => handleAssignCaptain(team._id, null)} title="Remove Captain">
                                  ❌
                                </button>
                              </div>
                            ) : (
                              <select 
                                className="form-input" 
                                onChange={(e) => handleAssignCaptain(team._id, e.target.value)}
                                value=""
                              >
                                <option value="" disabled>Assign an approved captain...</option>
                                {eligibleCaptains.map(cap => (
                                  <option key={cap._id} value={cap._id}>{cap.name} ({cap.departmentName})</option>
                                ))}
                              </select>
                            )}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </>
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                Please select a tournament to manage teams.
              </div>
            )}

          </div>
        )}
      </main>
    </div>
  );
}

export default AdminDashboard;
