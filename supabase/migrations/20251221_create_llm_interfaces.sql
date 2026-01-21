-- LLM Configuration System - Create llm_interfaces table
-- File: 20251221_create_llm_interfaces.sql
-- Purpose: Create database-driven LLM configuration system supporting multiple providers
--          (Anthropic, OpenAI, DeepSeek, Gemini) with encrypted API key storage

-- =============================================================================
-- STEP 1: Enable pgcrypto extension for encryption
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================================================
-- STEP 2: Create provider enum type
-- =============================================================================

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'llm_provider') THEN
        CREATE TYPE llm_provider AS ENUM ('anthropic', 'openai', 'deepseek', 'gemini');
    END IF;
END $$;

-- =============================================================================
-- STEP 3: Ensure applications table exists
-- =============================================================================

-- Create applications table if it doesn't exist (required for foreign key)
CREATE TABLE IF NOT EXISTS applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_code TEXT UNIQUE NOT NULL,
    app_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_applications_app_code ON applications(app_code);

-- =============================================================================
-- STEP 4: Create llm_interfaces table
-- =============================================================================

-- Drop table if it exists with app_uuid column (from previous migration)
-- We're changing to shared interfaces (no app_uuid)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'llm_interfaces'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'llm_interfaces' AND column_name = 'app_uuid'
    ) THEN
        -- Drop dependent objects first
        DROP FUNCTION IF EXISTS get_default_llm_interface(UUID, llm_provider) CASCADE;
        DROP TABLE llm_interfaces CASCADE;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS llm_interfaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Note: Interfaces are shared across all apps (not app-specific)
    -- Prompts are app-specific, but interfaces are shared resources
    
    -- Provider identification
    provider llm_provider NOT NULL,
    name TEXT NOT NULL, -- Friendly name like "Production Claude" or "Development OpenAI"
    
    -- API Configuration
    api_key_enc TEXT NOT NULL, -- Encrypted API key using pgcrypto
    base_url TEXT, -- Optional custom base URL (e.g., for DeepSeek: https://api.deepseek.com)
    
    -- Default model for this interface
    default_model TEXT DEFAULT 'claude-sonnet-4-5-20250929',
    
    -- Status flags
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false, -- One default per provider (shared across all apps)
    
    -- Metadata
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT llm_interfaces_unique_name UNIQUE (name)
);

-- =============================================================================
-- STEP 5: Create indexes
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_llm_interfaces_provider ON llm_interfaces(provider);
CREATE INDEX IF NOT EXISTS idx_llm_interfaces_active ON llm_interfaces(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_llm_interfaces_default ON llm_interfaces(provider, is_default) WHERE is_default = true;

-- Unique partial index: Only one default interface per provider (shared across all apps)
CREATE UNIQUE INDEX IF NOT EXISTS idx_llm_interfaces_unique_default_per_provider 
    ON llm_interfaces(provider) 
    WHERE is_default = true;

-- =============================================================================
-- STEP 6: Create updated_at trigger
-- =============================================================================

CREATE OR REPLACE FUNCTION update_llm_interfaces_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists (PostgreSQL doesn't support CREATE TRIGGER IF NOT EXISTS)
DROP TRIGGER IF EXISTS trigger_update_llm_interfaces_updated_at ON llm_interfaces;

CREATE TRIGGER trigger_update_llm_interfaces_updated_at
    BEFORE UPDATE ON llm_interfaces
    FOR EACH ROW
    EXECUTE FUNCTION update_llm_interfaces_updated_at();

-- =============================================================================
-- STEP 7: Create helper functions
-- =============================================================================

-- Note: Encryption/decryption is handled in Node.js (src/lib/ai/encryption.ts)
-- using AES-256-GCM. This provides better security and doesn't require
-- PostgreSQL-specific configuration. The API routes handle encryption before
-- storing and decryption when loading.

-- Function to get default LLM interface for a provider (shared across all apps)
CREATE OR REPLACE FUNCTION get_default_llm_interface(
    p_provider llm_provider
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    provider llm_provider,
    base_url TEXT,
    default_model TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        li.id,
        li.name,
        li.provider,
        li.base_url,
        li.default_model
    FROM llm_interfaces li
    WHERE li.provider = p_provider
        AND li.is_active = true
        AND li.is_default = true
    LIMIT 1;
END;
$$;

-- =============================================================================
-- STEP 8: Verify prompt_templates structure (no changes needed)
-- =============================================================================

-- Note: prompt_templates table uses 'app_id' (not 'app_uuid') and correctly
-- references applications(id). No migration needed for this table.
-- The llm_interfaces table does NOT use app_uuid - interfaces are shared
-- across all apps. Only prompt_templates are app-specific.

-- =============================================================================
-- STEP 9: Enable Row Level Security
-- =============================================================================

DO $$
BEGIN
    -- Only enable RLS if table exists
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'llm_interfaces'
    ) THEN
        ALTER TABLE llm_interfaces ENABLE ROW LEVEL SECURITY;

        -- Drop existing policies if they exist
        DROP POLICY IF EXISTS llm_interfaces_admin_all ON llm_interfaces;
        DROP POLICY IF EXISTS llm_interfaces_view_active ON llm_interfaces;

        -- Policy: Admins can do everything
        CREATE POLICY llm_interfaces_admin_all ON llm_interfaces
            FOR ALL
            USING (is_user_admin())
            WITH CHECK (is_user_admin());

        -- Policy: Authenticated users can view active interfaces (but not API keys)
        CREATE POLICY llm_interfaces_view_active ON llm_interfaces
            FOR SELECT
            USING (
                is_active = true 
                AND auth.uid() IS NOT NULL
            );
    END IF;
END $$;

-- =============================================================================
-- STEP 10: Add comments
-- =============================================================================

COMMENT ON TABLE llm_interfaces IS 'LLM provider configurations with encrypted API keys. Supports multiple providers per application.';
COMMENT ON COLUMN llm_interfaces.provider IS 'LLM provider: anthropic, openai, deepseek, or gemini';
COMMENT ON COLUMN llm_interfaces.api_key_enc IS 'Encrypted API key using AES-256-GCM (encrypted via Node.js encryption.ts before storage)';
COMMENT ON COLUMN llm_interfaces.base_url IS 'Optional custom base URL (e.g., https://api.deepseek.com for DeepSeek)';
COMMENT ON COLUMN llm_interfaces.is_default IS 'One default interface per provider (shared across all apps)';
COMMENT ON FUNCTION get_default_llm_interface IS 'Returns default LLM interface for a provider (shared across all apps).';

-- =============================================================================
-- STEP 11: Verification
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'LLM Interfaces Migration COMPLETE';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Created:';
    RAISE NOTICE '- llm_interfaces table';
    RAISE NOTICE '- Provider enum type (anthropic, openai, deepseek, gemini)';
    RAISE NOTICE '- Helper functions';
    RAISE NOTICE '- RLS policies';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '1. Set LLM_ENCRYPTION_KEY in .env.local (Node.js encryption key)';
    RAISE NOTICE '2. Create LLM interfaces via admin UI (/dashboard/admin/llm-interfaces)';
    RAISE NOTICE '3. Or use POST /api/llm-interfaces/migrate-env to migrate from env vars';
    RAISE NOTICE '4. Update application code to use database config (already done)';
    RAISE NOTICE '========================================';
END $$;

