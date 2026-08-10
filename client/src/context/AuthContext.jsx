import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [playerProfile, setPlayerProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch current user on mount (restores session from cookie)
  const fetchUser = useCallback(async () => {
    try {
      const res = await api.get('/auth/me');
      setUser(res.data.user);
      return res.data.user;
    } catch {
      setUser(null);
      setPlayerProfile(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch player profile (only for players)
  const fetchPlayerProfile = useCallback(async () => {
    try {
      const res = await api.get('/players/me');
      setPlayerProfile(res.data.player);
      return res.data.player;
    } catch {
      setPlayerProfile(null);
      return null;
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const currentUser = await fetchUser();
      if (currentUser && currentUser.role === 'player') {
        await fetchPlayerProfile();
      }
    };
    init();
  }, [fetchUser, fetchPlayerProfile]);

  const register = async ({ name, email, password, phoneNumber, role }) => {
    const res = await api.post('/auth/register', {
      name,
      email,
      password,
      phoneNumber,
      role,
    });
    setUser(res.data.user);
    return res.data;
  };

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    setUser(res.data.user);
    // If player, fetch their profile after login
    if (res.data.user.role === 'player') {
      await fetchPlayerProfile();
    }
    return res.data;
  };

  const logout = async () => {
    await api.post('/auth/logout');
    setUser(null);
    setPlayerProfile(null);
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isPlayer: user?.role === 'player',
    isSpectator: user?.role === 'spectator',
    // Module 2: Player Profile
    playerProfile,
    setPlayerProfile,
    fetchPlayerProfile,
    hasProfile: !!playerProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
