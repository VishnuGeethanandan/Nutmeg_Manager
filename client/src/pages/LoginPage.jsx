import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function LoginPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated, user } = useAuth();

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // If already logged in, redirect to dashboard
  if (isAuthenticated && user) {
    const dashboardMap = {
      admin: '/admin/dashboard',
      player: '/player/dashboard',
      spectator: '/spectator/dashboard',
    };
    navigate(dashboardMap[user.role] || '/', { replace: true });
    return null;
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Client-side validation
    if (!formData.email.trim()) {
      return setError('Email is required.');
    }
    if (!formData.password) {
      return setError('Password is required.');
    }

    setLoading(true);
    try {
      const result = await login(formData.email, formData.password);
      const role = result.user.role;
      const dashboardMap = {
        admin: '/admin/dashboard',
        player: '/player/dashboard',
        spectator: '/spectator/dashboard',
      };
      navigate(dashboardMap[role] || '/', { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.message || 'Login failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout">
      <div className="auth-container">
        <div className="glass-card">
          {/* Brand Header */}
          <div className="brand-header">
            <div className="brand-icon">⚽</div>
            <h1 className="brand-title">Nutmeg Manager</h1>
            <p className="brand-subtitle">MCA Football Tournament System</p>
          </div>

          {/* Error Alert */}
          {error && <div className="alert alert-error">{error}</div>}

          {/* Login Form */}
          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label htmlFor="login-email" className="form-label">
                Email Address
              </label>
              <input
                id="login-email"
                name="email"
                type="email"
                className={`form-input${error ? ' error' : ''}`}
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                autoComplete="email"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="login-password" className="form-label">
                Password
              </label>
              <input
                id="login-password"
                name="password"
                type="password"
                className={`form-input${error ? ' error' : ''}`}
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                autoComplete="current-password"
                disabled={loading}
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Footer Link */}
          <div className="auth-footer">
            Don&apos;t have an account?{' '}
            <Link to="/register">Create one</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
