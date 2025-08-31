const jwt = require('jsonwebtoken');
const cookie = require('cookie');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_cooktube_secret_change_me';
const ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL || '15m';
const REFRESH_TOKEN_TTL = process.env.REFRESH_TOKEN_TTL || '7d';

const DEMO_USER_EMAIL = process.env.DEMO_USER_EMAIL || 'demo@example.com';
const DEMO_USER_PASSWORD = process.env.DEMO_USER_PASSWORD || 'demo1234';
const DEMO_USER_NAME = process.env.DEMO_USER_NAME || 'Demo User';

function issueTokens(user) {
  const payload = { sub: user.id, email: user.email, name: user.name };
  if (user.picture) payload.picture = user.picture;
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
  const refreshToken = jwt.sign({ sub: user.id, type: 'refresh' }, JWT_SECRET, { expiresIn: REFRESH_TOKEN_TTL });
  return { accessToken, refreshToken };
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return null;
  }
}

function parseCookies(req) {
  const header = req.headers.cookie || '';
  return cookie.parse(header || '');
}

function setAuthCookies(res, { accessToken, refreshToken }) {
  const secure = process.env.NODE_ENV === 'production';
  const accessCookie = cookie.serialize('access_token', accessToken, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 15, // 15 minutes
  });
  const refreshCookie = cookie.serialize('refresh_token', refreshToken, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
  res.setHeader('Set-Cookie', [accessCookie, refreshCookie]);
}

function clearAuthCookies(res) {
  const secure = process.env.NODE_ENV === 'production';
  const clearAccess = cookie.serialize('access_token', '', {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  const clearRefresh = cookie.serialize('refresh_token', '', {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  res.setHeader('Set-Cookie', [clearAccess, clearRefresh]);
}

function demoUserFromEnv() {
  return { id: '1', email: DEMO_USER_EMAIL, name: DEMO_USER_NAME };
}

function ok(res, body) {
  res.setHeader('Content-Type', 'application/json');
  res.statusCode = 200;
  res.end(JSON.stringify(body));
}

function badRequest(res, message) {
  res.setHeader('Content-Type', 'application/json');
  res.statusCode = 400;
  res.end(JSON.stringify({ message }));
}

function unauthorized(res, message = 'Unauthorized') {
  res.setHeader('Content-Type', 'application/json');
  res.statusCode = 401;
  res.end(JSON.stringify({ message }));
}

module.exports = {
  issueTokens,
  verifyToken,
  parseCookies,
  setAuthCookies,
  clearAuthCookies,
  demoUserFromEnv,
  ok,
  badRequest,
  unauthorized,
};
