import express from "express";
import fs from "fs";
import path from "path";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;
const __dirname = path.resolve();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const DB_FILE = path.join(__dirname, "backend/db.json");
const ADMIN_PASSWORD = "Rayyanalsah227@";

// Helpers
function loadDB() {
  return JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
}
function saveDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// ---- LOGIN ----
app.post("/api/login", (req, res) => {
  const { username } = req.body;
  let db = loadDB();

  let user = db.users.find(u => u.name === username);
  if (!user) {
    user = { id: db.users.length + 1, name: username, cash: 10000, btc: 0, trades: [] };
    db.users.push(user);
    saveDB(db);
  }
  res.json(user);
});

// ---- GET USER ----
app.get("/api/users/:id", (req, res) => {
  const db = loadDB();
  const user = db.users.find(u => u.id == req.params.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(user);
});

// ---- TRADE ----
app.post("/api/trade", (req, res) => {
  const { userId, type, amount, price } = req.body;
  const db = loadDB();
  let user = db.users.find(u => u.id == userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  if (type === "buy") {
    let cost = amount * price;
    if (user.cash < cost) return res.status(400).json({ error: "Not enough cash" });
    user.cash -= cost;
    user.btc += amount;
  } else if (type === "sell") {
    if (user.btc < amount) return res.status(400).json({ error: "Not enough BTC" });
    user.cash += amount * price;
    user.btc -= amount;
  }

  let trade = { type, amount, price, date: new Date() };
  user.trades.push(trade);

  saveDB(db);
  res.json(user);
});

// ---- ADMIN: UPDATE BALANCE ----
app.post("/api/admin/update", (req, res) => {
  const { username, cash, btc, password } = req.body;

  if (password !== ADMIN_PASSWORD) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const db = loadDB();
  let user = db.users.find(u => u.name === username);
  if (!user) return res.status(404).json({ error: "User not found" });

  if (cash !== undefined) user.cash = cash;
  if (btc !== undefined) user.btc = btc;

  saveDB(db);
  res.json({ success: true, user });
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
