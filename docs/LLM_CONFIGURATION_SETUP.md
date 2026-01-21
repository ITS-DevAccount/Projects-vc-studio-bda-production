# LLM Configuration System Setup Guide

## Overview

The LLM Configuration System allows you to manage multiple LLM providers (Anthropic, OpenAI, DeepSeek, Gemini) through a database-driven admin interface, eliminating the need for complex `.env` file management.

## Features

- **Multiple Providers**: Support for Anthropic (Claude), OpenAI, DeepSeek, and Google Gemini
- **Encrypted Storage**: API keys are encrypted using AES-256-GCM before storage
- **Per-App Configuration**: Each application can have its own LLM interfaces
- **Admin UI**: Easy-to-use interface for managing LLM configurations
- **Connection Testing**: Test LLM interfaces directly from the admin UI
- **Fallback Support**: Falls back to environment variables if no database config exists

## Setup Instructions

### 1. Run Database Migration

Run the migration file in your Supabase SQL Editor:

```sql
-- File: supabase/migrations/20251221_create_llm_interfaces.sql
```

This creates:
- `llm_interfaces` table
- Provider enum type
- Helper functions
- RLS policies

### 2. Set Encryption Key

Add the following to your `.env.local` file:

```env
LLM_ENCRYPTION_KEY=your-secure-encryption-key-here-min-32-chars
```

**Important**: 
- Use a strong, random key (at least 32 characters)
- Keep this key secure - it's used to encrypt/decrypt API keys
- Never commit this key to version control

### 3. Migrate Existing Environment Variables (Optional)

If you have existing API keys in environment variables, you can migrate them automatically:

**Option A: Use Admin UI**
1. Navigate to `/dashboard/admin/llm-interfaces`
2. Click "Add LLM Interface"
3. Enter your API keys manually

**Option B: Use Migration API**
```bash
POST /api/llm-interfaces/migrate-env
Authorization: Bearer <your-admin-token>
```

This endpoint reads:
- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY`
- `DEEPSEEK_API_KEY` (or uses `OPENAI_API_KEY` if not set)
- `GEMINI_API_KEY`

And creates default LLM interfaces for each.

### 4. Access Admin UI

Navigate to: `/dashboard/admin/llm-interfaces`

You can:
- View all configured LLM interfaces
- Create new interfaces
- Edit existing interfaces
- Test connections
- Set default interfaces per provider
- Activate/deactivate interfaces

## Usage

### In Code

The system automatically uses database configuration when available:

```typescript
import { getLLMClient } from '@/lib/ai/llm-client-factory';
import { getAppUuid } from '@/lib/server/getAppUuid';

// Get LLM client (automatically loads from database)
const appUuid = await getAppUuid();
const client = await getLLMClient(appUuid, 'anthropic');

// Use the client
const response = await client.executeRaw(
  'You are a helpful assistant.',
  'Hello, world!'
);
```

### Prompt Templates

Prompt templates can now specify which LLM interface to use:

```typescript
{
  prompt_code: 'MY_PROMPT',
  default_llm_interface_id: 'uuid-of-llm-interface',
  // ... other fields
}
```

If `default_llm_interface_id` is set, that interface will be used. Otherwise, the system uses the default interface for the provider.

## Environment Variables (Fallback)

The system still supports environment variables as a fallback:

```env
# Required for encryption
LLM_ENCRYPTION_KEY=your-key-here

# Optional - used as fallback if no database config
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
DEEPSEEK_API_KEY=sk-...
GEMINI_API_KEY=...
```

## Security

- **Encryption**: API keys are encrypted using AES-256-GCM before storage
- **RLS Policies**: Only admins can view/edit API keys
- **Server-Side Only**: Decryption only happens server-side, never exposed to client
- **Environment Variable**: Encryption key stored in environment, not database

## Troubleshooting

### "LLM_ENCRYPTION_KEY environment variable is not set"
- Add `LLM_ENCRYPTION_KEY` to your `.env.local` file
- Restart your development server

### "Failed to decrypt API key"
- Verify `LLM_ENCRYPTION_KEY` matches the key used for encryption
- If you changed the key, you'll need to re-enter API keys

### "No LLM interface found"
- Create an LLM interface via admin UI
- Or ensure environment variables are set as fallback

### Connection Test Fails
- Verify API key is correct
- Check provider status (should be active)
- Verify network connectivity to provider API

## Migration from Environment Variables

To migrate from environment variables to database:

1. **Set up encryption key**: Add `LLM_ENCRYPTION_KEY` to `.env.local`
2. **Run migration endpoint**: `POST /api/llm-interfaces/migrate-env`
3. **Verify**: Check `/dashboard/admin/llm-interfaces` to see created interfaces
4. **Test**: Use connection test button to verify each interface
5. **Optional**: Remove environment variables (system will use database config)

## Provider-Specific Notes

### Anthropic (Claude)
- Default model: `claude-sonnet-4-5-20250929`
- Base URL: Not needed (uses default)

### OpenAI
- Default model: `gpt-4`
- Base URL: Not needed (uses default)
- Compatible with OpenAI-compatible APIs

### DeepSeek
- Default model: `deepseek-chat`
- Base URL: `https://api.deepseek.com/v1` (set automatically)
- Uses OpenAI-compatible API

### Google Gemini
- Default model: `gemini-pro`
- Base URL: Not needed (uses default)

## API Reference

### List Interfaces
```
GET /api/llm-interfaces
```

### Create Interface
```
POST /api/llm-interfaces
Body: {
  provider: 'anthropic' | 'openai' | 'deepseek' | 'gemini',
  name: string,
  api_key: string,
  base_url?: string,
  default_model?: string,
  is_active?: boolean,
  is_default?: boolean
}
```

### Update Interface
```
PATCH /api/llm-interfaces/[id]
Body: { ...fields to update }
```

### Delete Interface
```
DELETE /api/llm-interfaces/[id]
```

### Test Connection
```
POST /api/llm-interfaces/[id]/test
```

### Migrate Environment Variables
```
POST /api/llm-interfaces/migrate-env
```























