/**
 * Sprint 1d.4 - Layer 1: Function Registry API
 * Routes: GET (single), PUT (update), DELETE (delete)
 * Dynamic route: /api/function-registry/[code]
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import type { UpdateFunctionRegistryInput } from '@/lib/types/function-registry';

function getAccessToken(req: NextRequest): string | undefined {
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return undefined;
}

/**
 * GET /api/function-registry/[code]
 * Get single function registry entry by function_code
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const accessToken = getAccessToken(request);
    const supabase = await createServerClient(accessToken);

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { code } = params;

    // Fetch entry by function_code
    const { data, error } = await supabase
      .from('function_registry')
      .select('*')
      .eq('function_code', code)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Function not found' }, { status: 404 });
      }
      console.error('Error fetching function registry entry:', error);
      return NextResponse.json({ error: 'Failed to fetch registry entry' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in function-registry GET [code]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/function-registry/[code]
 * Update function registry entry
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const accessToken = getAccessToken(request);
    const supabase = await createServerClient(accessToken);

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { code } = params;

    // Parse request body
    const input: Partial<UpdateFunctionRegistryInput> = await request.json();

    // Don't allow changing function_code via this endpoint
    delete (input as any).function_code;

    // Prepare update data
    const updateData: any = {
      ...input,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    };

    // Update in database
    const { data, error } = await supabase
      .from('function_registry')
      .update(updateData)
      .eq('function_code', code)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Function not found' }, { status: 404 });
      }
      console.error('Error updating function registry entry:', error);
      return NextResponse.json({ error: 'Failed to update registry entry' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Error in function-registry PUT:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/function-registry/[code]
 * Delete function registry entry
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const accessToken = getAccessToken(request);
    const supabase = await createServerClient(accessToken);

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { code } = params;

    // Check if function is used in any workflows
    const { data: usageData, error: usageError } = await supabase
      .from('instance_tasks')
      .select('id')
      .eq('function_code', code)
      .limit(1);

    if (usageError) {
      console.error('Error checking function usage:', usageError);
    }

    if (usageData && usageData.length > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete function that is used in workflow tasks',
          details: 'This function is referenced by existing workflow instances',
        },
        { status: 409 }
      );
    }

    // Delete from database
    const { error } = await supabase
      .from('function_registry')
      .delete()
      .eq('function_code', code);

    if (error) {
      console.error('Error deleting function registry entry:', error);
      return NextResponse.json({ error: 'Failed to delete registry entry' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Function registry entry deleted successfully',
    });
  } catch (error) {
    console.error('Error in function-registry DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
