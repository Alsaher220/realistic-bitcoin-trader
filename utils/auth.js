// utils/auth.js
const ADMIN_SECRET = process.env.ADMIN_SECRET;

// Middleware to protect admin routes
function verifyAdmin(req, res, next) {
  const secret = req.headers['x-admin-secret'];
  if (secret && secret === ADMIN_SECRET) {
    next();
  } else {
    res.status(403).json({ success: false, message: 'Unauthorized. Admin only.' });
  }
}

module.exports = { verifyAdmin };
