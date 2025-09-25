const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to Postgres (Render provides DATABASE_URL in env vars)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// ✅ Ensure tables + admin exist
(async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE,
      password TEXT,
      cash NUMERIC DEFAULT 1000,
      btc NUMERIC DEFAULT 0,
      role TEXT DEFAULT 'user'
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS trades (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      type TEXT,
      amount NUMERIC,
      price NUMERIC,
      date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Ensure admin exists
  const adminCheck = await pool.query(
    `SELECT * FROM users WHERE username=$1`,
    ['admin']
  );

  if (adminCheck.rows.length === 0) {
    const hashed = await bcrypt.hash("Rayyanalsah227@", 10);
    await pool.query(
      `INSERT INTO users (username, password, role, cash, btc) 
       VALUES ($1,$2,'admin',10000,10)`,
      ['admin', hashed]
    );
    console.log("✅ Admin created: username=admin, password=Rayyanalsah227@");
  } else {
    // Ensure admin has correct role
    await pool.query(`UPDATE users SET role='admin' WHERE username='admin'`);
  }
})();

// 🔑 Middleware: require admin
function requireAdmin(req, res, next) {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({ success: false, message: "Forbidden" });
}

// 📝 Register
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    const hashed = await bcrypt.hash(password, 10);
    await pool.query(
      `INSERT INTO users (username, password) VALUES ($1,$2)`,
      [username, hashed]
    );
    res.json({ success: true, message: "Account created" });
  } catch (err) {
    res.json({ success: false, message: "Username already exists" });
  }
});

// 🔑 Login
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const result = await pool.query(
    `SELECT * FROM users WHERE username=$1`,
    [username]
  );

  if (result.rows.length === 0)
    return res.json({ success: false, message: "User not found" });

  const user = result.rows[0];
  const match = await bcrypt.compare(password, user.password);

  if (!match)
    return res.json({ success: false, message: "Invalid password" });

  // ✅ Return role so frontend knows where to send user
  res.json({
    success: true,
    user: {
      id: user.id,
      username: user.username,
      cash: user.cash,
      btc: user.btc,
      role: user.role
    }
  });
});

// 👤 Get user + trades
app.get('/user/:id', async (req, res) => {
  const { id } = req.params;
  const user = await pool.query(`SELECT * FROM users WHERE id=$1`, [id]);
  const trades = await pool.query(
    `SELECT * FROM trades WHERE user_id=$1 ORDER BY date DESC`,
    [id]
  );
  res.json({ success: true, user: user.rows[0], trades: trades.rows });
});

// 💰 Buy BTC
app.post('/buy', async (req, res) => {
  const { userId, amount, price } = req.body;
  const total = amount * price;
  const userRes = await pool.query(`SELECT * FROM users WHERE id=$1`, [userId]);
  const user = userRes.rows[0];

  if (user.cash < total)
    return res.json({ success: false, message: "Not enough cash" });

  await pool.query(
    `UPDATE users SET cash=cash-$1, btc=btc+$2 WHERE id=$3`,
    [total, amount, userId]
  );
  await pool.query(
    `INSERT INTO trades (user_id, type, amount, price) VALUES ($1,'BUY',$2,$3)`,
    [userId, amount, price]
  );
  res.json({ success: true });
});

// 💸 Sell BTC
app.post('/sell', async (req, res) => {
  const { userId, amount, price } = req.body;
  const userRes = await pool.query(`SELECT * FROM users WHERE id=$1`, [userId]);
  const user = userRes.rows[0];

  if (user.btc < amount)
    return res.json({ success: false, message: "Not enough BTC" });

  await pool.query(
    `UPDATE users SET cash=cash+($1*$2), btc=btc-$2 WHERE id=$3`,
    [price, amount, userId]
  );
  await pool.query(
    `INSERT INTO trades (user_id, type, amount, price) VALUES ($1,'SELL',$2,$3)`,
    [userId, amount, price]
  );
  res.json({ success: true });
});

// 👑 Admin - list all users
app.get('/admin/users', async (req, res) => {
  const result = await pool.query(
    `SELECT id, username, cash, btc, role FROM users`
  );
  res.json({ success: true, users: result.rows });
});

// 👑 Admin - top up user
app.post('/admin/topup', async (req, res) => {
  const { userId, cash, btc } = req.body;
  await pool.query(
    `UPDATE users SET cash=cash+$1, btc=btc+$2 WHERE id=$3`,
    [cash, btc, userId]
  );
  res.json({ success: true });
});

app.listen(PORT, () =>
  console.log(`🚀 Server running on port ${PORT}`)
);
