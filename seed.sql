-- ===========================
-- TradeSphere Full Reset + Support System + NFT Gallery (Drop + Recreate)
-- ===========================

-- 1️⃣ Ensure pgcrypto extension exists
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2️⃣ Drop old tables safely (in correct dependency order)
DROP TABLE IF EXISTS nft_assignments CASCADE;
DROP TABLE IF EXISTS nfts CASCADE;
DROP TABLE IF EXISTS support_messages CASCADE;
DROP TABLE IF EXISTS withdrawals CASCADE;
DROP TABLE IF EXISTS topups CASCADE;
DROP TABLE IF EXISTS investments CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 3️⃣ Recreate users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    preferred_name TEXT,
    password TEXT NOT NULL,
    role TEXT CHECK (role IN ('user','admin')) DEFAULT 'user',
    cash NUMERIC(12,2) DEFAULT 0,
    btc NUMERIC(12,2) DEFAULT 0,
    profile_picture TEXT,
    security_question_1 TEXT,
    security_answer_1 TEXT,
    security_question_2 TEXT,
    security_answer_2 TEXT
);

-- 4️⃣ Core tables
CREATE TABLE investments (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    plan TEXT,
    amount NUMERIC(12,2),
    status TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE withdrawals (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    amount NUMERIC(12,2),
    wallet TEXT,
    status TEXT DEFAULT 'pending',
    date TIMESTAMP DEFAULT NOW()
);

CREATE TABLE topups (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    amount NUMERIC(12,2),
    admin_id INT REFERENCES users(id),
    date TIMESTAMP DEFAULT NOW()
);

-- 5️⃣ Support Messages Table
CREATE TABLE support_messages (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    sender VARCHAR(10) CHECK (sender IN ('user','admin')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6️⃣ NFT Tables
CREATE TABLE nfts (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT NOT NULL,
    collection_name TEXT,
    blockchain TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE nft_assignments (
    id SERIAL PRIMARY KEY,
    nft_id INT REFERENCES nfts(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(nft_id, user_id)
);

-- 7️⃣ Seed Admin
INSERT INTO users (username, preferred_name, password, role, cash, btc)
VALUES (
  'Alsaher',
  'Alsaher',
  crypt('SaTURn144', gen_salt('bf')),
  'admin',
  1000.00,
  10.00
);

-- 8️⃣ Seed Demo User
INSERT INTO users (username, preferred_name, password, role, cash, btc)
VALUES (
  'demo',
  'Demo User',
  crypt('DemoPass123!', gen_salt('bf')),
  'user',
  50.00,
  0.50
);

-- 9️⃣ Starter plan for demo
INSERT INTO investments (user_id, amount, plan, status)
SELECT id, 25.00, 'Starter Plan', 'active'
FROM users WHERE username='demo';

-- 🔟 Default investment trigger
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

-- 1️⃣1️⃣ Sample NFTs (optional)
INSERT INTO nfts (title, description, image_url, collection_name, blockchain)
VALUES 
  ('Golden Crypto Bull', 'Exclusive NFT representing market dominance', 'https://via.placeholder.com/300x300/FFD700/000000?text=Golden+Bull', 'TradeSphere Elite', 'Ethereum'),
  ('Diamond Hands Badge', 'Awarded to long-term holders', 'https://via.placeholder.com/300x300/B9F2FF/000000?text=Diamond+Hands', 'TradeSphere Badges', 'Polygon');
