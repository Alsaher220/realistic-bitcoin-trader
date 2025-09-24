// server.js
const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, "db.json");

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Safe DB helpers
function loadDB() {
  try {
    const raw = fs.readFileSync(DB_PATH, "utf8");
    const db = JSON.parse(raw);
    // ensure arrays exist
    db.users = db.users || [];
    return db;
  } catch (e) {
    return { users: [] };
  }
}
function saveDB(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

// --------- API ---------

// POST /api/login
// Accepts { username, password } — demo: any password acceptable.
// If username exists, return existing user; otherwise create a demo user.
app.post("/api/login", (req, res) => {
  const { username } = req.body;
  if (!username || typeof username !== "string") {
    return res.status(400).json({ error: "username required" });
  }

  const db = loadDB();
  let user = db.users.find(u => u.username.toLowerCase() === username.toLowerCase());

  if (!user) {
    // create new demo user
    user = {
      id: Date.now(),            // simple id
      username,
      cash: 10000.0,            // demo starting cash
      btc: 0.0,
      trades: []
    };
    db.users.push(user);
    saveDB(db);
  }

  // return a safe user object
  const safe = { id: user.id, username: user.username, cash: user.cash, btc: user.btc };
  res.json(safe);
});

// GET /api/users/:id
app.get("/api/users/:id", (req, res) => {
  const db = loadDB();
  const user = db.users.find(u => u.id == req.params.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  // send user + trades
  res.json({
    id: user.id,
    username: user.username,
    cash: user.cash,
    btc: user.btc,
    trades: user.trades || []
  });
});

// POST /api/trade
// Body: { userId, type: "buy"|"sell", amount, price (optional) }
// This updates the user's cash and btc and appends trade to user.trades
app.post("/api/trade", (req, res) => {
  try {
    const { userId, type, amount, price } = req.body;
    const db = loadDB();
    const user = db.users.find(u => u.id == userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const amt = Number(amount);
    if (!amt || isNaN(amt) || amt <= 0) return res.status(400).json({ error: "Invalid amount" });

    // Determine price: if provided use it, otherwise use a simulated/live fallback
    let tradePrice = Number(price) || 30000; // fallback demo price
    tradePrice = Math.max(1, tradePrice);

    if (type === "buy") {
      const cost = Number((amt * tradePrice).toFixed(2));
      if (user.cash < cost) return res.status(400).json({ error: "Not enough cash" });
      user.cash = Number((user.cash - cost).toFixed(2));
      user.btc = Number((user.btc + amt).toFixed(8));
    } else if (type === "sell") {
      if (user.btc < amt) return res.status(400).json({ error: "Not enough BTC" });
      user.btc = Number((user.btc - amt).toFixed(8));
      user.cash = Number((user.cash + amt * tradePrice).toFixed(2));
    } else {
      return res.status(400).json({ error: "Invalid trade type" });
    }

    const trade = {
      id: Date.now(),
      userId: user.id,
      type,
      amount: amt,
      price: tradePrice,
      date: new Date().toISOString()
    };

    user.trades = user.trades || [];
    user.trades.unshift(trade); // newest first

    saveDB(db);

    res.json({ user: { id: user.id, username: user.username, cash: user.cash, btc: user.btc }, trade });
  } catch (err) {
    console.error("trade error", err);
    res.status(500).json({ error: "Trade failed" });
  }
});

// GET /api/trades/:userId
app.get("/api/trades/:userId", (req, res) => {
  const db = loadDB();
  const user = db.users.find(u => u.id == req.params.userId);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(user.trades || []);
});

// Fallback route (serve frontend SPA)
app.get("*", (req, res) => {
  const indexPath = path.join(__dirname, "public", "index.html");
  if (fs.existsSync(indexPath)) return res.sendFile(indexPath);
  res.status(404).send("Not found");
});

// Start
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
