// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const port = process.env.PORT || 5000;

// —————–– POSTGRES CONNECTION —————––
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

pool.connect()
  .then(client => {
    console.log("Postgres connected successfully.");
    client.release();
  })
  .catch(err => console.error("Postgres connection error:", err.stack));

// —————–– DATABASE SETUP & SEED —————––
(async () => {
  try {
    console.log("Starting database setup...");

    const usersCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'users'
      );
    `);

    if (!usersCheck.rows[0].exists) {
      console.log("WARNING: Users table does not exist yet. Please run your SQL setup file first.");
      return;
    }

    // Add profile_picture column if doesn't exist
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture TEXT;`);

    // Add security questions columns if don't exist
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS security_question_1 TEXT;`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS security_answer_1 TEXT;`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS security_question_2 TEXT;`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS security_answer_2 TEXT;`);
    console.log("Profile picture and security questions columns ensured.");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS support_messages (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        sender VARCHAR(10) NOT NULL CHECK (sender IN ('user', 'admin')),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("Support messages table ensured.");

    const userCount = await pool.query('SELECT COUNT(*) FROM users');
    if (parseInt(userCount.rows[0].count) > 0) {
      await pool.query(`
        UPDATE users
        SET preferred_name = username
        WHERE preferred_name IS NULL
      `);
      
      await pool.query(`
        UPDATE users
        SET cash = 50
        WHERE cash IS NULL OR cash < 50
      `);
      console.log("Existing users fixed: preferred_name and cash ensured.");
    }

  } catch (err) {
    console.error("DATABASE SETUP ERROR:", err.message);
    console.error("Stack:", err.stack);
  }
})();

// —————–– MIDDLEWARE —————––
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(express.static('public'));

// —————–– VERIFY ADMIN —————––
function verifyAdmin(req, res, next) {
  const userId = req.headers['x-user-id'];
  if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

  pool.query('SELECT role FROM users WHERE id=$1', [userId])
    .then(result => {
      if (result.rows[0]?.role === 'admin') next();
      else res.status(403).json({ success: false, message: 'Forbidden: Admins only' });
    })
    .catch(err => {
      console.error("verifyAdmin error:", err.stack);
      res.status(500).json({ success: false, message: 'Server error' });
    });
}

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

app.get('/', (req, res) => res.send('TradeSphere Server is running!'));

// —————–– AUTH —————––
app.post('/register', asyncHandler(async (req, res) => {
  const { username, password, preferredName, securityQuestion1, securityAnswer1, securityQuestion2, securityAnswer2 } = req.body;
  if (!username || !password) return res.json({ success: false, message: 'All fields required' });

  if (!securityQuestion1 || !securityAnswer1 || !securityQuestion2 || !securityAnswer2) {
    return res.json({ success: false, message: 'Security questions required' });
  }

  const hashed = await bcrypt.hash(password, 10);
  const hashedAnswer1 = await bcrypt.hash(securityAnswer1.toLowerCase().trim(), 10);
  const hashedAnswer2 = await bcrypt.hash(securityAnswer2.toLowerCase().trim(), 10);
  const defaultCash = 50;
  const defaultBTC = 0;

  try {
    const result = await pool.query(
      'INSERT INTO users (username, preferred_name, password, cash, btc, role, security_question_1, security_answer_1, security_question_2, security_answer_2) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id, username, preferred_name, cash, btc, role',
      [username, preferredName || username, hashed, defaultCash, defaultBTC, 'user', securityQuestion1, hashedAnswer1, securityQuestion2, hashedAnswer2]
    );
    res.json({ success: true, message: 'User registered!', user: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      res.json({ success: false, message: 'Username already exists' });
    } else {
      console.error("Register error:", err.stack);
      res.json({ success: false, message: 'Registration failed' });
    }
  }
}));

app.post('/login', asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  const result = await pool.query(
    'SELECT id, username, preferred_name, password, cash, btc, role, profile_picture FROM users WHERE username=$1',
    [username]
  );
  const user = result.rows[0];
  if (!user) return res.json({ success: false, message: 'User not found' });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.json({ success: false, message: 'Incorrect password' });

  res.json({
    success: true,
    message: 'Login successful',
    user: {
      id: user.id,
      username: user.username,
      preferredName: user.preferred_name,
      cash: user.cash,
      btc: user.btc,
      role: user.role,
      profilePicture: user.profile_picture
    }
  });
}));

