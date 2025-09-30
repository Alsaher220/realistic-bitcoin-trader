-- ===========================
-- Safe seed for TradeSphere
-- ===========================

-- 1️⃣ Ensure pgcrypto extension exists
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2️⃣ Add preferred_name column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name='users' AND column_name='preferred_name'
    ) THEN
        ALTER TABLE users ADD COLUMN preferred_name TEXT;
    END IF;
END
$$;

-- 3️⃣ Admin user
INSERT INTO users (username, preferred_name, password, role, cash, btc)
VALUES (
  'Alsaher',
  'Alsaher',
  crypt('YOUR_ADMIN_PASSWORD_HERE', gen_salt('bf')), -- replace with your actual password
  'admin',
  1000.00,
  10.00
)
ON CONFLICT (username) DO UPDATE
SET password = EXCLUDED.password,
    cash = EXCLUDED.cash,
    btc = EXCLUDED.btc,
    role = EXCLUDED.role,
    preferred_name = EXCLUDED.preferred_name;

-- 4️⃣ Demo user
INSERT INTO users (username, preferred_name, password, role, cash, btc)
VALUES (
  'demo',
  'Demo User',
  crypt('DemoPass123!', gen_salt('bf')),
  'user',
  50.00,
  0.50
)
ON CONFLICT (username) DO NOTHING;

-- 5️⃣ Demo investment for demo user
INSERT INTO investments (user_id, amount, plan, status)
SELECT id, 25.00, 'Starter Plan', 'active'
FROM users 
WHERE username='demo'
ON CONFLICT DO NOTHING;

-- 6️⃣ Ensure balances
UPDATE users SET cash = 50.00 WHERE username = 'demo';
UPDATE users SET cash = 1000.00 WHERE username = 'Alsaher';

-- 7️⃣ Default investment trigger
CREATE OR REPLACE FUNCTION create_default_investment() RETURNS trigger AS $$
BEGIN
  INSERT INTO investments (user_id, amount, plan, status)
  VALUES (NEW.id, 25.00, 'Starter Plan', 'active');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname='add_default_investment'
  ) THEN
    CREATE TRIGGER add_default_investment
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION create_default_investment();
  END IF;
END
$$;
