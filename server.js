import express from "express";
import bodyParser from "body-parser";
import bcrypt from "bcrypt";
import pkg from "pg";
import cors from "cors";

const { Pool } = pkg;

const app = express();
app.use(bodyParser.json());
app.use(cors());

// 🔑 Database pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// 📌 Helper: fetch user by username
async function getUserByUsername(username) {
  const result = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
  return result.rows[0];
}

// 📌 Register
app.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.json({ success: false, message: "Missing fields" });

    const existing = await getUserByUsername(username);
    if (existing) return res.json({ success: false, message: "Username already exists" });

    const hashed = await bcrypt.hash(password, 10);

    const result = await pool.query(
      "INSERT INTO users (username, password, role, cash, btc) VALUES ($1,$2,'user',10000,0) RETURNING id, username, role, cash, btc",
      [username, hashed]
    );

    res.json({ success: true, message: "User registered successfully", user: result.rows[0] });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// 📌 Login
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await getUserByUsername(username);
    if (!user) return res.json({ success: false, message: "Invalid credentials" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.json({ success: false, message: "Invalid credentials" });

    // Don’t leak password
    const safeUser = { id: user.id, username: user.username, role: user.role, cash: user.cash, btc: user.btc };
    res.json({ success: true, user: safeUser });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// 📌 Get user + trades
app.get("/user/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const userResult = await pool.query("SELECT id, username, role, cash, btc FROM users WHERE id = $1", [id]);
    const user = userResult.rows[0];
    if (!user) return res.json({ success: false, message: "User not found" });

    const tradesResult = await pool.query(
      "SELECT type, amount, price, date FROM trades WHERE user_id = $1 ORDER BY date DESC",
      [id]
    );

    res.json({ success: true, user, trades: tradesResult.rows });
  } catch (err) {
    console.error("Get user error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// 📌 Buy BTC
app.post("/buy", async (req, res) => {
  try {
    const { userId, amount, price } = req.body;
    const cost = amount * price;

    const result = await pool.query("SELECT * FROM users WHERE id = $1", [userId]);
    const user = result.rows[0];
    if (!user || user.cash < cost) return res.json({ success: false, message: "Not enough cash" });

    await pool.query("UPDATE users SET cash = cash - $1, btc = btc + $2 WHERE id = $3", [cost, amount, userId]);
    await pool.query("INSERT INTO trades (user_id, type, amount, price, date) VALUES ($1,'buy',$2,$3,NOW())", [
      userId,
      amount,
      price
    ]);

    res.json({ success: true, message: "BTC purchased" });
  } catch (err) {
    console.error("Buy error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// 📌 Sell BTC
app.post("/sell", async (req, res) => {
  try {
    const { userId, amount, price } = req.body;
    const result = await pool.query("SELECT * FROM users WHERE id = $1", [userId]);
    const user = result.rows[0];
    if (!user || user.btc < amount) return res.json({ success: false, message: "Not enough BTC" });

    await pool.query("UPDATE users SET btc = btc - $1, cash = cash + $2 WHERE id = $3", [amount, amount * price, userId]);
    await pool.query("INSERT INTO trades (user_id, type, amount, price, date) VALUES ($1,'sell',$2,$3,NOW())", [
      userId,
      amount,
      price
    ]);

    res.json({ success: true, message: "BTC sold" });
  } catch (err) {
    console.error("Sell error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// 📌 Admin: get all users
app.get("/admin/users", async (req, res) => {
  try {
    const result = await pool.query("SELECT id, username, cash, btc, role FROM users ORDER BY id ASC");
    res.json({ success: true, users: result.rows });
  } catch (err) {
    console.error("Admin fetch users error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// 📌 Admin: top-up user
app.post("/admin/topup", async (req, res) => {
  try {
    const { userId, cash, btc } = req.body;
    await pool.query("UPDATE users SET cash = cash + $1, btc = btc + $2 WHERE id = $3", [cash, btc, userId]);
    res.json({ success: true, message: "Top-up successful" });
  } catch (err) {
    console.error("Admin top-up error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
