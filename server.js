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

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Needed for Render Postgres
});

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// ------------------- MIDDLEWARE -------------------
function verifyAdmin(req, res, next) {
  const userId = req.headers['x-user-id'];
  if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

  pool.query('SELECT role FROM users WHERE id=$1', [userId])
    .then(result => {
      if (result.rows[0] && result.rows[0].role === 'admin') next();
      else res.status(403).json({ success: false, message: 'Forbidden: Admins only' });
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({ success: false, message: 'Server error' });
    });
}

// ------------------- ROOT -------------------
app.get('/', (req, res) => res.send('TradeSphere Server is running!'));

// ------------------- USER ROUTES -------------------
// Register
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.json({ success: false, message: 'All fields required' });
  try {
    const hashed = await bcrypt.hash(password, 10);
    const defaultCash = 50, defaultBTC = 0;
    const result = await pool.query(
      'INSERT INTO users (username, password, cash, btc, role) VALUES ($1,$2,$3,$4,$5) RETURNING id, username, cash, btc',
      [username, hashed, defaultCash, defaultBTC, 'user']
    );
    res.json({ success: true, message: 'User registered!', user: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') res.json({ success: false, message: 'Username already exists' });
    else {
      console.error(err);
      res.json({ success: false, message: 'Registration failed' });
    }
  }
});

// Login
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query(
      'SELECT id, username, password, cash, btc, role FROM users WHERE username=$1', [username]
    );
    const user = result.rows[0];
    if (!user) return res.json({ success: false, message: 'User not found' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.json({ success: false, message: 'Incorrect password' });

    res.json({
      success: true,
      message: 'Login successful',
      user: { id: user.id, username: user.username, cash: user.cash, btc: user.btc, role: user.role }
    });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: 'Login failed' });
  }
});

// Get user data
app.get('/user/:id', async (req, res) => {
  try {
    const userRes = await pool.query('SELECT id, username, cash, btc FROM users WHERE id=$1', [req.params.id]);
    const user = userRes.rows[0];
    if (!user) return res.json({ success: false, message: 'User not found' });
    res.json({ success: true, user });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: 'Error fetching user' });
  }
});

// Withdrawals, investments, buy/sell BTC, withdraw (same as before)
// ... [Insert all other user routes from your previous server.js here] ...

// ------------------- ADMIN ROUTES -------------------
// Admin: Fetch users
app.get('/admin/users', verifyAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, username, cash, btc FROM users ORDER BY id ASC');
    res.json({ success: true, users: result.rows });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: 'Failed to fetch users' });
  }
});

// Admin: Fetch trades
app.get('/admin/trades', verifyAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT trades.*, users.username FROM trades JOIN users ON trades.user_id=users.id ORDER BY date DESC'
    );
    res.json({ success: true, trades: result.rows });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: 'Failed to fetch trades' });
  }
});

// Admin: Fetch withdrawals
app.get('/admin/withdrawals', verifyAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT withdrawals.*, users.username FROM withdrawals JOIN users ON withdrawals.user_id=users.id ORDER BY date DESC'
    );
    res.json({ success: true, withdrawals: result.rows });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: 'Failed to fetch withdrawals' });
  }
});

// Admin: Process withdrawal
app.post('/admin/withdrawals/process', verifyAdmin, async (req, res) => {
  try {
    await pool.query('UPDATE withdrawals SET status=$1 WHERE id=$2', ['processed', req.body.withdrawalId]);
    res.json({ success: true, message: 'Withdrawal processed' });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: 'Failed to process withdrawal' });
  }
});

// Admin: Top-up
app.post('/admin/topup', verifyAdmin, async (req, res) => {
  const { userId, cash, btc, investmentAmount, investmentPlan } = req.body;
  try {
    if (cash || btc) await pool.query('UPDATE users SET cash=cash+COALESCE($1,0), btc=btc+COALESCE($2,0) WHERE id=$3', [cash||0, btc||0, userId]);
    if (investmentAmount) await pool.query('INSERT INTO investments (user_id, amount, plan, status) VALUES ($1,$2,$3,$4)', [userId, investmentAmount, investmentPlan||'Admin Top-up Plan','active']);
    res.json({ success: true, message: 'User topped up successfully' });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: 'Top-up failed' });
  }
});

// Admin: Fetch investments
app.get('/admin/investments', verifyAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT investments.*, users.username FROM investments JOIN users ON investments.user_id=users.id ORDER BY created_at DESC'
    );
    res.json({ success: true, investments: result.rows });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: 'Failed to fetch investments' });
  }
});

// ------------------- DASHBOARD ROUTES -------------------
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public', 'user-dashboard.html')));
app.get('/admin-dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin-dashboard.html')));

// ------------------- START SERVER -------------------
app.listen(port, () => console.log(`Server running on port ${port}`));
