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

-- INVESTMENTS table
CREATE TABLE IF NOT EXISTS investments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount NUMERIC(18,2) NOT NULL,
  plan TEXT DEFAULT 'Starter Plan',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Admin user
INSERT INTO users (username, password, role, cash, btc)
VALUES (
  'admin',
  crypt('AdminPass123!', gen_salt('bf')),
  'admin',
  1000.00,
  10.00
)
ON CONFLICT (username) DO NOTHING;

-- Demo user
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

-- ✅ Ensure balances are correct
UPDATE users SET cash = 50.00 WHERE username = 'demo';
UPDATE users SET cash = 1000.00 WHERE username = 'admin';

-- ✅ Trigger: Every new user gets a default investment (25.00 in Starter Plan)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_default_investment') THEN
    CREATE OR REPLACE FUNCTION create_default_investment() RETURNS trigger AS $$
    BEGIN
      INSERT INTO investments (user_id, amount, plan, status)
      VALUES (NEW.id, 25.00, 'Starter Plan', 'active');
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER add_default_investment
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION create_default_investment();
  END IF;
END
$$ LANGUAGE plpgsql;
