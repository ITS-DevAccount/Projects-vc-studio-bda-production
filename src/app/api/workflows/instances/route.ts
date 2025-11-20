/**
 * Sprint 1d.4 Fix: List Workflow Instances API
 * GET /api/workflows/instances
 * Returns list of all workflow instances
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

function getAccessToken(req: NextRequest): string | undefined {
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return undefined;
}

export async function GET(request: NextRequest) {
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

    // Fetch all workflow instances ordered by most recent first
    const { data: instances, error: instancesError } = await supabase
      .from('workflow_instances')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100); // Limit to recent 100 instances

    if (instancesError) {
      console.error('Error fetching instances:', instancesError);
      return NextResponse.json(
        { error: 'Failed to fetch instances' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      instances: instances || [],
      count: instances?.length || 0,
    });
  } catch (error: any) {
    console.error('Error in workflows/instances GET:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
