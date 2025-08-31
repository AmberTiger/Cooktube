import React from 'react';
import { useLocation } from 'react-router-dom';

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;
const OAUTH_REDIRECT_URI = process.env.REACT_APP_OAUTH_REDIRECT_URI;

const Login = () => {
  const location = useLocation();
  const from = location.state?.from || '/';

  const redirectUri = OAUTH_REDIRECT_URI || `${window.location.origin}/auth/callback`;

  const onGoogle = () => {
    if (!GOOGLE_CLIENT_ID) {
      alert('Google OAuth is not configured. Please set REACT_APP_GOOGLE_CLIENT_ID in your environment.');
      return;
    }
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      include_granted_scopes: 'true',
      prompt: 'select_account',
      state: from,
    });
    const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    window.location.href = url;
  };

  return (
    <div className="container">
      <header className="header">
        <h1>🔐 Sign in to Cooktube</h1>
        <p>Use your Google account to continue</p>
      </header>

      <section className="add-video-section" style={{ textAlign: 'center' }}>
        <button className="btn" onClick={onGoogle}>
          Continue with Google
        </button>
        <p style={{ marginTop: '12px', color: '#666' }}>
          You will be redirected to Google to authenticate.
        </p>
      </section>
    </div>
  );
};

export default Login;
