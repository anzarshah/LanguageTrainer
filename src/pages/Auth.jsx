import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function Auth() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState('signin'); // signin | signup
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (mode === 'signup') {
        await signUp(email, password, displayName || email.split('@')[0]);
        setSuccess('Account created! Check your email to confirm, then sign in.');
        setMode('signin');
      } else {
        await signIn(email, password);
        // Auth state change in context will handle redirect
      }
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div style={{ maxWidth: 400, width: '100%' }}>
        <div className="auth-logo">
          <h1>Immerse48</h1>
          <p>Have a conversation in any language in 48 hours</p>
        </div>

        <div className="auth-card">
          <h2>
            {mode === 'signin' ? 'Welcome back' : 'Create your account'}
          </h2>

          {error && <div className="error-msg" style={{ marginBottom: 16 }}>{error}</div>}
          {success && (
            <div style={{
              background: 'rgba(46,125,82,0.08)', color: '#2E7D52',
              padding: '10px 14px', borderRadius: 'var(--radius)', fontSize: 13, marginBottom: 16,
            }}>
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {mode === 'signup' && (
              <div className="input-group" style={{ marginBottom: 14 }}>
                <label>Display Name</label>
                <input
                  type="text"
                  placeholder="Your name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>
            )}

            <div className="input-group" style={{ marginBottom: 14 }}>
              <label>Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="input-group" style={{ marginBottom: 20 }}>
              <label>Password</label>
              <input
                type="password"
                placeholder={mode === 'signup' ? 'Min 6 characters' : 'Your password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <button
              className="btn btn-primary btn-full"
              type="submit"
              disabled={loading}
              style={{ padding: '14px 20px', fontSize: 15 }}
            >
              {loading
                ? (mode === 'signin' ? 'Signing in...' : 'Creating account...')
                : (mode === 'signin' ? 'Sign In' : 'Create Account')
              }
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 16 }}>
            {mode === 'signin' ? (
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Don't have an account?{' '}
                <button
                  onClick={() => { setMode('signup'); setError(''); setSuccess(''); }}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--primary)', fontWeight: 600, fontSize: 13,
                    fontFamily: 'var(--font-body)', textDecoration: 'underline',
                  }}
                >
                  Sign up
                </button>
              </p>
            ) : (
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Already have an account?{' '}
                <button
                  onClick={() => { setMode('signin'); setError(''); setSuccess(''); }}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--primary)', fontWeight: 600, fontSize: 13,
                    fontFamily: 'var(--font-body)', textDecoration: 'underline',
                  }}
                >
                  Sign in
                </button>
              </p>
            )}
          </div>
        </div>

        <p className="auth-footer">
          Built on Comprehensible Input, Spaced Repetition, and Output Forcing. Powered by Claude AI.
        </p>
      </div>
    </div>
  );
}
