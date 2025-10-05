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

// ------------------- POSTGRES CONNECTION -------------------
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

// ------------------- DATABASE SETUP & SEED -------------------
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
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture TEXT;
    `);
    
    // Add security questions columns if don't exist
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS security_question_1 TEXT;
    `);
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS security_answer_1 TEXT;
    `);
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS security_question_2 TEXT;
    `);
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS security_answer_2 TEXT;
    `);
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

    // Create NFT tables if they don't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS nfts (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        image_url TEXT NOT NULL,
        collection_name TEXT,
        blockchain TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS nft_assignments (
        id SERIAL PRIMARY KEY,
        nft_id INTEGER NOT NULL REFERENCES nfts(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        assigned_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(nft_id, user_id)
      )
    `);
    console.log("NFT tables ensured.");

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

// ------------------- MIDDLEWARE -------------------
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(express.static('public'));

// ------------------- VERIFY ADMIN -------------------
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

  // Get user's NFTs
  const nftsRes = await pool.query(`
    SELECT n.id, n.title, n.description, n.image_url, n.collection_name, n.blockchain, na.assigned_at
    FROM nfts n
    JOIN nft_assignments na ON n.id = na.nft_id
    WHERE na.user_id = $1
    ORDER BY na.assigned_at DESC
  `, [id]);

  res.json({
    success: true,
    user,
    withdrawals: withdrawalsRes.rows,
    investments: investmentsRes.rows,
    supportMessages: supportRes.rows,
    nfts: nftsRes.rows
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

// Get security questions for password reset
app.post('/forgot-password/questions', asyncHandler(async (req, res) => {
  const { username } = req.body;
  if (!username) return res.json({ success: false, message: 'Username required' });

  const result = await pool.query(
    'SELECT id, security_question_1, security_question_2 FROM users WHERE username=$1',
    [username]
  );
  const user = result.rows[0];
  
  if (!user) return res.json({ success: false, message: 'User not found' });
  if (!user.security_question_1 || !user.security_question_2) {
    return res.json({ success: false, message: 'Security questions not set for this account' });
  }

  res.json({
    success: true,
    userId: user.id,
    question1: user.security_question_1,
    question2: user.security_question_2
  });
}));

// Verify security answers and reset password
app.post('/forgot-password/reset', asyncHandler(async (req, res) => {
  const { userId, answer1, answer2, newPassword } = req.body;
  if (!userId || !answer1 || !answer2 || !newPassword) {
    return res.json({ success: false, message: 'All fields required' });
  }

  const result = await pool.query(
    'SELECT security_answer_1, security_answer_2 FROM users WHERE id=$1',
    [userId]
  );
  const user = result.rows[0];
  if (!user) return res.json({ success: false, message: 'User not found' });

  const match1 = await bcrypt.compare(answer1.toLowerCase().trim(), user.security_answer_1);
  const match2 = await bcrypt.compare(answer2.toLowerCase().trim(), user.security_answer_2);

  if (!match1 || !match2) {
    return res.json({ success: false, message: 'Security answers incorrect' });
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await pool.query('UPDATE users SET password=$1 WHERE id=$2', [hashedPassword, userId]);

  res.json({ success: true, message: 'Password reset successful!' });
}));

app.post('/withdraw', asyncHandler(async (req, res) => {
  const { userId, amount, wallet } = req.body;
  if (!userId || !amount) return res.json({ success: false, message: 'Missing fields' });

  const userRes = await pool.query('SELECT cash FROM users WHERE id=$1', [userId]);
  const user = userRes.rows[0];
  if (!user) return res.json({ success: false, message: 'User not found' });
  if (Number(user.cash) < Number(amount)) return res.json({ success: false, message: 'Insufficient cash' });

  await pool.query('UPDATE users SET cash=cash-$1 WHERE id=$2', [amount, userId]);
  await pool.query('INSERT INTO withdrawals (user_id, amount, wallet, status, date) VALUES ($1,$2,$3,$4,NOW())', [userId, amount, wallet || null, 'pending']);

  res.json({ success: true, message: 'Withdrawal requested!' });
}));

app.post('/support/message', asyncHandler(async (req, res) => {
  const { userId, message } = req.body;
  if (!userId || !message) return res.json({ success: false, message: 'User ID and message required' });

  await pool.query(
    'INSERT INTO support_messages (user_id, message, sender, created_at) VALUES ($1,$2,$3,NOW())',
    [userId, message, 'user']
  );

  res.json({ success: true, message: 'Support message sent!' });
}));

// ------------------- NFT ENDPOINTS -------------------

// Admin: Get all NFTs
app.get('/admin/nfts', verifyAdmin, asyncHandler(async (req, res) => {
  const result = await pool.query(`
    SELECT id, title, description, image_url, collection_name, blockchain, created_at
    FROM nfts
    ORDER BY created_at DESC
  `);
  res.json({ success: true, nfts: result.rows });
}));

// Admin: Create new NFT
app.post('/admin/nfts/create', verifyAdmin, asyncHandler(async (req, res) => {
  const { title, description, imageUrl, collectionName, blockchain } = req.body;
  
  if (!title || !imageUrl) {
    return res.json({ success: false, message: 'Title and image URL are required' });
  }

  const result = await pool.query(
    'INSERT INTO nfts (title, description, image_url, collection_name, blockchain, created_at) VALUES ($1,$2,$3,$4,$5,NOW()) RETURNING *',
    [title, description || '', imageUrl, collectionName || '', blockchain || '']
  );

  res.json({ success: true, message: 'NFT created successfully!', nft: result.rows[0] });
}));

// Admin: Delete NFT
app.post('/admin/nfts/delete', verifyAdmin, asyncHandler(async (req, res) => {
  const { nftId } = req.body;
  
  if (!nftId) return res.json({ success: false, message: 'NFT ID required' });

  // This will also delete all assignments due to CASCADE
  await pool.query('DELETE FROM nfts WHERE id=$1', [nftId]);

  res.json({ success: true, message: 'NFT deleted successfully!' });
}));

// Admin: Assign NFT to user
app.post('/admin/nfts/assign', verifyAdmin, asyncHandler(async (req, res) => {
  const { nftId, userId } = req.body;
  
  if (!nftId || !userId) {
    return res.json({ success: false, message: 'NFT ID and User ID required' });
  }

  try {
    await pool.query(
      'INSERT INTO nft_assignments (nft_id, user_id, assigned_at) VALUES ($1,$2,NOW())',
      [nftId, userId]
    );
    res.json({ success: true, message: 'NFT assigned to user!' });
  } catch (err) {
    if (err.code === '23505') {
      res.json({ success: false, message: 'NFT already assigned to this user' });
    } else {
      throw err;
    }
  }
}));

// Admin: Remove NFT from user
app.post('/admin/nfts/unassign', verifyAdmin, asyncHandler(async (req, res) => {
  const { nftId, userId } = req.body;
  
  if (!nftId || !userId) {
    return res.json({ success: false, message: 'NFT ID and User ID required' });
  }

  await pool.query(
    'DELETE FROM nft_assignments WHERE nft_id=$1 AND user_id=$2',
    [nftId, userId]
  );

  res.json({ success: true, message: 'NFT removed from user!' });
}));

// Admin: Get all NFT assignments
app.get('/admin/nfts/assignments', verifyAdmin, asyncHandler(async (req, res) => {
  const result = await pool.query(`
    SELECT na.id, na.nft_id, na.user_id, na.assigned_at,
           n.title as nft_title, n.image_url,
           u.username
    FROM nft_assignments na
    JOIN nfts n ON na.nft_id = n.id
    JOIN users u ON na.user_id = u.id
    ORDER BY na.assigned_at DESC
  `);
  res.json({ success: true, assignments: result.rows });
}));

// Admin: Get user's NFTs (for assignment management)
app.get('/admin/users/:userId/nfts', verifyAdmin, asyncHandler(async (req, res) => {
  const { userId } = req.params;
  
  const result = await pool.query(`
    SELECT n.id, n.title, n.description, n.image_url, n.collection_name, n.blockchain, na.assigned_at
    FROM nfts n
    JOIN nft_assignments na ON n.id = na.nft_id
    WHERE na.user_id = $1
    ORDER BY na.assigned_at DESC
  `, [userId]);

  res.json({ success: true, nfts: result.rows });
}));

// ------------------- END NFT ENDPOINTS -------------------

app.get('/admin/support', verifyAdmin, asyncHandler(async (req, res) => {
  const result = await pool.query(`
    SELECT s.id, s.user_id, s.message, s.sender, s.created_at, u.username
    FROM support_messages s
    JOIN users u ON s.user_id = u.id
    ORDER BY s.created_at DESC
  `);
  res.json({ success: true, messages: result.rows });
}));

app.get('/admin/support/messages/:userId', verifyAdmin, asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const result = await pool.query(
    'SELECT id, message, sender, created_at FROM support_messages WHERE user_id=$1 ORDER BY created_at ASC',
    [userId]
  );
  res.json({ success: true, messages: result.rows });
}));

app.post('/admin/support/send', verifyAdmin, asyncHandler(async (req, res) => {
  const { userId, message } = req.body;
  if (!userId || !message) return res.json({ success: false, message: 'User ID and message required' });

  await pool.query(
    'INSERT INTO support_messages (user_id, message, sender, created_at) VALUES ($1,$2,$3,NOW())',
    [userId, message, 'admin']
  );

  res.json({ success: true, message: 'Message sent!' });
}));

app.post('/admin/support/reply', verifyAdmin, asyncHandler(async (req, res) => {
  const { userId, message, replyTo } = req.body;
  if (!userId || !message) return res.json({ success: false, message: 'User ID and reply message required' });

  await pool.query(
    'INSERT INTO support_messages (user_id, message, sender, created_at) VALUES ($1,$2,$3,NOW())',
    [userId, message, 'admin']
  );

  res.json({ success: true, message: 'Reply sent!' });
}));

app.get('/admin/users', verifyAdmin, asyncHandler(async (req, res) => {
  const result = await pool.query('SELECT id, username, preferred_name, cash, btc FROM users ORDER BY id ASC');
  res.json({ success: true, users: result.rows });
}));

app.post('/admin/topup', verifyAdmin, asyncHandler(async (req, res) => {
  const { userId, cash = 0, btc = 0, investmentAmount = 0, investmentPlan } = req.body;
  const adminUserId = req.headers['x-user-id'];
  if (!userId) return res.json({ success: false, message: 'User ID is required' });

  const userRes = await pool.query('SELECT cash, btc FROM users WHERE id=$1', [userId]);
  const user = userRes.rows[0];
  if (!user) return res.json({ success: false, message: 'User not found' });

  const newCash = Number(user.cash) + Number(cash);
  const newBTC = Number(user.btc) + Number(btc);
  await pool.query('UPDATE users SET cash=$1, btc=$2 WHERE id=$3', [newCash, newBTC, userId]);

  if (investmentAmount && investmentPlan) {
    await pool.query(
      'INSERT INTO investments (user_id, plan, amount, status, created_at) VALUES ($1,$2,$3,$4,NOW())',
      [userId, investmentPlan, investmentAmount, 'active']
    );
  }

  await pool.query(
    'INSERT INTO topups (user_id, amount, admin_id, date) VALUES ($1,$2,$3,NOW())',
    [userId, Number(cash) + Number(btc), adminUserId || null]
  );

  res.json({ success: true, message: 'Top-up successful!' });
}));

app.post('/admin/reduce', verifyAdmin, asyncHandler(async (req, res) => {
  const { userId, cash = 0, btc = 0 } = req.body;
  const adminUserId = req.headers['x-user-id'];
  if (!userId) return res.json({ success: false, message: 'User ID is required' });

  const userRes = await pool.query('SELECT cash, btc FROM users WHERE id=$1', [userId]);
  const user = userRes.rows[0];
  if (!user) return res.json({ success: false, message: 'User not found' });
  if (Number(user.cash) < Number(cash) || Number(user.btc) < Number(btc)) return res.json({ success: false, message: 'Insufficient balance to reduce' });

  const newCash = Number(user.cash) - Number(cash);
  const newBTC = Number(user.btc) - Number(btc);
  await pool.query('UPDATE users SET cash=$1, btc=$2 WHERE id=$3', [newCash, newBTC, userId]);

  await pool.query(
    'INSERT INTO topups (user_id, amount, admin_id, date) VALUES ($1,$2,$3,NOW())',
    [userId, -(Number(cash) + Number(btc)), adminUserId || null]
  );

  res.json({ success: true, message: 'Reduce successful!' });
}));

app.post('/admin/delete-user', verifyAdmin, asyncHandler(async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.json({ success: false, message: 'User ID is required' });

  const userRes = await pool.query('SELECT username, role FROM users WHERE id=$1', [userId]);
  const user = userRes.rows[0];
  if (!user) return res.json({ success: false, message: 'User not found' });

  if (user.role === 'admin') return res.json({ success: false, message: 'Cannot delete admin users' });

  await pool.query('DELETE FROM users WHERE id=$1', [userId]);

  res.json({ success: true, message: `User "${user.username}" deleted successfully` });
}));

