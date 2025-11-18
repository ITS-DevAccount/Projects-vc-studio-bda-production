/**
 * API Route: /api/registry/[code]/usage
 * Purpose: Check component usage in stakeholder dashboards
 * Sprint 10.1d.2: Registry Consolidation & Management
 */

import { createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/registry/[code]/usage
 * Check which stakeholders are using this component
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const supabase = await createServerClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { code } = await params;

    // Get stakeholder to check app_uuid
    const { data: stakeholder } = await supabase
      .from('stakeholders')
      .select('app_uuid')
      .eq('auth_user_id', user.id)
      .single();

    if (!stakeholder) {
      return NextResponse.json({ error: 'Stakeholder not found' }, { status: 404 });
    }

    // Call the check_component_usage function
    const { data: usageData, error } = await supabase.rpc('check_component_usage', {
      p_component_code: code,
    });

    if (error) {
      console.error('Error checking component usage:', error);
      return NextResponse.json({ error: 'Failed to check component usage' }, { status: 500 });
    }

    return NextResponse.json({
      component_code: code,
      usage_count: usageData?.length || 0,
      usage: usageData || [],
      can_delete: !usageData || usageData.length === 0,
    });
  } catch (error: any) {
    console.error('Error in GET /api/registry/[code]/usage:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
