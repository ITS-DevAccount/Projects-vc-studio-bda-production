// LLM Interfaces API - Test Connection
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@/lib/supabase/server';
import { getLLMClient } from '@/lib/ai/llm-client-factory';

// Helper to get access token from request
function getAccessToken(req: NextRequest): string | undefined {
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return undefined;
}

// POST /api/llm-interfaces/[id]/test - Test LLM interface connection
export async function POST(
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

    // Use service role client to load interface
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

    // Load LLM interface (shared across all apps)
    const { data: llmInterface, error: loadError } = await adminClient
      .from('llm_interfaces')
      .select('*')
      .eq('id', id)
      .single();

    if (loadError || !llmInterface) {
      return NextResponse.json({ error: 'LLM interface not found' }, { status: 404 });
    }

    if (!llmInterface.is_active) {
      return NextResponse.json({ error: 'LLM interface is not active' }, { status: 400 });
    }

    // Get LLM client and test connection
    try {
      const llmClient = await getLLMClient(
        llmInterface.provider as any,
        llmInterface.id,
        accessToken
      );

      // For testing, use the simplest/fastest model to avoid overloaded models
      // This is especially important for Claude which can have overloaded premium models
      const testModel = llmInterface.provider === 'anthropic' 
        ? llmClient.selectModel('simple')  // Use Haiku (fastest, least likely to be overloaded)
        : llmInterface.default_model;

      // Execute a simple test prompt
      const testResponse = await llmClient.executeRaw(
        'You are a helpful assistant.',
        'Respond with exactly: "Connection successful"',
        testModel,
        0.7,
        50 // Small token limit for test
      );

      if (testResponse.success) {
        return NextResponse.json({
          success: true,
          message: 'Connection test successful',
          response: testResponse.rawResponse,
          tokensUsed: testResponse.tokensUsed,
          durationMs: testResponse.durationMs
        });
      } else {
        return NextResponse.json({
          success: false,
          error: testResponse.error || 'Test failed',
          details: testResponse
        }, { status: 500 });
      }
    } catch (testError: any) {
      return NextResponse.json({
        success: false,
        error: testError.message || 'Connection test failed',
        details: testError.toString()
      }, { status: 500 });
    }
  } catch (e: any) {
    console.error('API error in POST /api/llm-interfaces/[id]/test:', e);
    return NextResponse.json(
      { error: e.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

