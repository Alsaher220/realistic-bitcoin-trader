// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const port = process.env.PORT || 5000;

console.log("Starting TradeSphere backend...");

// ------------------- POSTGRES CONNECTION -------------------
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Required for Render Postgres
});

// Test DB connection
pool.connect()
  .then(client => {
    console.log("Postgres connected successfully.");
    client.release();
  })
  .catch(err => {
    console.error("Error connecting to Postgres:", err.stack);
  });

// ------------------- MIDDLEWARE -------------------
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Verify admin middleware
function verifyAdmin(req, res, next) {
  const userId = req.headers['x-user-id'];
  if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

  pool.query('SELECT role FROM users WHERE id=$1', [userId])
    .then(result => {
      if (result.rows[0] && result.rows[0].role === 'admin') {
        next();
      } else {
        res.status(403).json({ success: false, message: 'Forbidden: Admins only' });
      }
    })
    .catch(err => {
      console.error("verifyAdmin error:", err.stack);
      res.status(500).json({ success: false, message: 'Server error' });
    });
}

// ------------------- ROUTES -------------------
app.get('/', (req, res) => {
  res.send('TradeSphere Server is running!');
});

// Simple async wrapper to catch errors
const asyncHandler = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// ------------------- USER ROUTES -------------------
app.post('/register', asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.json({ success: false, message: 'All fields required' });

  const hashed = await bcrypt.hash(password, 10);
  const defaultCash = 50;
  const defaultBTC = 0;

  try {
    const result = await pool.query(
      'INSERT INTO users (username, password, cash, btc, role) VALUES ($1,$2,$3,$4,$5) RETURNING id, username, cash, btc',
      [username, hashed, defaultCash, defaultBTC, 'user']
    );
    res.json({ success: true, message: 'User registered!', user: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      res.json({ success: false, message: 'Username already exists' });
    } else {
      console.error("Register error:", err.stack);
      res.json({ success: false, message: 'Registration failed' });
    }
  }
}));

// Login
app.post('/login', asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  const result = await pool.query('SELECT id, username, password, cash, btc, role FROM users WHERE username=$1', [username]);
  const user = result.rows[0];
  if (!user) return res.json({ success: false, message: 'User not found' });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.json({ success: false, message: 'Incorrect password' });

  res.json({
    success: true,
    message: 'Login successful',
    user: { id: user.id, username: user.username, cash: user.cash, btc: user.btc, role: user.role }
  });
}));

// ------------------- ADMIN ROUTES -------------------
app.get('/admin/users', verifyAdmin, asyncHandler(async (req, res) => {
  const result = await pool.query('SELECT id, username, cash, btc FROM users ORDER BY id ASC');
  res.json({ success: true, users: result.rows });
}));

// Add other admin routes here using asyncHandler and verifyAdmin...

// ------------------- DASHBOARD ROUTES -------------------
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public', 'user-dashboard.html')));
app.get('/admin-dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin-dashboard.html')));

// ------------------- ERROR HANDLING -------------------
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err.stack);
  res.status(500).json({ success: false, message: 'Server error' });
});

// ------------------- START SERVER -------------------
app.listen(port, () => console.log(`Server running on port ${port}`));
