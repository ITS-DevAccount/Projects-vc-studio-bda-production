// LLM Interfaces API - Migrate Environment Variables to Database
// This endpoint reads environment variables and creates default LLM interfaces
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@/lib/supabase/server';
import { encryptApiKey } from '@/lib/ai/encryption';

// Helper to get access token from request
function getAccessToken(req: NextRequest): string | undefined {
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return undefined;
}

// POST /api/llm-interfaces/migrate-env - Migrate environment variables to database
export async function POST(req: NextRequest) {
  try {
    const accessToken = getAccessToken(req);

    // Verify user is authenticated
    const supabase = await createServerClient(accessToken);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: adminCheck } = await supabase.rpc('is_user_admin');
    if (!adminCheck) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Use service role client
    // Note: LLM interfaces are shared across all apps (not app-specific)
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!serviceRoleKey || !supabaseUrl) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const results: Array<{ provider: string; success: boolean; message: string }> = [];

    // Migrate Anthropic API key
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        const encryptedKey = encryptApiKey(process.env.ANTHROPIC_API_KEY);
        // Check if default already exists (shared across all apps)
        const { data: existing } = await adminClient
          .from('llm_interfaces')
          .select('id')
          .eq('provider', 'anthropic')
          .eq('is_default', true)
          .single();

        if (!existing) {
          await adminClient
            .from('llm_interfaces')
            .insert({
              provider: 'anthropic',
              name: 'Production Claude (Migrated from Env)',
              api_key_enc: encryptedKey,
              default_model: process.env.CLAUDE_DEFAULT_MODEL || 'claude-sonnet-4-5-20250929',
              is_active: true,
              is_default: true,
              created_by: user.id
            });

          results.push({
            provider: 'anthropic',
            success: true,
            message: 'Anthropic interface created successfully'
          });
        } else {
          results.push({
            provider: 'anthropic',
            success: false,
            message: 'Default Anthropic interface already exists'
          });
        }
      } catch (err: any) {
        results.push({
          provider: 'anthropic',
          success: false,
          message: err.message || 'Unknown error'
        });
      }
    } else {
      results.push({
        provider: 'anthropic',
        success: false,
        message: 'ANTHROPIC_API_KEY not found in environment'
      });
    }

    // Migrate OpenAI API key
    if (process.env.OPENAI_API_KEY) {
      try {
        const encryptedKey = encryptApiKey(process.env.OPENAI_API_KEY);
        const { data: existing } = await adminClient
          .from('llm_interfaces')
          .select('id')
          .eq('provider', 'openai')
          .eq('is_default', true)
          .single();

        if (!existing) {
          await adminClient
            .from('llm_interfaces')
            .insert({
              provider: 'openai',
              name: 'Production OpenAI (Migrated from Env)',
              api_key_enc: encryptedKey,
              default_model: process.env.OPENAI_DEFAULT_MODEL || 'gpt-4',
              is_active: true,
              is_default: true,
              created_by: user.id
            });

          results.push({
            provider: 'openai',
            success: true,
            message: 'OpenAI interface created successfully'
          });
        } else {
          results.push({
            provider: 'openai',
            success: false,
            message: 'Default OpenAI interface already exists'
          });
        }
      } catch (err: any) {
        results.push({
          provider: 'openai',
          success: false,
          message: err.message || 'Unknown error'
        });
      }
    } else {
      results.push({
        provider: 'openai',
        success: false,
        message: 'OPENAI_API_KEY not found in environment'
      });
    }

    // Migrate DeepSeek API key (if separate from OpenAI)
    if (process.env.DEEPSEEK_API_KEY) {
      try {
        const encryptedKey = encryptApiKey(process.env.DEEPSEEK_API_KEY);
        const { data: existing } = await adminClient
          .from('llm_interfaces')
          .select('id')
          .eq('provider', 'deepseek')
          .eq('is_default', true)
          .single();

        if (!existing) {
          await adminClient
            .from('llm_interfaces')
            .insert({
              provider: 'deepseek',
              name: 'Production DeepSeek (Migrated from Env)',
              api_key_enc: encryptedKey,
              base_url: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
              default_model: process.env.DEEPSEEK_DEFAULT_MODEL || 'deepseek-chat',
              is_active: true,
              is_default: true,
              created_by: user.id
            });

          results.push({
            provider: 'deepseek',
            success: true,
            message: 'DeepSeek interface created successfully'
          });
        } else {
          results.push({
            provider: 'deepseek',
            success: false,
            message: 'Default DeepSeek interface already exists'
          });
        }
      } catch (err: any) {
        results.push({
          provider: 'deepseek',
          success: false,
          message: err.message || 'Unknown error'
        });
      }
    } else {
      results.push({
        provider: 'deepseek',
        success: false,
        message: 'DEEPSEEK_API_KEY not found in environment (will use OPENAI_API_KEY if available)'
      });
    }

    // Migrate Gemini API key
    if (process.env.GEMINI_API_KEY) {
      try {
        const encryptedKey = encryptApiKey(process.env.GEMINI_API_KEY);
        const { data: existing } = await adminClient
          .from('llm_interfaces')
          .select('id')
          .eq('provider', 'gemini')
          .eq('is_default', true)
          .single();

        if (!existing) {
          await adminClient
            .from('llm_interfaces')
            .insert({
              provider: 'gemini',
              name: 'Production Gemini (Migrated from Env)',
              api_key_enc: encryptedKey,
              default_model: process.env.GEMINI_DEFAULT_MODEL || 'gemini-pro',
              is_active: true,
              is_default: true,
              created_by: user.id
            });

          results.push({
            provider: 'gemini',
            success: true,
            message: 'Gemini interface created successfully'
          });
        } else {
          results.push({
            provider: 'gemini',
            success: false,
            message: 'Default Gemini interface already exists'
          });
        }
      } catch (err: any) {
        results.push({
          provider: 'gemini',
          success: false,
          message: err.message || 'Unknown error'
        });
      }
    } else {
      results.push({
        provider: 'gemini',
        success: false,
        message: 'GEMINI_API_KEY not found in environment'
      });
    }

    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;

    return NextResponse.json({
      success: successCount > 0,
      message: `Migration completed: ${successCount}/${totalCount} providers migrated`,
      results
    });
  } catch (e: any) {
    console.error('API error in POST /api/llm-interfaces/migrate-env:', e);
    return NextResponse.json(
      { error: e.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

