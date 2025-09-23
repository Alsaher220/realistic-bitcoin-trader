const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static frontend files from "public"
app.use(express.static(path.join(__dirname, "public")));

// Basic health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Realistic Bitcoin Trader API is running 🚀" });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
