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

// ------------------- SEED EXISTING USERS -------------------
(async () => {
  try {
    await pool.query(`
      UPDATE users
      SET preferred_name = username
      WHERE preferred_name IS NULL
    `);
    await pool.query(`
      UPDATE users
      SET cash = 50
      WHERE cash IS NULL OR cash < 50
    `);
    console.log("Existing users fixed: preferred_name and cash ensured.");
  } catch (err) {
    console.error("Error seeding existing users:", err.stack);
  }
})();

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

// Get user info + withdrawals + investments
app.get('/user/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userRes = await pool.query(
    'SELECT id, username, preferred_name, cash, btc FROM users WHERE id=$1',
    [id]
  );
  const user = userRes.rows[0];
  if (!user) return res.json({ success: false, message: 'User not found' });

  const withdrawalsRes = await pool.query(
    'SELECT amount, wallet, status, date FROM withdrawals WHERE user_id=$1 ORDER BY date DESC',
    [id]
  );

  const investmentsRes = await pool.query(
    'SELECT plan, amount, status, created_at FROM investments WHERE user_id=$1 ORDER BY created_at DESC',
    [id]
  );

  const supportRes = await pool.query(
    'SELECT id, message, sender, created_at FROM support_messages WHERE user_id=$1 ORDER BY created_at DESC',
    [id]
  );

  res.json({
    success: true,
    user,
    withdrawals: withdrawalsRes.rows,
    investments: investmentsRes.rows,
    supportMessages: supportRes.rows
  });
}));

// Withdraw
app.post('/withdraw', asyncHandler(async (req, res) => {
  const { userId, amount, wallet } = req.body;
  const userRes = await pool.query('SELECT cash FROM users WHERE id=$1', [userId]);
  const user = userRes.rows[0];
  if (!user) return res.json({ success: false, message: 'User not found' });
  if (user.cash < amount) return res.json({ success: false, message: 'Insufficient cash' });

  await pool.query('UPDATE users SET cash=cash-$1 WHERE id=$2', [amount, userId]);
  await pool.query('INSERT INTO withdrawals (user_id, amount, wallet, status, date) VALUES ($1,$2,$3,$4,NOW())', [userId, amount, wallet, 'pending']);

  res.json({ success: true, message: 'Withdrawal requested!' });
}));

// ------------------- SUPPORT ROUTES -------------------

// User sends message
app.post('/support/message', asyncHandler(async (req, res) => {
  const { userId, message } = req.body;
  if (!userId || !message) return res.json({ success: false, message: 'User ID and message required' });

  await pool.query(
    'INSERT INTO support_messages (user_id, message, sender, created_at) VALUES ($1,$2,$3,NOW())',
    [userId, message, 'user'] // store sender as 'user'
  );

  res.json({ success: true, message: 'Support message sent!' });
}));

// Admin views messages
app.get('/admin/support', verifyAdmin, asyncHandler(async (req, res) => {
  const result = await pool.query(`
    SELECT s.id, s.message, s.sender, s.created_at, u.username 
    FROM support_messages s
    JOIN users u ON s.user_id = u.id
    ORDER BY s.created_at DESC
  `);
  res.json({ success: true, messages: result.rows });
}));

// ------------------- ADMIN ROUTES -------------------
app.get('/admin/users', verifyAdmin, asyncHandler(async (req, res) => {
  const result = await pool.query('SELECT id, username, preferred_name, cash, btc FROM users ORDER BY id ASC');
  res.json({ success: true, users: result.rows });
}));

// Admin Top-Up
app.post('/admin/topup', verifyAdmin, asyncHandler(async (req, res) => {
  const { userId, cash = 0, btc = 0, investmentAmount = 0, investmentPlan } = req.body;
  const adminUserId = req.headers['x-user-id'];

  if (!userId) return res.json({ success: false, message: 'User ID is required' });

  const userRes = await pool.query('SELECT cash, btc FROM users WHERE id=$1', [userId]);
  const user = userRes.rows[0];
  if (!user) return res.json({ success: false, message: 'User not found' });

  const newCash = Number(user.cash) + Number(cash);
  const newBTC = Number(user.btc) + Number(btc);
  await pool.query('UPDATE users SET cash=$1, btc=$2 WHERE id=$3', [newCash, newBTC, userId]);

  if (investmentAmount && investmentPlan) {
    await pool.query(
      'INSERT INTO investments (user_id, plan, amount, status, created_at) VALUES ($1,$2,$3,$4,NOW())',
      [userId, investmentPlan, investmentAmount, 'active']
    );
  }

  await pool.query(
    'INSERT INTO topups (user_id, amount, admin_id, date) VALUES ($1,$2,$3,NOW())',
    [userId, Number(cash) + Number(btc), adminUserId]
  );

  res.json({ success: true, message: 'Top-up successful!' });
}));

// Admin: Fetch Withdrawals
app.get('/admin/withdrawals', verifyAdmin, asyncHandler(async (req, res) => {
  const result = await pool.query(`
    SELECT w.id, w.amount, w.wallet, w.status, w.date, u.username 
    FROM withdrawals w 
    JOIN users u ON w.user_id = u.id
    ORDER BY w.date DESC
  `);
  res.json({ success: true, withdrawals: result.rows });
}));

// Admin: Approve Withdrawal
app.post('/admin/withdrawals/process', verifyAdmin, asyncHandler(async (req, res) => {
  const { withdrawalId } = req.body;
  if (!withdrawalId) return res.json({ success: false, message: 'Withdrawal ID required' });

  await pool.query('UPDATE withdrawals SET status=$1 WHERE id=$2', ['approved', withdrawalId]);
  res.json({ success: true, message: 'Withdrawal approved!' });
}));

// Admin: Fetch Investments
app.get('/admin/investments', verifyAdmin, asyncHandler(async (req, res) => {
  const result = await pool.query(`
    SELECT i.id, i.amount, i.plan, i.status, i.created_at, u.username 
    FROM investments i
    JOIN users u ON i.user_id = u.id
    ORDER BY i.created_at DESC
  `);
  res.json({ success: true, investments: result.rows });
}));

// Admin: Fetch Top-Ups
app.get('/admin/topups', verifyAdmin, asyncHandler(async (req, res) => {
  const result = await pool.query(`
    SELECT t.id, t.user_id, t.amount, t.admin_id, t.date, u.username
    FROM topups t
    JOIN users u ON t.user_id = u.id
    ORDER BY t.date DESC
  `);
  res.json({ success: true, topups: result.rows });
}));

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
