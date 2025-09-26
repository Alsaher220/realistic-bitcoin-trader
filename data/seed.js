const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

(async () => {
  try {
    // Add sample users
    const password = await bcrypt.hash("password123", 10);
    await pool.query(`INSERT INTO users (username, password, role, cash, btc)
                      VALUES ('user1', $1, 'user', 5000, 1),
                             ('user2', $1, 'user', 3000, 0.5)`, [password]);

    // Add sample trades
    await pool.query(`INSERT INTO trades (user_id, type, amount, price)
                      VALUES (1, 'BUY', 0.5, 40000),
                             (2, 'SELL', 0.2, 42000)`);

    // Add sample withdrawals
    await pool.query(`INSERT INTO withdrawals (user_id, amount, wallet, status)
                      VALUES (1, 200, 'wallet1', 'processed'),
                             (2, 100, 'wallet2', 'pending')`);

    console.log("✅ Sample data inserted!");
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
