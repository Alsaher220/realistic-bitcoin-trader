-- seed.sql
-- Safe schema update (won’t delete existing data)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- USERS table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  cash NUMERIC(18,2) DEFAULT 50,  -- every new user starts with $50
  btc NUMERIC(18,8) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- TRADES table
CREATE TABLE IF NOT EXISTS trades (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  amount NUMERIC(18,8) NOT NULL,
  price NUMERIC(18,2) NOT NULL,
  date TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- WITHDRAWALS table
CREATE TABLE IF NOT EXISTS withdrawals (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount NUMERIC(18,2) NOT NULL,
  wallet TEXT,
  status TEXT DEFAULT 'pending',
  date TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- INVESTMENTS table (new)
CREATE TABLE IF NOT EXISTS investments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount NUMERIC(18,2) NOT NULL,
  plan TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Admin user (password: AdminPass123!)
INSERT INTO users (username, password, role, cash, btc)
VALUES (
  'admin',
  crypt('AdminPass123!', gen_salt('bf')),
  'admin',
  1000.00,
  10.00
)
ON CONFLICT (username) DO NOTHING;

-- Demo user (password: DemoPass123!)
INSERT INTO users (username, password, role, cash, btc)
VALUES (
  'demo',
  crypt('DemoPass123!', gen_salt('bf')),
  'user',
  50.00,
  0.50
)
ON CONFLICT (username) DO NOTHING;

-- Demo investment for demo user
INSERT INTO investments (user_id, amount, plan, status)
SELECT id, 25.00, 'Starter Plan', 'active' 
FROM users 
WHERE username='demo'
ON CONFLICT DO NOTHING;
