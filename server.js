// server.js
const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 🔹 Connect to Postgres
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// 🔹 Ensure tables exist + create admin
(async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      cash NUMERIC DEFAULT 1000,
      btc NUMERIC DEFAULT 0
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS trades (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      amount NUMERIC NOT NULL,
      price NUMERIC NOT NULL,
      date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS withdrawals (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      amount NUMERIC NOT NULL,
      wallet TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Ensure admin account exists
  const adminCheck = await pool.query(`SELECT * FROM users WHERE username=$1`, ['admin']);
  if (adminCheck.rows.length === 0) {
    const hashed = await bcrypt.hash("Rayyanalsah227@", 10);
    await pool.query(
      `INSERT INTO users (username, password, role, cash, btc)
       VALUES ($1,$2,'admin',10000,10)`,
      ['admin', hashed]
    );
    console.log("✅ Admin created: username=admin, password=Rayyanalsah227@");
  }
})();

// ================= USER ROUTES =================

// Register
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    const hashed = await bcrypt.hash(password, 10);
    await pool.query(`INSERT INTO users (username, password) VALUES ($1,$2)`, [username, hashed]);
    res.json({ success: true, message: "Account created" });
  } catch (err) {
    res.json({ success: false, message: "Username exists" });
  }
});

// Login
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const result = await pool.query(`SELECT * FROM users WHERE username=$1`, [username]);
  if (result.rows.length === 0) return res.json({ success: false, message: "User not found" });

  const user = result.rows[0];
  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.json({ success: false, message: "Invalid password" });

  res.json({ success: true, user });
});

// Get user + trades
app.get('/user/:id', async (req, res) => {
  const { id } = req.params;
  const user = await pool.query(`SELECT * FROM users WHERE id=$1`, [id]);
  const trades = await pool.query(`SELECT * FROM trades WHERE user_id=$1 ORDER BY date DESC`, [id]);
  res.json({ success: true, user: user.rows[0], trades: trades.rows });
});

// Buy BTC
app.post('/buy', async (req, res) => {
  const { userId, amount, price } = req.body;
  const total = amount * price;
  const userRes = await pool.query(`SELECT * FROM users WHERE id=$1`, [userId]);
  const user = userRes.rows[0];

  if (user.cash < total) return res.json({ success: false, message: "Not enough cash" });

  await pool.query(`UPDATE users SET cash=cash-$1, btc=btc+$2 WHERE id=$3`, [total, amount, userId]);
  await pool.query(`INSERT INTO trades (user_id, type, amount, price) VALUES ($1,'BUY',$2,$3)`, [userId, amount, price]);
  res.json({ success: true });
});

// Sell BTC
app.post('/sell', async (req, res) => {
  const { userId, amount, price } = req.body;
  const userRes = await pool.query(`SELECT * FROM users WHERE id=$1`, [userId]);
  const user = userRes.rows[0];

  if (user.btc < amount) return res.json({ success: false, message: "Not enough BTC" });

  await pool.query(`UPDATE users SET cash=cash+($1*$2), btc=btc-$2 WHERE id=$3`, [price, amount, userId]);
  await pool.query(`INSERT INTO trades (user_id, type, amount, price) VALUES ($1,'SELL',$2,$3)`, [userId, amount, price]);
  res.json({ success: true });
});

// ================= WITHDRAWAL SYSTEM =================

// User requests withdrawal with safety checks
app.post('/withdraw', async (req, res) => {
  const { userId, amount, wallet } = req.body;
  try {
    if (amount <= 0) return res.json({ success: false, message: "Invalid withdrawal amount" });

    const userRes = await pool.query(`SELECT * FROM users WHERE id=$1`, [userId]);
    const user = userRes.rows[0];

    if (!user) return res.json({ success: false, message: "User not found" });
    if (user.cash < amount) return res.json({ success: false, message: "Not enough balance" });

    await pool.query(`UPDATE users SET cash=cash-$1 WHERE id=$2`, [amount, userId]);
    await pool.query(`INSERT INTO withdrawals (user_id, amount, wallet) VALUES ($1,$2,$3)`, [userId, amount, wallet]);

    res.json({ success: true, message: "Withdrawal request submitted!" });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: "Withdrawal failed" });
  }
});

// User withdrawal history
app.get('/user/:id/withdrawals', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`SELECT * FROM withdrawals WHERE user_id=$1 ORDER BY date DESC`, [id]);
    res.json({ success: true, withdrawals: result.rows });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: "Failed to fetch withdrawal history" });
  }
});

// ================= ADMIN ROUTES =================

// List all users
app.get('/admin/users', async (req, res) => {
  try {
    const result = await pool.query(`SELECT id, username, cash, btc FROM users WHERE role='user'`);
    res.json({ success: true, users: result.rows });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: "Error fetching users" });
  }
});

// List all trades
app.get('/admin/trades', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT trades.*, users.username 
      FROM trades 
      JOIN users ON trades.user_id = users.id
      ORDER BY trades.date DESC
    `);
    res.json({ success: true, trades: result.rows });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: "Error fetching trades" });
  }
});

// Top up balances
app.post('/admin/topup', async (req, res) => {
  const { userId, cash, btc } = req.body;
  try {
    await pool.query(`UPDATE users SET cash=cash+$1, btc=btc+$2 WHERE id=$3`, [cash, btc, userId]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: "Error topping up" });
  }
});

// Admin view all withdrawals
app.get('/admin/withdrawals', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT withdrawals.*, users.username
      FROM withdrawals
      JOIN users ON withdrawals.user_id = users.id
      ORDER BY withdrawals.date DESC
    `);
    res.json({ success: true, withdrawals: result.rows });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: "Error fetching withdrawals" });
  }
});

// Admin mark withdrawal as processed
app.post('/admin/withdrawals/process', async (req, res) => {
  const { id } = req.body;
  try {
    await pool.query(`UPDATE withdrawals SET status='processed' WHERE id=$1`, [id]);
    res.json({ success: true, message: "Withdrawal marked as processed" });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: "Error updating withdrawal" });
  }
});

// ================= START SERVER =================
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
