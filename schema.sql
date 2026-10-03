-- ==============================================================================
-- Schema Supabase pour Senchi-Sword (Comte Harebourg API)
-- ==============================================================================
-- Instructions :
-- 1. Rendez-vous dans votre projet Supabase (https://supabase.com).
-- 2. Cliquez sur l'onglet "SQL Editor" dans le menu de gauche.
-- 3. Cliquez sur "New query", collez l'integralite de ce script, puis cliquez sur "Run".
-- ==============================================================================

-- 1. Table des licences
CREATE TABLE IF NOT EXISTS licenses (
    license_key TEXT PRIMARY KEY,
    customer_name TEXT NOT NULL,
    customer_email TEXT DEFAULT '',
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'blocked', 'suspended', 'expired')),
    expires_at TIMESTAMPTZ,
    machine_id TEXT,
    machine_ids JSONB DEFAULT '[]'::jsonb,
    max_devices INTEGER DEFAULT 1,
    last_seen_at TIMESTAMPTZ,
    activated_at TIMESTAMPTZ,
    last_app_version TEXT,
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les recherches
CREATE INDEX IF NOT EXISTS idx_licenses_status ON licenses(status);
CREATE INDEX IF NOT EXISTS idx_licenses_customer_email ON licenses(customer_email);

-- 2. Table des annonces (notifications poussees aux utilisateurs)
CREATE TABLE IF NOT EXISTS announcements (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    target_type TEXT DEFAULT 'all' CHECK (target_type IN ('all', 'license_key', 'customer_email')),
    target_value TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Securite RLS (Row Level Security)
-- Permet de proteger la base. Le backend Node.js utilise la cle "service_role"
-- pour bypasser RLS et avoir les droits d'administration.
ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on licenses" 
    ON licenses 
    FOR ALL 
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role full access on announcements" 
    ON announcements 
    FOR ALL 
    TO service_role
    USING (true)
    WITH CHECK (true);
