-- Schema InfornetTV — app de streaming + Admin Panel separado.
-- Idempotente: roda com segurança em banco novo OU em banco existente
-- (CREATE IF NOT EXISTS + ALTER ADD COLUMN IF NOT EXISTS para upgrades).

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============ USERS (App Normal) ============

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR UNIQUE NOT NULL,
  cpf VARCHAR UNIQUE,
  password_hash VARCHAR,
  auth_provider VARCHAR, -- 'email' | 'google' | 'apple'
  auth_provider_id VARCHAR,
  first_login BOOLEAN DEFAULT true,
  password_changed_at TIMESTAMP,
  tier VARCHAR DEFAULT 'free', -- 'free' | 'premium'
  subscription_active BOOLEAN DEFAULT true,
  subscription_end_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Upgrade de instalações existentes (tabela users já criada sem estas colunas)
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR;
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider_id VARCHAR;
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_login BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP;
-- Social login: password_hash deixa de ser obrigatório
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  name VARCHAR NOT NULL,
  avatar_url VARCHAR,
  preferred_genres VARCHAR[] DEFAULT '{}',
  language VARCHAR DEFAULT 'pt-BR',
  subtitle_preference VARCHAR DEFAULT 'auto',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS preferred_genres VARCHAR[] DEFAULT '{}';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS language VARCHAR DEFAULT 'pt-BR';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS subtitle_preference VARCHAR DEFAULT 'auto';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- ============ ADMIN USERS (Admin Panel — SEPARADO de users) ============

CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR UNIQUE NOT NULL,
  password_hash VARCHAR NOT NULL,
  full_name VARCHAR NOT NULL,
  role VARCHAR DEFAULT 'operator', -- 'super_admin' | 'admin' | 'operator'
  permissions VARCHAR[] DEFAULT '{}', -- 'manage_users' | 'manage_providers' | 'manage_billing' | 'view_analytics'
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP,
  created_by UUID REFERENCES admin_users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  action VARCHAR NOT NULL, -- 'login' | 'create_provider' | 'update_provider' | 'delete_user' | etc
  resource_type VARCHAR, -- 'provider' | 'user' | 'subscription' | etc
  resource_id VARCHAR,
  details JSONB,
  ip_address VARCHAR,
  user_agent VARCHAR,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============ STREAMING PROVIDERS (Admin configura) ============

CREATE TABLE IF NOT EXISTS streaming_providers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR UNIQUE NOT NULL, -- 'CDN_TV' | 'WATCHTV' | 'PARAMOUNT'
  display_name VARCHAR NOT NULL, -- "CDN TV Brasil" (para exibição)
  description TEXT,
  api_base_url VARCHAR NOT NULL,
  api_key_encrypted VARCHAR,
  api_secret_encrypted VARCHAR,
  priority INT DEFAULT 0, -- 1=highest (tenta primeiro)
  is_active BOOLEAN DEFAULT true,
  logo_url VARCHAR,
  config JSONB DEFAULT '{}', -- Configurações específicas do provider
  created_by UUID REFERENCES admin_users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS streaming_provider_status (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID REFERENCES streaming_providers(id) ON DELETE CASCADE UNIQUE,
  status VARCHAR DEFAULT 'operational', -- 'operational' | 'degraded' | 'down'
  uptime_percentage FLOAT DEFAULT 100.0,
  last_health_check TIMESTAMP,
  error_message TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============ PROVIDER INTEGRATIONS (User nível) ============

CREATE TABLE IF NOT EXISTS user_provider_integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES streaming_providers(id) ON DELETE CASCADE,
  provider_account_id VARCHAR,
  provider_account_email VARCHAR,
  is_active BOOLEAN DEFAULT true,
  integrated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, provider_id)
);

-- ============ CONTENT (Unified) ============
-- NOTA: instalações existentes têm colunas extras em content
-- (provider, stream_url, engagement_score...) que o backend atual ainda usa.
-- Elas permanecem até a migração do código para content_providers.

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
  "cast" VARCHAR[], -- "cast" é palavra reservada no Postgres
  director VARCHAR,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tipo de conteúdo: 'movie' | 'series' | 'live' (TV ao vivo). Default movie;
-- canais ao vivo (importados via M3U) usam 'live' e ficam fora do catálogo VOD.
ALTER TABLE content ADD COLUMN IF NOT EXISTS kind VARCHAR DEFAULT 'movie';
CREATE INDEX IF NOT EXISTS idx_content_kind ON content(kind);

