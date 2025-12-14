// LLM Interfaces API - List and Create
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

// GET /api/llm-interfaces - List all LLM interfaces for current app
export async function GET(req: NextRequest) {
  try {
    const accessToken = getAccessToken(req);

    // Verify user is authenticated
    const supabase = await createServerClient(accessToken);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use service role client to bypass RLS for admin operations
    // Note: LLM interfaces are shared across all apps (not app-specific)
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    let queryClient: any;

    if (serviceRoleKey && supabaseUrl) {
      queryClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
    } else {
      queryClient = supabase;
    }

    // Build query (interfaces are shared across all apps)
    const { data, error } = await queryClient
      .from('llm_interfaces')
      .select('id, provider, name, base_url, default_model, is_active, is_default, created_at, updated_at')
      .order('provider', { ascending: true })
      .order('is_default', { ascending: false })
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching LLM interfaces:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ interfaces: data || [] });
  } catch (e: any) {
    console.error('API error in GET /api/llm-interfaces:', e);
    return NextResponse.json(
      { error: e.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/llm-interfaces - Create new LLM interface
export async function POST(req: NextRequest) {
  try {
    const accessToken = getAccessToken(req);

    // Verify user is authenticated
    const supabase = await createServerClient(accessToken);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin (required for creating LLM interfaces)
    // Note: This should use is_user_admin() function, but for now we'll check via RLS
    const { data: adminCheck } = await supabase.rpc('is_user_admin');
    if (!adminCheck) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Note: LLM interfaces are shared across all apps (not app-specific)
    const body = await req.json();
    const { provider, name, api_key, base_url, default_model, is_active, is_default } = body;

    // Validate required fields
    if (!provider || !name || !api_key) {
      return NextResponse.json(
        { error: 'provider, name, and api_key are required' },
        { status: 400 }
      );
    }

    // Validate provider
    const validProviders = ['anthropic', 'openai', 'deepseek', 'gemini'];
    if (!validProviders.includes(provider)) {
      return NextResponse.json(
        { error: `Invalid provider. Must be one of: ${validProviders.join(', ')}` },
        { status: 400 }
      );
    }

    // Use service role client for encryption
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

    // Encrypt API key using Node.js encryption (more reliable than PostgreSQL function)
    let encryptedKey: string;
    try {
      encryptedKey = encryptApiKey(api_key);
    } catch (encryptError: any) {
      console.error('Error encrypting API key:', encryptError);
      return NextResponse.json(
        { error: `Failed to encrypt API key: ${encryptError.message}. Check LLM_ENCRYPTION_KEY is set.` },
        { status: 500 }
      );
    }

    // If setting as default, unset other defaults for this provider (shared across all apps)
    if (is_default) {
      await adminClient
        .from('llm_interfaces')
        .update({ is_default: false })
        .eq('provider', provider)
        .eq('is_default', true);
    }

    // Create LLM interface (shared across all apps)
    const { data: interfaceData, error: createError } = await adminClient
      .from('llm_interfaces')
      .insert({
        provider,
        name,
        api_key_enc: encryptedKey,
        base_url: base_url || null,
        default_model: default_model || null,
        is_active: is_active !== undefined ? is_active : true,
        is_default: is_default || false,
        created_by: user.id
      })
      .select('id, provider, name, base_url, default_model, is_active, is_default, created_at, updated_at')
      .single();

    if (createError) {
      console.error('Error creating LLM interface:', createError);
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    return NextResponse.json({ interface: interfaceData }, { status: 201 });
  } catch (e: any) {
    console.error('API error in POST /api/llm-interfaces:', e);
    return NextResponse.json(
      { error: e.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

