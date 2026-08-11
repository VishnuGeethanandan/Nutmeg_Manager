import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (!email.trim()) {
      return setError('Email is required.');
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/forgotpassword', { email });
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
            <p className="brand-subtitle">Forgot Password</p>
          </div>

          {error && <div className="alert alert-error">{error}</div>}
          {message && <div className="alert alert-success">{message}</div>}

          {!message ? (
            <form onSubmit={handleSubmit} noValidate>
              <div className="form-group">
                <label htmlFor="email" className="form-label">
                  Enter your registered email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  className={`form-input${error ? ' error' : ''}`}
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError('');
                  }}
                  autoComplete="email"
                  disabled={loading}
                />
              </div>

              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? (
                  <>
                    <span className="spinner" />
                    Sending...
                  </>
                ) : (
                  'Send Reset Link'
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

export default ForgotPasswordPage;
