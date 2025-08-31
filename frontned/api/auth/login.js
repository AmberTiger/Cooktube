const { issueTokens, setAuthCookies, ok, badRequest, demoUserFromEnv } = require('../_lib/auth');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Method not allowed' });
    return;
  }

  try {
    const { email, password } = JSON.parse(req.body || '{}');

    const demoUser = demoUserFromEnv();
    if (email !== demoUser.email || password !== (process.env.DEMO_USER_PASSWORD || 'demo1234')) {
      return badRequest(res, 'Invalid email or password');
    }

    const tokens = issueTokens(demoUser);
    setAuthCookies(res, tokens);
    ok(res, { user: demoUser });
  } catch (e) {
    badRequest(res, 'Invalid request');
  }
};