-- Health-check dos canais ao vivo: live_ok=false esconde do /api/tv (origem
-- morta/fora do ar/bloqueada). NULL = ainda não checado (fail-open: aparece).
ALTER TABLE content ADD COLUMN IF NOT EXISTS live_ok BOOLEAN;
ALTER TABLE content ADD COLUMN IF NOT EXISTS live_checked_at TIMESTAMPTZ;

-- Origem do canal ao vivo: 'youtube' (embed oficial, ex.: CazéTV/TV Senado/NASA)
-- ou 'hls' (manifesto via proxy). source_ref guarda o channelId/@handle/videoId
-- (youtube) ou a URL do manifesto (hls). Canais 'youtube' NÃO são sondados pelo
-- health-check (não têm como "morrer" no probe HLS) e nunca passam pelo proxy.
ALTER TABLE content ADD COLUMN IF NOT EXISTS source_type TEXT
  CHECK (source_type IN ('youtube', 'hls'));
ALTER TABLE content ADD COLUMN IF NOT EXISTS source_ref TEXT;

CREATE TABLE IF NOT EXISTS content_providers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_id VARCHAR REFERENCES content(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES streaming_providers(id) ON DELETE CASCADE,
  provider_content_id VARCHAR,
  is_included BOOLEAN DEFAULT true,
  price DECIMAL(10, 2),
  stream_url VARCHAR,
  available_from DATE,
  available_until DATE,
  engagement_score FLOAT DEFAULT 0.5,
  is_new BOOLEAN DEFAULT false,
  is_trending BOOLEAN DEFAULT false,
  UNIQUE(content_id, provider_id),
  UNIQUE(provider_id, provider_content_id)
);

-- ============ USER DATA ============
-- (Tabelas já existentes mantêm PK SERIAL; novas instalações usam UUID.)

CREATE TABLE IF NOT EXISTS user_watch_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content_id VARCHAR REFERENCES content(id) ON DELETE CASCADE,
  watched_at TIMESTAMP DEFAULT NOW(),
  progress_percentage INT DEFAULT 0,
  duration_watched INT,
  rating INT CHECK (rating BETWEEN 1 AND 5),
  completed BOOLEAN DEFAULT false,
  UNIQUE(user_id, content_id)
);

CREATE TABLE IF NOT EXISTS user_watchlist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content_id VARCHAR REFERENCES content(id) ON DELETE CASCADE,
  added_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, content_id)
);

CREATE TABLE IF NOT EXISTS recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content_id VARCHAR REFERENCES content(id) ON DELETE CASCADE,
  recommendation_type VARCHAR,
  score FLOAT,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '7 days'
);

-- ============ BILLING (Asaas) ============

CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  asaas_subscription_id VARCHAR,
  plan_name VARCHAR,
  price DECIMAL(10, 2),
  billing_cycle VARCHAR,
  status VARCHAR,
  started_at TIMESTAMP DEFAULT NOW(),
  next_billing_date DATE,
  cancelled_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS billing_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  asaas_charge_id VARCHAR,
  amount DECIMAL(10, 2),
  status VARCHAR,
  due_date DATE,
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============ ADMIN SETTINGS ============

CREATE TABLE IF NOT EXISTS admin_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key VARCHAR UNIQUE NOT NULL, -- 'api_rate_limit' | 'max_concurrent_streams' | 'maintenance_mode'
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES admin_users(id),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============ INDEXES ============

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_id ON admin_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON admin_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_watch_history_user ON user_watch_history(user_id);
CREATE INDEX IF NOT EXISTS idx_content_providers_provider ON content_providers(provider_id);

-- ============ INSERTS INICIAIS ============

-- Super admin inicial. O hash é placeholder: o seed real (senha forte +
-- bcrypt) é aplicado pelo script de seed após a migração.
INSERT INTO admin_users (email, password_hash, full_name, role, permissions, is_active)
VALUES (
  'admin@infornetv.com.br',
  '$2b$10$HASH_AQUI_DEPOIS',
  'Super Admin',
  'super_admin',
  ARRAY['manage_users', 'manage_providers', 'manage_billing', 'view_analytics'],
  true
) ON CONFLICT DO NOTHING;

-- Providers iniciais
INSERT INTO streaming_providers (name, display_name, description, api_base_url, priority, is_active)
VALUES
  ('CDN_TV', 'CDN TV Brasil', 'Plataforma CDN TV', 'https://api.cdntv.com.br', 1, true),
  ('WATCHTV', 'Watch TV', 'Plataforma Watch TV', 'https://api.watchtv.com.br', 2, true),
  ('PARAMOUNT', 'Paramount+', 'Paramount Plus', 'https://api.paramount.com', 3, true),
  ('CAZETV', 'CazéTV', 'Canal ao vivo via YouTube', 'https://youtube.com', 4, true)
ON CONFLICT DO NOTHING;
