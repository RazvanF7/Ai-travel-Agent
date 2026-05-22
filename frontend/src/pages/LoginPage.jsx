import { useState } from 'react';
import { useAuth } from '../store/AuthContext';
import { useGoogleLogin } from '@react-oauth/google';

export default function LoginPage() {
  const { login, loginWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      setError('');
      try {
        await loginWithGoogle(tokenResponse.access_token);
      } catch (err) {
        setError(err.message || 'Google Login failed. Please try again.');
        setLoading(false);
      }
    },
    onError: () => {
      setError('Google Login Failed');
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const userEmail = email || 'traveler@aitravelhub.com';
      const userName = name || userEmail.split('@')[0];
      await login(userEmail, userName, userName);
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await login('demo@aitravelhub.com', 'demo', 'Demo User');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Background orbs */}
      <div style={{
        position: 'fixed', top: '15%', left: '10%', width: 400, height: 400,
        borderRadius: '50%', background: 'rgba(99, 102, 241, 0.08)', filter: 'blur(100px)',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'fixed', bottom: '10%', right: '15%', width: 350, height: 350,
        borderRadius: '50%', background: 'rgba(6, 182, 212, 0.06)', filter: 'blur(100px)',
        pointerEvents: 'none'
      }} />

      <div className="animate-slide-up" style={{ maxWidth: 440, width: '90%', position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: '3.5rem', marginBottom: 16 }}></div>
          <h1 style={{
            fontSize: '2.5rem', fontWeight: 800,
            background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            marginBottom: 8
          }}>
            AI Travel Hub
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.0625rem' }}>
            Plan trips together with AI-powered itineraries
          </p>
        </div>

        {/* Login Card */}
        <div className="glass-card-static" style={{ padding: 32 }}>
          {/* Google Login Button (US-001) */}
          <button
            className="btn btn-secondary btn-lg"
            style={{
              width: '100%', marginBottom: 24, fontSize: '0.9375rem',
              background: 'rgba(255,255,255,0.06)', padding: '14px 20px'
            }}
            onClick={() => googleLogin()}
            disabled={loading}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24,
            color: 'var(--text-tertiary)', fontSize: '0.8125rem'
          }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
            or sign in with email
            <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
          </div>

          <form onSubmit={handleSubmit}>
            <div className="input-group" style={{ marginBottom: 16 }}>
              <label htmlFor="login-name">Your Name</label>
              <input
                id="login-name"
                className="input"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="input-group" style={{ marginBottom: 24 }}>
              <label htmlFor="login-email">Email Address</label>
              <input
                id="login-email"
                className="input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {error && (
              <div style={{
                padding: '10px 14px', background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 'var(--radius-md)',
                color: 'var(--accent-danger)', fontSize: '0.875rem', marginBottom: 16
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              style={{ width: '100%' }}
              disabled={loading}
            >
              {loading ? ' Signing in...' : ' Sign In & Start Planning'}
            </button>
          </form>
        </div>

        <p style={{
          textAlign: 'center', marginTop: 24, color: 'var(--text-tertiary)',
          fontSize: '0.8125rem'
        }}>
          By signing in, you agree to AI Travel Hub's Terms of Service
        </p>
      </div>
    </div>
  );
}
