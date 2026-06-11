-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR UNIQUE NOT NULL,
  cpf VARCHAR UNIQUE,
  password_hash VARCHAR NOT NULL,
  tier VARCHAR DEFAULT 'free',
  subscription_active BOOLEAN DEFAULT true,
  subscription_end_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- User profiles
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  avatar_url VARCHAR,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Content
CREATE TABLE IF NOT EXISTS content (
  id VARCHAR PRIMARY KEY,
  title VARCHAR NOT NULL,
  description TEXT,
  genres VARCHAR[] DEFAULT '{}',
  release_year INT,
  duration INT,
  seasons INT,
  thumbnail_url VARCHAR,
  hero_image_url VARCHAR,
  imdb_rating FLOAT,
  maturity_rating VARCHAR,
  "cast" VARCHAR[], -- "cast" é palavra reservada no Postgres: precisa de aspas
  director VARCHAR,
  provider VARCHAR NOT NULL,
  provider_content_id VARCHAR,
  is_included BOOLEAN DEFAULT true,
  stream_url VARCHAR,
  engagement_score FLOAT DEFAULT 0.5,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(provider, provider_content_id)
);

-- Watch history
CREATE TABLE IF NOT EXISTS user_watch_history (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content_id VARCHAR REFERENCES content(id) ON DELETE CASCADE,
  watched_at TIMESTAMP DEFAULT NOW(),
  progress_percentage INT DEFAULT 0,
  duration_watched INT,
  rating INT CHECK (rating BETWEEN 1 AND 5),
  completed BOOLEAN DEFAULT false,
  UNIQUE(user_id, content_id)
);

-- Watchlist
CREATE TABLE IF NOT EXISTS user_watchlist (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content_id VARCHAR REFERENCES content(id) ON DELETE CASCADE,
  added_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, content_id)
);

-- Recommendations
CREATE TABLE IF NOT EXISTS recommendations (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content_id VARCHAR REFERENCES content(id) ON DELETE CASCADE,
  recommendation_type VARCHAR,
  score FLOAT,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '7 days'
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_content_provider ON content(provider);
CREATE INDEX IF NOT EXISTS idx_watch_history_user ON user_watch_history(user_id);
CREATE INDEX IF NOT EXISTS idx_watch_history_content ON user_watch_history(content_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_user ON user_watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_user ON recommendations(user_id);
