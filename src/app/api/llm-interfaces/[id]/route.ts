// LLM Interfaces API - Get, Update, Delete by ID
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

// GET /api/llm-interfaces/[id] - Get specific LLM interface
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const accessToken = getAccessToken(req);

    // Verify user is authenticated
    const supabase = await createServerClient(accessToken);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    const { data, error } = await adminClient
      .from('llm_interfaces')
      .select('id, provider, name, base_url, default_model, is_active, is_default, created_at, updated_at')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'LLM interface not found' }, { status: 404 });
      }
      console.error('Error fetching LLM interface:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ interface: data });
  } catch (e: any) {
    console.error('API error in GET /api/llm-interfaces/[id]:', e);
    return NextResponse.json(
      { error: e.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/llm-interfaces/[id] - Update LLM interface
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Note: LLM interfaces are shared across all apps (not app-specific)
    const body = await req.json();
    const { name, api_key, base_url, default_model, is_active, is_default } = body;

    // Use service role client
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

    // Build update object
    const updateData: any = {};

    if (name !== undefined) updateData.name = name;
    if (base_url !== undefined) updateData.base_url = base_url || null;
    if (default_model !== undefined) updateData.default_model = default_model || null;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (is_default !== undefined) updateData.is_default = is_default;

    // Encrypt API key if provided
    if (api_key) {
      try {
        updateData.api_key_enc = encryptApiKey(api_key);
      } catch (encryptError: any) {
        console.error('Error encrypting API key:', encryptError);
        return NextResponse.json(
          { error: `Failed to encrypt API key: ${encryptError.message}` },
          { status: 500 }
        );
      }
    }

    // If setting as default, unset other defaults for this provider (shared across all apps)
    if (is_default) {
      // Get current interface to know provider
      const { data: currentInterface } = await adminClient
        .from('llm_interfaces')
        .select('provider')
        .eq('id', id)
        .single();

      if (currentInterface) {
        await adminClient
          .from('llm_interfaces')
          .update({ is_default: false })
          .eq('provider', currentInterface.provider)
          .eq('is_default', true)
          .neq('id', id);
      }
    }

    // Update interface (shared across all apps)
    const { data: interfaceData, error: updateError } = await adminClient
      .from('llm_interfaces')
      .update(updateData)
      .eq('id', id)
      .select('id, provider, name, base_url, default_model, is_active, is_default, created_at, updated_at')
      .single();

    if (updateError) {
      if (updateError.code === 'PGRST116') {
        return NextResponse.json({ error: 'LLM interface not found' }, { status: 404 });
      }
      console.error('Error updating LLM interface:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ interface: interfaceData });
  } catch (e: any) {
    console.error('API error in PATCH /api/llm-interfaces/[id]:', e);
    return NextResponse.json(
      { error: e.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/llm-interfaces/[id] - Delete LLM interface
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const { error } = await adminClient
      .from('llm_interfaces')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting LLM interface:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('API error in DELETE /api/llm-interfaces/[id]:', e);
    return NextResponse.json(
      { error: e.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

