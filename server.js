// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const path = require('path');
const { verifyAdmin } = require('./utils/auth');

const app = express();
const port = process.env.PORT || 5000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Needed for Render Postgres
});

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// ---------- ROOT ----------
app.get('/', (req, res) => {
  res.send('📈 TradeSphere Broker API is live!');
});

// ---------- USER ROUTES ---------- //

// Register
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.json({ success: false, message: 'All fields required' });

  try {
    const hashed = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (username, password, cash) 
       VALUES ($1, $2, $3) 
       RETURNING id, username, cash, btc`,
      [username, hashed, 50]
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
      'SELECT id, username, cash, btc, password, role FROM users WHERE username=$1',
      [username]
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

// Get portfolio
app.get('/user/:id/portfolio', async (req, res) => {
  const { id } = req.params;
  try {
    const user = await pool.query('SELECT id, username, cash, btc FROM users WHERE id=$1', [id]);
    if (!user.rows[0]) return res.json({ success: false, message: 'User not found' });

    const trades = await pool.query(
      'SELECT type, amount, price, date FROM trades WHERE user_id=$1 ORDER BY date DESC',
      [id]
    );

    const investments = await pool.query(
      'SELECT plan, amount, status, created_at FROM investments WHERE user_id=$1 ORDER BY created_at DESC',
      [id]
    );

    const withdrawals = await pool.query(
      'SELECT amount, wallet, status, date FROM withdrawals WHERE user_id=$1 ORDER BY date DESC',
      [id]
    );

    res.json({
      success: true,
      portfolio: {
        user: user.rows[0],
        trades: trades.rows,
        investments: investments.rows,
        withdrawals: withdrawals.rows
      }
    });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: 'Error fetching portfolio' });
  }
});

// Buy BTC
app.post('/buy', async (req, res) => {
  const { userId, amount, price } = req.body;
  if (!userId || !amount || !price) return res.json({ success: false, message: 'All fields required' });

  try {
    const cost = amount * price;
    const userRes = await pool.query('SELECT cash, btc FROM users WHERE id=$1', [userId]);
    const user = userRes.rows[0];
    if (!user) return res.json({ success: false, message: 'User not found' });
    if (user.cash < cost) return res.json({ success: false, message: 'Insufficient cash' });

    await pool.query('UPDATE users SET cash = cash - $1, btc = btc + $2 WHERE id=$3', [cost, amount, userId]);
    await pool.query('INSERT INTO trades (user_id, type, amount, price) VALUES ($1,$2,$3,$4)', [userId, 'buy', amount, price]);
    res.json({ success: true, message: 'BTC purchased!' });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: 'Buy failed' });
  }
});

// Sell BTC
app.post('/sell', async (req, res) => {
  const { userId, amount, price } = req.body;
  if (!userId || !amount || !price) return res.json({ success: false, message: 'All fields required' });

  try {
    const userRes = await pool.query('SELECT btc, cash FROM users WHERE id=$1', [userId]);
    const user = userRes.rows[0];
    if (!user) return res.json({ success: false, message: 'User not found' });
    if (user.btc < amount) return res.json({ success: false, message: 'Insufficient BTC' });

    const gain = amount * price;
    await pool.query('UPDATE users SET cash = cash + $1, btc = btc - $2 WHERE id=$3', [gain, amount, userId]);
    await pool.query('INSERT INTO trades (user_id, type, amount, price) VALUES ($1,$2,$3,$4)', [userId, 'sell', amount, price]);
    res.json({ success: true, message: 'BTC sold!' });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: 'Sell failed' });
  }
});

// Withdraw
app.post('/withdraw', async (req, res) => {
  const { userId, amount, wallet } = req.body;
  if (!userId || !amount || !wallet) return res.json({ success: false, message: 'All fields required' });

  try {
    const userRes = await pool.query('SELECT cash FROM users WHERE id=$1', [userId]);
    const user = userRes.rows[0];
    if (!user) return res.json({ success: false, message: 'User not found' });
    if (user.cash < amount) return res.json({ success: false, message: 'Insufficient cash' });

    await pool.query('UPDATE users SET cash = cash - $1 WHERE id=$2', [amount, userId]);
    await pool.query('INSERT INTO withdrawals (user_id, amount, wallet) VALUES ($1,$2,$3)', [userId, amount, wallet]);
    res.json({ success: true, message: 'Withdrawal requested!' });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: 'Withdrawal failed' });
  }
});

// Admin-only: Get all users
app.get('/admin/users', verifyAdmin, async (req, res) => {
  const result = await pool.query('SELECT id, username, cash, btc, role FROM users ORDER BY id ASC');
  res.json({ users: result.rows });
});

// Admin-only: Get all trades
app.get('/admin/trades', verifyAdmin, async (req, res) => {
  const result = await pool.query(
    'SELECT trades.*, users.username FROM trades JOIN users ON trades.user_id=users.id ORDER BY date DESC'
  );
  res.json({ trades: result.rows });
});

// Admin-only: Get all investments
app.get('/admin/investments', verifyAdmin, async (req, res) => {
  const result = await pool.query(
    'SELECT investments.*, users.username FROM investments JOIN users ON investments.user_id=users.id ORDER BY created_at DESC'
  );
  res.json({ investments: result.rows });
});

// Admin-only: Get all withdrawals
app.get('/admin/withdrawals', verifyAdmin, async (req, res) => {
  const result = await pool.query(
    'SELECT withdrawals.*, users.username FROM withdrawals JOIN users ON withdrawals.user_id=users.id ORDER BY date DESC'
  );
  res.json({ withdrawals: result.rows });
});

// Admin-only: Process withdrawal
app.post('/admin/withdrawals/process', verifyAdmin, async (req, res) => {
  const { id } = req.body;
  if (!id) return res.json({ success: false, message: 'Withdrawal ID required' });

  try {
    await pool.query('UPDATE withdrawals SET status=$1 WHERE id=$2', ['processed', id]);
    res.json({ success: true, message: 'Withdrawal processed' });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: 'Failed to process withdrawal' });
  }
});

// Admin Top-up cash or BTC
app.post('/admin/topup', verifyAdmin, async (req, res) => {
  const { userId, cash, btc } = req.body;
  if ((!cash || cash < 0) && (!btc || btc < 0)) 
    return res.json({ success: false, message: 'Provide valid cash or BTC amount' });

  try {
    await pool.query('UPDATE users SET cash = cash + $1, btc = btc + $2 WHERE id=$3', [cash || 0, btc || 0, userId]);
    const updatedUser = await pool.query('SELECT id, username, cash, btc FROM users WHERE id=$1', [userId]);
    res.json({ success: true, message: 'User topped up successfully', user: updatedUser.rows[0] });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: 'Top-up failed' });
  }
});

// Admin Top-up investment
app.post('/admin/topup-investment', verifyAdmin, async (req, res) => {
  const { userId, amount, plan } = req.body;
  if (!userId || !amount || amount <= 0) return res.json({ success: false, message: 'User ID and valid amount required' });

  try {
    const userRes = await pool.query('SELECT id FROM users WHERE id=$1', [userId]);
    if (!userRes.rows[0]) return res.json({ success: false, message: 'User not found' });

    const insertRes = await pool.query(
      'INSERT INTO investments (user_id, amount, plan, status) VALUES ($1, $2, $3, $4) RETURNING *',
      [userId, amount, plan || 'Starter Plan', 'active']
    );

    res.json({ success: true, message: `Investment topped up with $${amount}`, investment: insertRes.rows[0] });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: 'Failed to top up investment' });
  }
});

// ------------------- DASHBOARD ROUTES ------------------- //
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/admin-dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-dashboard.html'));
});

// ------------------- START SERVER ------------------- //
app.listen(port, () => {
  console.log(`🚀 Broker server running on port ${port}`);
});
