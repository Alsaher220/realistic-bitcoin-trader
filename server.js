/**
 * Realistic Bitcoin Trader - Backend Server
 * -----------------------------------------
 * Features:
 *  - Serves frontend from /public
 *  - Provides API for live BTC price (via CoinGecko)
 *  - User management (create accounts with starting balance)
 *  - Trade system (buy/sell BTC with virtual funds)
 *  - Stores data in db.json using LowDB
 *
 * Author: Alsaher220
 * License: MIT
 */

import express from "express";
import axios from "axios";
import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";

const app = express();
const PORT = process.env.PORT || 3000;

// ------------------------------
// Database Setup (LowDB + JSON)
// ------------------------------
const adapter = new JSONFile("db.json");
const db = new Low(adapter, { users: [], trades: [] });
await db.read();

// Ensure db.json always has structure
db.data ||= { users: [], trades: [] };
await db.write();

// ------------------------------
// Middleware
// ------------------------------
app.use(express.json());            // Parse JSON requests
app.use(express.static("public"));  // Serve frontend files

// ------------------------------
// Routes
// ------------------------------

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", server: "Realistic Bitcoin Trader" });
});

// Get live BTC price (from CoinGecko)
app.get("/api/price", async (req, res) => {
  try {
    const response = await axios.get(
      "https://api.coingecko.com/api/v3/simple/price",
      { params: { ids: "bitcoin", vs_currencies: "usd" } }
    );
    res.json(response.data.bitcoin);
  } catch (error) {
    console.error("❌ Error fetching BTC price:", error.message);
    res.status(500).json({ error: "Failed to fetch price" });
  }
});

// Get all users
app.get("/api/users", (req, res) => {
  res.json(db.data.users);
});

// Create a new user
app.post("/api/users", async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "Name is required" });

  const newUser = {
    id: Date.now(),
    name,
    cash: 10000, // default starting balance
    btc: 0
  };

  db.data.users.push(newUser);
  await db.write();

  console.log(`👤 New user created: ${name} (ID: ${newUser.id})`);
  res.json(newUser);
});

// Execute a trade
app.post("/api/trade", async (req, res) => {
  const { userId, type, amount, price } = req.body;

  if (!userId || !type || !amount || !price) {
    return res.status(400).json({ error: "Missing trade parameters" });
  }

  const user = db.data.users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  if (type === "buy") {
    const cost = amount * price;
    if (user.cash >= cost) {
      user.cash -= cost;
      user.btc += amount;
    } else {
      return res.status(400).json({ error: "Insufficient cash balance" });
    }
  } else if (type === "sell") {
    if (user.btc >= amount) {
      user.btc -= amount;
      user.cash += amount * price;
    } else {
      return res.status(400).json({ error: "Insufficient BTC balance" });
    }
  } else {
    return res.status(400).json({ error: "Invalid trade type" });
  }

  const trade = { userId, type, amount, price, date: new Date().toISOString() };
  db.data.trades.push(trade);
  await db.write();

  console.log(`💱 Trade executed: ${type} ${amount} BTC @ $${price} (User ${userId})`);
  res.json({ user, trade });
});

// Get trade history
app.get("/api/trades", (req, res) => {
  res.json(db.data.trades);
});

// ------------------------------
// Start Server
// ------------------------------
app.listen(PORT, () => {
  console.log(`🚀 Realistic Bitcoin Trader running at http://localhost:${PORT}`);
});