// —————–– USER ROUTES —————––
app.get('/user/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userRes = await pool.query(
    'SELECT id, username, preferred_name, cash, btc, profile_picture FROM users WHERE id=$1',
    [id]
  );
  const user = userRes.rows[0];
  if (!user) return res.json({ success: false, message: 'User not found' });

  const withdrawalsRes = await pool.query(
    'SELECT amount, wallet, status, date FROM withdrawals WHERE user_id=$1 ORDER BY date DESC',
    [id]
  );

  const investmentsRes = await pool.query(
    'SELECT plan, amount, status, created_at FROM investments WHERE user_id=$1 ORDER BY created_at DESC',
    [id]
  );

  const supportRes = await pool.query(
    'SELECT id, message, sender, created_at FROM support_messages WHERE user_id=$1 ORDER BY created_at ASC',
    [id]
  );

  res.json({
    success: true,
    user,
    withdrawals: withdrawalsRes.rows,
    investments: investmentsRes.rows,
    supportMessages: supportRes.rows
  });
}));

// Upload profile picture
app.post('/user/upload-picture', asyncHandler(async (req, res) => {
  const { userId, imageData } = req.body;
  if (!userId || !imageData) return res.json({ success: false, message: 'Missing data' });

  if (!imageData.startsWith('data:image/')) {
    return res.json({ success: false, message: 'Invalid image format' });
  }

  if (imageData.length > 2 * 1024 * 1024) {
    return res.json({ success: false, message: 'Image too large. Max 2MB.' });
  }

  await pool.query('UPDATE users SET profile_picture=$1 WHERE id=$2', [imageData, userId]);
  res.json({ success: true, message: 'Profile picture updated!' });
}));

// —————–– SUPPORT ROUTES —————––
app.post('/support/message', asyncHandler(async (req, res) => {
  const { userId, message } = req.body;
  if (!userId || !message) return res.json({ success: false, message: 'User ID and message required' });

  await pool.query(
    'INSERT INTO support_messages (user_id, message, sender, created_at) VALUES ($1,$2,$3,NOW())',
    [userId, message, 'user']
  );

  res.json({ success: true, message: 'Support message sent!' });
}));

app.get('/admin/support', verifyAdmin, asyncHandler(async (req, res) => {
  const result = await pool.query(`SELECT s.id, s.user_id, s.message, s.sender, s.created_at, u.username FROM support_messages s JOIN users u ON s.user_id = u.id ORDER BY s.created_at DESC`);
  res.json({ success: true, messages: result.rows });
}));

// —————–– ADMIN ROUTES —————––
app.get('/admin/users', verifyAdmin, asyncHandler(async (req, res) => {
  const result = await pool.query('SELECT id, username, preferred_name, cash, btc FROM users ORDER BY id ASC');
  res.json({ success: true, users: result.rows });
}));

app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public', 'user-dashboard.html')));
app.get('/admin-dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin-dashboard.html')));

// —————–– ERROR HANDLER —————––
app.use((err, req, res, next) => {
  console.error("=== UNHANDLED ERROR ===");
  console.error("Path:", req.path);
  console.error("Method:", req.method);
  console.error("Error:", err.stack);
  console.error("=======================");
  res.status(500).json({ success: false, message: 'Server error', error: err.message });
});

app.listen(port, () => console.log(`Server running on port ${port}`));
