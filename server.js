const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const db = new sqlite3.Database('./db.sqlite');
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize database
db.serialize(() => {
    // Users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        cash REAL DEFAULT 1000,
        btc REAL DEFAULT 0
    )`);

    // Trades table
    db.run(`CREATE TABLE IF NOT EXISTS trades (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        type TEXT,
        amount REAL,
        price REAL,
        date TEXT,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    // Admin creation
    const adminPassword = 'Rayyanalsah227@';
    const hashedAdmin = bcrypt.hashSync(adminPassword, 10);
    db.get(`SELECT * FROM users WHERE username = ?`, ['admin'], (err, row) => {
        if (!row) {
            db.run(`INSERT INTO users (username, password, cash, btc) VALUES (?, ?, 0, 0)`,
                ['admin', hashedAdmin]);
        }
    });
});

// ------------------- Routes -------------------

// Login
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, user) => {
        if (!user) return res.json({ success: false, message: 'User not found' });
        if (!bcrypt.compareSync(password, user.password)) return res.json({ success: false, message: 'Incorrect password' });
        if (username === 'admin') return res.json({ success: true, admin: true });
        return res.json({ success: true, admin: false, userId: user.id });
    });
});

// Register new user
app.post('/register', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.json({ success: false, message: 'Username and password required' });
    const hashed = bcrypt.hashSync(password, 10);
    db.run(`INSERT INTO users (username, password, cash, btc) VALUES (?, ?, 1000, 0)`, [username, hashed], function(err){
        if (err) return res.json({ success: false, message: 'Username already exists' });
        return res.json({ success: true, message: 'Account created!' });
    });
});

// Get user info
app.get('/user/:id', (req, res) => {
    const userId = req.params.id;
    db.get(`SELECT id, username, cash, btc FROM users WHERE id = ?`, [userId], (err, user) => {
        if (!user) return res.json({ success: false });
        db.all(`SELECT * FROM trades WHERE user_id = ? ORDER BY date DESC`, [userId], (err, trades) => {
            return res.json({ success: true, user, trades });
        });
    });
});

// Buy BTC
app.post('/buy', (req, res) => {
    const { userId, amount, price } = req.body;
    const totalCost = parseFloat(amount) * parseFloat(price);

    db.get(`SELECT cash, btc FROM users WHERE id = ?`, [userId], (err, user) => {
        if (!user) return res.json({ success: false, message: 'User not found' });
        if (user.cash < totalCost) return res.json({ success: false, message: 'Insufficient cash' });

        const newCash = user.cash - totalCost;
        const newBTC = user.btc + parseFloat(amount);
        db.run(`UPDATE users SET cash = ?, btc = ? WHERE id = ?`, [newCash, newBTC, userId], () => {
            const date = new Date().toISOString();
            db.run(`INSERT INTO trades (user_id, type, amount, price, date) VALUES (?, 'BUY', ?, ?, ?)`,
                [userId, amount, price, date], () => res.json({ success: true, cash: newCash, btc: newBTC }));
        });
    });
});

// Sell BTC
app.post('/sell', (req, res) => {
    const { userId, amount, price } = req.body;
    db.get(`SELECT cash, btc FROM users WHERE id = ?`, [userId], (err, user) => {
        if (!user) return res.json({ success: false, message: 'User not found' });
        if (user.btc < amount) return res.json({ success: false, message: 'Insufficient BTC' });

        const newBTC = user.btc - amount;
        const newCash = user.cash + (amount * price);
        db.run(`UPDATE users SET cash = ?, btc = ? WHERE id = ?`, [newCash, newBTC, userId], () => {
            const date = new Date().toISOString();
            db.run(`INSERT INTO trades (user_id, type, amount, price, date) VALUES (?, 'SELL', ?, ?, ?)`,
                [userId, amount, price, date], () => res.json({ success: true, cash: newCash, btc: newBTC }));
        });
    });
});

// Admin routes
app.get('/admin/users', (req, res) => {
    db.all(`SELECT id, username, cash, btc FROM users WHERE username != 'admin'`, [], (err, users) => {
        res.json({ success: true, users });
    });
});

app.post('/admin/update', (req, res) => {
    const { userId, cash, btc } = req.body;
    db.run(`UPDATE users SET cash = ?, btc = ? WHERE id = ?`, [cash, btc, userId], () => res.json({ success: true }));
});

app.get('/admin/trades', (req, res) => {
    db.all(`SELECT trades.*, users.username FROM trades INNER JOIN users ON trades.user_id = users.id ORDER BY date DESC`, [], (err, trades) => {
        res.json({ success: true, trades });
    });
});

// Change user password
app.post('/user/change-password', (req, res) => {
    const { userId, newPassword } = req.body;
    if (!newPassword) return res.json({ success: false, message: 'Password cannot be empty' });
    const hashed = bcrypt.hashSync(newPassword, 10);
    db.run(`UPDATE users SET password = ? WHERE id = ?`, [hashed, userId], () => res.json({ success: true, message: 'Password updated!' }));
});

// Start server
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
