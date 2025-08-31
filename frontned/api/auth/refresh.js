const { parseCookies, verifyToken, issueTokens, setAuthCookies, ok, unauthorized, demoUserFromEnv } = require('../_lib/auth');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Method not allowed' });
    return;
  }

  const cookies = parseCookies(req);
  const refresh = cookies['refresh_token'];
  const payload = refresh ? verifyToken(refresh) : null;

  if (!payload || payload.type !== 'refresh') {
    return unauthorized(res);
  }

  const user = demoUserFromEnv();
  const tokens = issueTokens(user);
  setAuthCookies(res, tokens);
  ok(res, { ok: true });
};
