const jwt = require('jsonwebtoken');
const db = require('./db');

const secret = process.env.JWT_SECRET || 'secret';

function generateToken(user) {
  return jwt.sign({ id: user.id, username: user.username, is_admin: user.is_admin }, secret, { expiresIn: '1d' });
}

function authRequired(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.redirect('/login');
  try {
    req.user = jwt.verify(token, secret);
    next();
  } catch (err) {
    res.clearCookie('token');
    res.redirect('/login');
  }
}

function adminRequired(req, res, next) {
  if (req.user && req.user.is_admin) return next();
  res.status(403).send('Forbidden');
}

module.exports = { generateToken, authRequired, adminRequired };
