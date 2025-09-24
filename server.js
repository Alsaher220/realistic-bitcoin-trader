import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";
import { nanoid } from "nanoid";

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));

// ---- DB Setup ----
const adapter = new JSONFile("db.json");
const db = new Low(adapter, { users: [] });
await db.read();
db.data ||= { users: [] };

// ---- LOGIN ----
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  let user = db.data.users.find(u => u.username === username);

  if (!user) {
    // Create demo user
    user = {
      id: nanoid(),
      username,
      password, // not secure, but demo
      cash: 10000,
      btc: 0,
      trades: []
    };
    db.data.users.push(user);
    await db.write();
  }

  res.json({ id: user.id, username: user.username });
});

// ---- GET USER ----
app.get("/api/users/:id", async (req, res) => {
  const user = db.data.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(user);
});

// ---- TRADE ----
app.post("/api/trade", async (req, res) => {
  const { userId, type, amount, price } = req.body;
  const user = db.data.users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  const tradePrice = price || 50000; // fallback
  const usdCost = amount * tradePrice;

  if (type === "buy") {
    if (user.cash < usdCost) return res.status(400).json({ error: "Not enough cash" });
    user.cash -= usdCost;
    user.btc += amount;
  } else if (type === "sell") {
    if (user.btc < amount) return res.status(400).json({ error: "Not enough BTC" });
    user.btc -= amount;
    user.cash += usdCost;
  }

  const trade = {
    id: nanoid(),
    type,
    amount,
    price: tradePrice,
    date: new Date().toISOString()
  };
  user.trades.push(trade);

  await db.write();
  res.json(trade);
});

// ---- START SERVER ----
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
