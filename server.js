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

// ------------------- POSTGRES CONNECTION -------------------
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.connect()
  .then(client => {
    console.log("Postgres connected successfully.");
    client.release();
  })
  .catch(err => console.error("Postgres connection error:", err.stack));

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
      if (result.rows[0]?.role === 'admin') next();
      else res.status(403).json({ success: false, message: 'Forbidden: Admins only' });
    })
    .catch(err => {
      console.error("verifyAdmin error:", err.stack);
      res.status(500).json({ success: false, message: 'Server error' });
    });
}

// Async wrapper
const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ------------------- ROOT -------------------
app.get('/', (req, res) => res.send('TradeSphere Server is running!'));

// ------------------- USER ROUTES -------------------

// Register
app.post('/register', asyncHandler(async (req, res) => {
  const { username, password, preferredName } = req.body;
  if (!username || !password) return res.json({ success: false, message: 'All fields required' });

  const hashed = await bcrypt.hash(password, 10);
  const defaultCash = 50;
  const defaultBTC = 0;

  try {
    const result = await pool.query(
      'INSERT INTO users (username, preferred_name, password, cash, btc, role) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, username, preferred_name, cash, btc',
      [username, preferredName || username, hashed, defaultCash, defaultBTC, 'user']
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
  const result = await pool.query(
    'SELECT id, username, preferred_name, password, cash, btc, role FROM users WHERE username=$1',
    [username]
  );
  const user = result.rows[0];
  if (!user) return res.json({ success: false, message: 'User not found' });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.json({ success: false, message: 'Incorrect password' });

  res.json({
    success: true,
    message: 'Login successful',
    user: {
      id: user.id,
      username: user.username,
      preferredName: user.preferred_name,
      cash: user.cash,
      btc: user.btc,
      role: user.role
    }
  });
}));

// Get user info
app.get('/user/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userRes = await pool.query(
    'SELECT id, username, preferred_name, cash, btc FROM users WHERE id=$1',
    [id]
  );
  const user = userRes.rows[0];
  if (!user) return res.json({ success: false, message: 'User not found' });

  // Get withdrawals & investments
  const withdrawalsRes = await pool.query(
    'SELECT amount, wallet, status, date FROM withdrawals WHERE user_id=$1 ORDER BY date DESC',
    [id]
  );
  const investmentsRes = await pool.query(
    'SELECT plan, amount, status, created_at FROM investments WHERE user_id=$1 ORDER BY created_at DESC',
    [id]
  );

  res.json({
    success: true,
    user,
    withdrawals: withdrawalsRes.rows,
    investments: investmentsRes.rows
  });
}));

// Buy BTC
app.post('/buy', asyncHandler(async (req, res) => {
  const { userId, amount, price } = req.body;
  const cost = amount * price;
  const userRes = await pool.query('SELECT cash, btc FROM users WHERE id=$1', [userId]);
  const user = userRes.rows[0];
  if (!user) return res.json({ success: false, message: 'User not found' });
  if (user.cash < cost) return res.json({ success: false, message: 'Insufficient cash' });

  await pool.query('UPDATE users SET cash=cash-$1, btc=btc+$2 WHERE id=$3', [cost, amount, userId]);
  await pool.query('INSERT INTO trades (user_id, type, amount, price) VALUES ($1,$2,$3,$4)', [userId, 'buy', amount, price]);

  res.json({ success: true, message: 'BTC purchased!' });
}));

// Sell BTC
app.post('/sell', asyncHandler(async (req, res) => {
  const { userId, amount, price } = req.body;
  const userRes = await pool.query('SELECT btc, cash FROM users WHERE id=$1', [userId]);
  const user = userRes.rows[0];
  if (!user) return res.json({ success: false, message: 'User not found' });
  if (user.btc < amount) return res.json({ success: false, message: 'Insufficient BTC' });

  const gain = amount * price;
  await pool.query('UPDATE users SET cash=cash+$1, btc=btc-$2 WHERE id=$3', [gain, amount, userId]);
  await pool.query('INSERT INTO trades (user_id, type, amount, price) VALUES ($1,$2,$3,$4)', [userId, 'sell', amount, price]);

  res.json({ success: true, message: 'BTC sold!' });
}));

// Withdraw
app.post('/withdraw', asyncHandler(async (req, res) => {
  const { userId, amount, wallet } = req.body;
  const userRes = await pool.query('SELECT cash FROM users WHERE id=$1', [userId]);
  const user = userRes.rows[0];
  if (!user) return res.json({ success: false, message: 'User not found' });
  if (user.cash < amount) return res.json({ success: false, message: 'Insufficient cash' });

  await pool.query('UPDATE users SET cash=cash-$1 WHERE id=$2', [amount, userId]);
  await pool.query('INSERT INTO withdrawals (user_id, amount, wallet) VALUES ($1,$2,$3)', [userId, amount, wallet]);

  res.json({ success: true, message: 'Withdrawal requested!' });
}));

// ------------------- ADMIN ROUTES -------------------
app.get('/admin/users', verifyAdmin, asyncHandler(async (req, res) => {
  const result = await pool.query('SELECT id, username, preferred_name, cash, btc FROM users ORDER BY id ASC');
  res.json({ success: true, users: result.rows });
}));

// Dashboard routes
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public', 'user-dashboard.html')));
app.get('/admin-dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin-dashboard.html')));

// ------------------- ERROR HANDLING -------------------
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err.stack);
  res.status(500).json({ success: false, message: 'Server error' });
});

// ------------------- START SERVER -------------------
app.listen(port, () => console.log(`Server running on port ${port}`));
