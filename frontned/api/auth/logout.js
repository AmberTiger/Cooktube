const { clearAuthCookies, ok } = require('../_lib/auth');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Method not allowed' });
    return;
  }
  clearAuthCookies(res);
  ok(res, { ok: true });
};
