// seed.js - Sample data for TradeSphere
require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

(async () => {
  try {
    // Hash password for sample users
    const userPassword = await bcrypt.hash("password123", 10);
    const adminPassword = await bcrypt.hash("admin123", 10);

    // Insert sample users (3 users)
    await pool.query(`
      INSERT INTO users (username, password, role, cash, btc)
      VALUES 
        ('user1', $1, 'user', 5000, 1),
        ('user2', $1, 'user', 3000, 0.5),
        ('user3', $1, 'user', 2000, 0.25)
      ON CONFLICT (username) DO NOTHING
    `, [userPassword]);

    // Insert admin user (optional row for testing)
    await pool.query(`
      INSERT INTO users (username, password, role, cash, btc)
      VALUES ('admin', $1, 'admin', 0, 0)
      ON CONFLICT (username) DO NOTHING
    `, [adminPassword]);

    // Insert sample trades
    await pool.query(`
      INSERT INTO trades (user_id, type, amount, price)
      VALUES 
        (1, 'BUY', 0.5, 40000),
        (2, 'SELL', 0.2, 42000)
    `);

    // Insert sample withdrawals
    await pool.query(`
      INSERT INTO withdrawals (user_id, amount, wallet, status)
      VALUES 
        (1, 200, 'wallet1', 'processed'),
        (2, 100, 'wallet2', 'pending')
    `);

    console.log("✅ Sample data inserted successfully!");
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
