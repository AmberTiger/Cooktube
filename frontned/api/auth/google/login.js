module.exports = async (req, res) => {
  try {
    const base = 'https://accounts.google.com/o/oauth2/v2/auth';

    // Robust query parsing (works in Vercel runtime reliably)
    const fullUrl = new URL(req.url, `http://${req.headers.host}`);
    const from = fullUrl.searchParams.get('from') || '/';

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = process.env.OAUTH_REDIRECT_URI || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}/api/auth/google/callback` : 'http://localhost:3000/api/auth/google/callback');

    if (!clientId) {
      res.statusCode = 500;
      res.end('Missing GOOGLE_CLIENT_ID');
      return;
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      include_granted_scopes: 'true',
      prompt: 'select_account',
      state: from,
    });

    const url = `${base}?${params.toString()}`;
    res.statusCode = 302;
    res.setHeader('Location', url);
    res.end();
  } catch (e) {
    res.statusCode = 500;
    res.end('OAuth init error');
  }
};
