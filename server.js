const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, "db.json");

app.use(express.json());

// Serve static frontend files from "public"
app.use(express.static(path.join(__dirname, "public")));

// Helper: Load database
function loadDB() {
  try {
    const data = fs.readFileSync(DB_FILE, "utf8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading db.json:", err);
    return { users: [], trades: [] };
  }
}

// Helper: Save database
function saveDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

// ----------- API ROUTES -----------

// Get all users
app.get("/api/users", (req, res) => {
  const db = loadDB();
  res.json(db.users);
});

// Get single user by ID
app.get("/api/users/:id", (req, res) => {
  const db = loadDB();
  const user = db.users.find(u => u.id === parseInt(req.params.id));
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(user);
});

// Create a new user
app.post("/api/users", (req, res) => {
  const db = loadDB();
  const newUser = {
    id: Date.now(),
    name: req.body.name || "Trader",
    cash: req.body.cash || 10000,
    btc: req.body.btc || 0
  };
  db.users.push(newUser);
  saveDB(db);
  res.json(newUser);
});

// Handle a trade (buy/sell)
app.post("/api/trade", (req, res) => {
  const { userId, type, amount } = req.body;
  const db = loadDB();
  const user = db.users.find(u => u.id === userId);

  if (!user) return res.status(404).json({ error: "User not found" });
  if (!["buy", "sell"].includes(type)) return res.status(400).json({ error: "Invalid trade type" });

  // Simulated BTC price (for demo, frontend chart fetches real price separately)
  const price = 30000 + Math.floor(Math.random() * 2000);

  if (type === "buy") {
    const cost = amount * price;
    if (user.cash < cost) return res.status(400).json({ error: "Not enough cash" });
    user.cash -= cost;
    user.btc += amount;
  } else if (type === "sell") {
    if (user.btc < amount) return res.status(400).json({ error: "Not enough BTC" });
    user.cash += amount * price;
    user.btc -= amount;
  }

  const trade = {
    userId,
    type,
    amount,
    price,
    date: new Date().toISOString()
  };

  db.trades.push(trade);
  saveDB(db);

  res.json({ message: "Trade successful", user, trade });
});

// ----------- START SERVER -----------

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
