const { parseCookies, verifyToken, ok, unauthorized } = require('../_lib/auth');

module.exports = async (req, res) => {
  const cookies = parseCookies(req);
  const token = cookies['access_token'];
  const payload = token ? verifyToken(token) : null;

  if (!payload) {
    return unauthorized(res);
  }

  const user = {
    id: payload.sub,
    email: payload.email,
    name: payload.name,
    picture: payload.picture,
  };
  ok(res, { user });
};
