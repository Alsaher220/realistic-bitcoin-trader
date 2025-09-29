// utils/auth.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Needed for Render Postgres
});

// Middleware to protect admin routes
async function verifyAdmin(req, res, next) {
  try {
    const userIdHeader = req.headers['x-user-id'];
    if (!userIdHeader) {
      return res.status(403).json({ success: false, message: 'Unauthorized. Admin only.' });
    }

    const userId = parseInt(userIdHeader.toString().trim(), 10);
    if (isNaN(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    const result = await pool.query('SELECT role FROM users WHERE id=$1', [userId]);
    const user = result.rows[0];

    if (user && user.role === 'admin') {
      return next(); // User is admin, proceed
    } else {
      return res.status(403).json({ success: false, message: 'Unauthorized. Admin only.' });
    }
  } catch (err) {
    console.error('Admin auth error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

module.exports = { verifyAdmin };
