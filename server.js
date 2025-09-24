const express = require("express");
const fs = require("fs");
const path = require("path");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const DB_FILE = path.join(__dirname, "db.json");

// Load DB
function loadDB() {
  return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
}

// Save DB
function saveDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// -------------------- API --------------------

// Get all users
app.get("/api/users", (req, res) => {
  const db = loadDB();
  res.json(db.users);
});

// Get single user
app.get("/api/users/:id", (req, res) => {
  const db = loadDB();
  const user = db.users.find(u => u.id === parseInt(req.params.id));
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(user);
});

// Trade (buy/sell)
app.post("/api/trade", (req, res) => {
  const { userId, type, amount } = req.body;
  const db = loadDB();
  const user = db.users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  const price = 30000; // Static price for demo (could be live API)
  if (type === "buy") {
    const cost = amount * price;
    if (user.cash < cost) return res.status(400).json({ error: "Not enough cash" });
    user.cash -= cost;
    user.btc += amount;
  } else if (type === "sell") {
    if (user.btc < amount) return res.status(400).json({ error: "Not enough BTC" });
    user.btc -= amount;
    user.cash += amount * price;
  }

  // Save trade
  db.trades.push({
    userId,
    type,
    amount,
    price,
    date: new Date().toISOString()
  });

  saveDB(db);
  res.json(user);
});

// Get all trades
app.get("/api/trades", (req, res) => {
  const db = loadDB();
  res.json(db.trades);
});

// Get trades for a specific user
app.get("/api/trades/:userId", (req, res) => {
  const db = loadDB();
  const trades = db.trades.filter(t => t.userId === parseInt(req.params.userId));
  res.json(trades);
});

// -------------------- SERVER --------------------
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
