import React, { useState, useEffect } from 'react';
import api from '../services/api';
import './LeaderboardView.css';

const LeaderboardView = ({ tournamentId }) => {
  const [topScorers, setTopScorers] = useState([]);
  const [topAssists, setTopAssists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('scorers'); // 'scorers' | 'assists'

  useEffect(() => {
    const fetchLeaderboards = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/stats/${tournamentId}/leaderboards`);
        if (response.data.success) {
          setTopScorers(response.data.data.topScorers || []);
          setTopAssists(response.data.data.topAssists || []);
        } else {
          throw new Error(response.data.message || 'Error fetching data');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (tournamentId) {
      fetchLeaderboards();
    }
  }, [tournamentId]);

  if (loading) {
    return <div className="leaderboard-loading">Loading Leaderboards...</div>;
  }

  if (error) {
    return <div className="leaderboard-error">{error}</div>;
  }

  return (
    <div className="leaderboard-container">
      <h2 className="leaderboard-title">Tournament Statistics</h2>
      
      {/* Mobile Tabs */}
      <div className="leaderboard-tabs">
        <button 
          className={`tab-btn ${activeTab === 'scorers' ? 'active' : ''}`}
          onClick={() => setActiveTab('scorers')}
        >
          Top Goal Scorers
        </button>
        <button 
          className={`tab-btn ${activeTab === 'assists' ? 'active' : ''}`}
          onClick={() => setActiveTab('assists')}
        >
          Top Assists
        </button>
      </div>

      <div className="leaderboard-content">
        {/* Top Scorers Section */}
        <div className={`leaderboard-section ${activeTab === 'scorers' ? 'active-mobile' : ''}`}>
          <h3 className="section-title">🏆 Top Goal Scorers</h3>
          <div className="leaderboard-list">
            {topScorers.length === 0 ? (
              <p className="no-data">No data available yet.</p>
            ) : (
              topScorers.map((stat, index) => (
                <div key={stat._id || index} className="leaderboard-item">
                  <div className="item-rank">{index + 1}</div>
                  <div className="item-details">
                    <div className="player-name">{stat.playerId?.name || 'Unknown Player'}</div>
                    <div className="player-dept">{stat.playerId?.departmentName || '-'}</div>
                  </div>
                  <div className="item-stat">
                    <span className="stat-value">{stat.goals}</span>
                    <span className="stat-label">Goals</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Assists Section */}
        <div className={`leaderboard-section ${activeTab === 'assists' ? 'active-mobile' : ''}`}>
          <h3 className="section-title">🎯 Top Assists</h3>
          <div className="leaderboard-list">
            {topAssists.length === 0 ? (
              <p className="no-data">No data available yet.</p>
            ) : (
              topAssists.map((stat, index) => (
                <div key={stat._id || index} className="leaderboard-item">
                  <div className="item-rank">{index + 1}</div>
                  <div className="item-details">
                    <div className="player-name">{stat.playerId?.name || 'Unknown Player'}</div>
                    <div className="player-dept">{stat.playerId?.departmentName || '-'}</div>
                  </div>
                  <div className="item-stat">
                    <span className="stat-value">{stat.assists}</span>
                    <span className="stat-label">Assists</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaderboardView;
