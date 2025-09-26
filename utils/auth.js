// auth.js - JWT Helper for TradeSphere
const jwt = require('jsonwebtoken');
const secret = process.env.JWT_SECRET || 'supersecretkey';

// Generate JWT token for user
function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    secret,
    { expiresIn: '1d' }
  );
}

// Middleware to verify JWT token
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(400).json({ success: false, message: 'Invalid token.' });
  }
}

module.exports = { generateToken, verifyToken };
