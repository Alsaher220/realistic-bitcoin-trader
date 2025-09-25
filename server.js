// server.js (Postgres version)
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const app = express();
const PORT = process.env.PORT || 3000;

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- Initialize Tables ---
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      cash NUMERIC DEFAULT 1000,
      btc NUMERIC DEFAULT 0
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS trades (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES users(id) ON DELETE CASCADE,
      type TEXT,
      amount NUMERIC,
      price NUMERIC,
      date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Ensure admin exists
  const adminPass = await bcrypt.hash("Rayyanalsah227@", 10);
  await pool.query(
    `INSERT INTO users (username, password, cash, btc)
     VALUES ($1, $2, 0, 0)
     ON CONFLICT (username) DO NOTHING`,
    ['admin', adminPass]
  );
}
initDB();

// --- Routes ---

// Register
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.json({ success: false, message: "Missing fields" });

  const hashed = await bcrypt.hash(password, 10);
  try {
    await pool.query(
      `INSERT INTO users (username, password) VALUES ($1, $2)`,
      [username, hashed]
    );
    res.json({ success: true, message: "Account created!" });
  } catch (e) {
    res.json({ success: false, message: "Username already exists" });
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

  if (username === "admin") {
    res.json({ success: true, isAdmin: true });
  } else {
    res.json({ success: true, userId: user.id });
  }
});

// Get user info + trades
app.get('/user/:id', async (req, res) => {
  const { id } = req.params;
  const userRes = await pool.query(`SELECT id, username, cash, btc FROM users WHERE id=$1`, [id]);
  if (userRes.rows.length === 0) return res.json({ success: false });

  const tradesRes = await pool.query(`SELECT * FROM trades WHERE user_id=$1 ORDER BY date DESC`, [id]);
  res.json({ success: true, user: userRes.rows[0], trades: tradesRes.rows });
});

// Buy
app.post('/buy', async (req, res) => {
  const { userId, amount, price } = req.body;
  const cost = amount * price;

  const userRes = await pool.query(`SELECT * FROM users WHERE id=$1`, [userId]);
  const user = userRes.rows[0];
  if (!user || user.cash < cost) return res.json({ success: false, message: "Insufficient cash" });

  await pool.query(`UPDATE users SET cash=cash-$1, btc=btc+$2 WHERE id=$3`, [cost, amount, userId]);
  await pool.query(`INSERT INTO trades (user_id, type, amount, price) VALUES ($1,$2,$3,$4)`, [userId, "BUY", amount, price]);

  res.json({ success: true });
});

// Sell
app.post('/sell', async (req, res) => {
  const { userId, amount, price } = req.body;

  const userRes = await pool.query(`SELECT * FROM users WHERE id=$1`, [userId]);
  const user = userRes.rows[0];
  if (!user || user.btc < amount) return res.json({ success: false, message: "Insufficient BTC" });

  await pool.query(`UPDATE users SET btc=btc-$1, cash=cash+($1*$2) WHERE id=$3`, [amount, price, userId]);
  await pool.query(`INSERT INTO trades (user_id, type, amount, price) VALUES ($1,$2,$3,$4)`, [userId, "SELL", amount, price]);

  res.json({ success: true });
});

// --- Admin Endpoints ---
app.get('/admin/users', async (req, res) => {
  const users = await pool.query(`SELECT id, username, cash, btc FROM users`);
  res.json({ users: users.rows });
});

app.post('/admin/update', async (req, res) => {
  const { userId, cash, btc } = req.body;
  await pool.query(`UPDATE users SET cash=$1, btc=$2 WHERE id=$3`, [cash, btc, userId]);
  res.json({ success: true });
});

app.get('/admin/trades', async (req, res) => {
  const trades = await pool.query(`
    SELECT t.*, u.username 
    FROM trades t 
    JOIN users u ON t.user_id = u.id
    ORDER BY date DESC
  `);
  res.json({ trades: trades.rows });
});

// Start
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
