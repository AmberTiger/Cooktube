import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';

const AUTH_API_BASE = (process.env.REACT_APP_API_URL || '/api') + '/auth';

const OAuthCallback = () => {
  const location = useLocation();
  const [redirecting, setRedirecting] = useState(true);
   const [error, setError] = useState(null);

  const params = useMemo(() => {
    console.log("[DEBUG] Raw location.search:", location.search);
    const searchParams = new URLSearchParams(location.search || '');
    console.log("[DEBUG] Parsed params:", Object.fromEntries(searchParams.entries()));
    return searchParams;
  }, [location.search]);

  const code = params.get('code');
  const err = params.get('error');

  useEffect(() => {
    console.log("[DEBUG] useEffect triggered with", { code, err });

    if (err) {
      console.error("[DEBUG] OAuth error param detected:", err);
      setError(`Google OAuth error: ${err}`);
      setRedirecting(false);
      return;
    }

    if (!code) {
      console.warn("[DEBUG] No code found in query params");
      setError('Missing authorization code in callback.');
      setRedirecting(false);
      return;
    }

    const search = location.search || '';
    const url = `${AUTH_API_BASE}/google/callback${search}`;
    console.log("[DEBUG] Redirecting to serverless callback URL:", url);

    const timer = setTimeout(() => {
      console.log("[DEBUG] Redirect timeout reached (6s) – stopping redirecting state");
      setRedirecting(false);
    }, 6000);

    // IMPORTANT: hand off to serverless callback so it can set auth cookies,
    // then it will redirect back to the original page (via the state param)
    window.location.replace(url);

    return () => {
      console.log("[DEBUG] Cleanup: clearing redirect timer");
      clearTimeout(timer);
    };
  }, [location.search, code, err]);

  const manualUrl = `${AUTH_API_BASE}/google/callback${location.search || ''}`;
  console.log("[DEBUG] Manual redirect URL:", manualUrl);

  return (
    <div className="container">
      <header className="header">
        <h1>🔄 Finishing sign-in...</h1>
        {redirecting && !error && (
          <p>Please wait while we complete authentication.</p>
        )}
        {!redirecting && !error && (
          <p>
            Still working... If this page doesn't redirect automatically,{' '}
            <a href={manualUrl}>click here</a>.
          </p>
        )}
        {error && (
          <>
            <p style={{ color: '#c00' }}>{error}</p>
            <p>
              <Link to="/login">Return to sign in</Link>
            </p>
          </>
        )}
      </header>
    </div>
  );
};

export default OAuthCallback;
