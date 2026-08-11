import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../services/api';

function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [formData, setFormData] = useState({ password: '', confirmPassword: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing password reset token.');
    }
  }, [token]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (!formData.password) {
      return setError('Password is required.');
    }
    if (formData.password.length < 6) {
      return setError('Password must be at least 6 characters.');
    }
    if (formData.password !== formData.confirmPassword) {
      return setError('Passwords do not match.');
    }

    setLoading(true);
    try {
      const response = await api.post(`/auth/resetpassword/${token}`, {
        password: formData.password,
      });
      setMessage(response.data.message);
    } catch (err) {
      setError(
        err.response?.data?.message || 'Something went wrong. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout">
      <div className="auth-container">
        <div className="glass-card">
          <div className="brand-header">
            <div className="brand-icon">⚽</div>
            <h1 className="brand-title">Nutmeg Manager</h1>
            <p className="brand-subtitle">Reset Password</p>
          </div>

          {error && <div className="alert alert-error">{error}</div>}
          {message && <div className="alert alert-success">{message}</div>}

          {!message && token ? (
            <form onSubmit={handleSubmit} noValidate>
              <div className="form-group">
                <label htmlFor="password" className="form-label">
                  New Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  className={`form-input${error ? ' error' : ''}`}
                  placeholder="Enter new password"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword" className="form-label">
                  Confirm New Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  className={`form-input${error ? ' error' : ''}`}
                  placeholder="Confirm new password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>

              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? (
                  <>
                    <span className="spinner" />
                    Resetting...
                  </>
                ) : (
                  'Reset Password'
                )}
              </button>
            </form>
          ) : null}

          <div className="auth-footer">
            <Link to="/login">Back to Login</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ResetPasswordPage;
