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
    const userId = req.headers['x-user-id']; // Admin sends their user ID in headers
    if (!userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized. Admin only.' });
    }

    const result = await pool.query('SELECT role FROM users WHERE id=$1', [userId]);
    const user = result.rows[0];

    if (user && user.role === 'admin') {
      next(); // User is admin, proceed
    } else {
      res.status(403).json({ success: false, message: 'Unauthorized. Admin only.' });
    }
  } catch (err) {
    console.error('Admin auth error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

module.exports = { verifyAdmin };
