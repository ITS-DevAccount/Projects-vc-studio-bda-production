-- Migration Script: Move Environment Variables to Database
-- File: 20251221_migrate_env_to_db.sql
-- Purpose: Helper script to migrate existing API keys from environment variables to database
-- Note: This script requires manual execution or API endpoint call since migrations can't access Node.js env vars

-- =============================================================================
-- INSTRUCTIONS FOR MANUAL MIGRATION
-- =============================================================================

-- This migration cannot automatically read environment variables.
-- You have two options:

-- OPTION 1: Use the Admin UI
-- 1. Navigate to /dashboard/admin/llm-interfaces
-- 2. Click "Add LLM Interface"
-- 3. Enter your API keys manually
-- 4. The system will encrypt and store them automatically

-- OPTION 2: Use the API Migration Endpoint
-- POST /api/llm-interfaces/migrate-env
-- This endpoint reads environment variables and creates default LLM interfaces

-- OPTION 3: Manual SQL (if you have API keys available)
-- NOTE: This is NOT recommended as encryption must happen in Node.js
-- Use OPTION 2 (API endpoint) instead - it handles encryption automatically
-- 
-- If you must use SQL, you need to:
-- 1. Encrypt the API key using Node.js encryption.ts first
-- 2. Then insert the encrypted key
-- 
-- Example structure (DO NOT USE - encryption key will be wrong):
/*
-- Example: Create Anthropic interface (SHARED ACROSS ALL APPS)
-- Note: Interfaces are NOT app-specific - they're shared resources
DO $$
DECLARE
    v_encrypted_key TEXT;
BEGIN
    -- IMPORTANT: You cannot encrypt here - must use Node.js encryption.ts
    -- v_encrypted_key must be encrypted using LLM_ENCRYPTION_KEY via Node.js
    -- Use POST /api/llm-interfaces/migrate-env endpoint instead!

    -- Insert LLM interface (shared across all apps - no app_uuid)
    INSERT INTO llm_interfaces (
        provider,
        name,
        api_key_enc,
        default_model,
        is_active,
        is_default
    ) VALUES (
        'anthropic',
        'Production Claude (Migrated)',
        v_encrypted_key, -- Must be pre-encrypted via Node.js
        'claude-sonnet-4-5-20250929',
        true,
        true
    )
    ON CONFLICT (name) DO NOTHING;

    RAISE NOTICE 'Anthropic interface created (shared across all apps)';
END $$;

-- Repeat for other providers as needed
*/

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Check if LLM interfaces exist
SELECT 
    provider,
    name,
    is_active,
    is_default,
    created_at
FROM llm_interfaces
ORDER BY provider, created_at;

-- Count interfaces by provider
SELECT 
    provider,
    COUNT(*) as count,
    COUNT(*) FILTER (WHERE is_active = true) as active_count,
    COUNT(*) FILTER (WHERE is_default = true) as default_count
FROM llm_interfaces
GROUP BY provider;

