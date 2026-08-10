import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function RegisterPage() {
  const navigate = useNavigate();
  const { register, isAuthenticated, user } = useAuth();

  const [role, setRole] = useState('player');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phoneNumber: '',
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
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
    // Clear field error on change
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: '' });
    }
    if (serverError) setServerError('');
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required.';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address.';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required.';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters.';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    if (!validate()) return;

    setLoading(true);
    try {
      const result = await register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phoneNumber: formData.phoneNumber,
        role,
      });
      const userRole = result.user.role;
      const dashboardMap = {
        admin: '/admin/dashboard',
        player: '/player/dashboard',
        spectator: '/spectator/dashboard',
      };
      navigate(dashboardMap[userRole] || '/', { replace: true });
    } catch (err) {
      setServerError(
        err.response?.data?.message || 'Registration failed. Please try again.'
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
            <h1 className="brand-title">Create Account</h1>
            <p className="brand-subtitle">Join Nutmeg Manager</p>
          </div>

          {/* Server Error */}
          {serverError && (
            <div className="alert alert-error">{serverError}</div>
          )}

          {/* Role Selector */}
          <div className="role-selector">
            <button
              type="button"
              className={`role-option${role === 'player' ? ' active' : ''}`}
              onClick={() => setRole('player')}
            >
              <span className="role-emoji">🏃</span>
              Player
            </button>
            <button
              type="button"
              className={`role-option${role === 'spectator' ? ' active' : ''}`}
              onClick={() => setRole('spectator')}
            >
              <span className="role-emoji">👀</span>
              Spectator
            </button>
          </div>

          {/* Registration Form */}
          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label htmlFor="reg-name" className="form-label">
                Full Name
              </label>
              <input
                id="reg-name"
                name="name"
                type="text"
                className={`form-input${errors.name ? ' error' : ''}`}
                placeholder="Enter your full name"
                value={formData.name}
                onChange={handleChange}
                autoComplete="name"
                disabled={loading}
              />
              {errors.name && (
                <span className="form-error">{errors.name}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="reg-email" className="form-label">
                Email Address
              </label>
              <input
                id="reg-email"
                name="email"
                type="email"
                className={`form-input${errors.email ? ' error' : ''}`}
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                autoComplete="email"
                disabled={loading}
              />
              {errors.email && (
                <span className="form-error">{errors.email}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="reg-password" className="form-label">
                Password
              </label>
              <input
                id="reg-password"
                name="password"
                type="password"
                className={`form-input${errors.password ? ' error' : ''}`}
                placeholder="Minimum 6 characters"
                value={formData.password}
                onChange={handleChange}
                autoComplete="new-password"
                disabled={loading}
              />
              {errors.password && (
                <span className="form-error">{errors.password}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="reg-confirm-password" className="form-label">
                Confirm Password
              </label>
              <input
                id="reg-confirm-password"
                name="confirmPassword"
                type="password"
                className={`form-input${errors.confirmPassword ? ' error' : ''}`}
                placeholder="Re-enter your password"
                value={formData.confirmPassword}
                onChange={handleChange}
                autoComplete="new-password"
                disabled={loading}
              />
              {errors.confirmPassword && (
                <span className="form-error">{errors.confirmPassword}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="reg-phone" className="form-label">
                Phone Number{' '}
                <span style={{ color: 'var(--color-text-muted)' }}>
                  (optional)
                </span>
              </label>
              <input
                id="reg-phone"
                name="phoneNumber"
                type="tel"
                className="form-input"
                placeholder="Enter your phone number"
                value={formData.phoneNumber}
                onChange={handleChange}
                autoComplete="tel"
                disabled={loading}
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner" />
                  Creating account...
                </>
              ) : (
                `Register as ${role === 'player' ? 'Player' : 'Spectator'}`
              )}
            </button>
          </form>

          {/* Footer Link */}
          <div className="auth-footer">
            Already have an account? <Link to="/login">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