app.get('/admin/withdrawals', verifyAdmin, asyncHandler(async (req, res) => {
  const result = await pool.query(`
    SELECT w.id, w.amount, w.wallet, w.status, w.date, u.username
    FROM withdrawals w
    JOIN users u ON w.user_id = u.id
    ORDER BY w.date DESC
  `);
  res.json({ success: true, withdrawals: result.rows });
}));

app.post('/admin/withdrawals/process', verifyAdmin, asyncHandler(async (req, res) => {
  const { withdrawalId } = req.body;
  if (!withdrawalId) return res.json({ success: false, message: 'Withdrawal ID required' });

  await pool.query('UPDATE withdrawals SET status=$1 WHERE id=$2', ['approved', withdrawalId]);
  res.json({ success: true, message: 'Withdrawal approved!' });
}));

app.get('/admin/investments', verifyAdmin, asyncHandler(async (req, res) => {
  const result = await pool.query(`
    SELECT i.id, i.amount, i.plan, i.status, i.created_at, u.username
    FROM investments i
    JOIN users u ON i.user_id = u.id
    ORDER BY i.created_at DESC
  `);
  res.json({ success: true, investments: result.rows });
}));

app.get('/admin/topups', verifyAdmin, asyncHandler(async (req, res) => {
  const result = await pool.query(`
    SELECT t.id, t.user_id, t.amount, t.admin_id, t.date, u.username
    FROM topups t
    JOIN users u ON t.user_id = u.id
    ORDER BY t.date DESC
  `);
  res.json({ success: true, topups: result.rows });
}));

app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public', 'user-dashboard.html')));
app.get('/admin-dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin-dashboard.html')));

app.use((err, req, res, next) => {
  console.error("=== UNHANDLED ERROR ===");
  console.error("Path:", req.path);
  console.error("Method:", req.method);
  console.error("Error:", err.stack);
  console.error("=======================");
  res.status(500).json({ success: false, message: 'Server error', error: err.message });
});

app.listen(port, () => console.log(`Server running on port ${port}`));
