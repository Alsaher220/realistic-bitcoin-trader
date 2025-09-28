-- seed.sql
-- This file creates tables and inserts admin + demo users for your Trade Fair app.

-- Enable pgcrypto for bcrypt password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- USERS table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  cash NUMERIC(18,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- WALLETS table
CREATE TABLE IF NOT EXISTS wallets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wallet_address TEXT,
  provider TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- TRANSACTIONS table
CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  amount NUMERIC(18,2) NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- WITHDRAWALS table
CREATE TABLE IF NOT EXISTS withdrawals (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount NUMERIC(18,2) NOT NULL,
  wallet TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Admin user (password: AdminPass123!)
INSERT INTO users (email, password_hash, is_admin, cash)
VALUES (
  'admin@example.com',
  crypt('AdminPass123!', gen_salt('bf')),
  TRUE,
  1000.00
)
ON CONFLICT (email) DO NOTHING;

-- Demo user (password: DemoPass123!)
INSERT INTO users (email, password_hash, is_admin, cash)
VALUES (
  'user@example.com',
  crypt('DemoPass123!', gen_salt('bf')),
  FALSE,
  50.00
)
ON CONFLICT (email) DO NOTHING;
