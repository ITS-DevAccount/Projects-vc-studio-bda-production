// API Route: GET /api/components/[component_code]
// Purpose: Returns component registry entry + default params
// Phase 1c: Component Registry & File System

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(
  req: Request,
  { params }: { params: { component_code: string } }
) {
  try {
    const supabase = createClient();
    const { component_code } = params;

    // Get current authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get stakeholder to verify app_uuid
    const { data: stakeholder, error: stakeholderError } = await supabase
      .from('stakeholders')
      .select('app_uuid')
      .eq('auth_user_id', user.id)
      .single();

    if (stakeholderError || !stakeholder) {
      return NextResponse.json(
        { error: 'Stakeholder not found' },
        { status: 404 }
      );
    }

    // Get component from registry (RLS will filter by app_uuid automatically)
    const { data: component, error: componentError } = await supabase
      .from('components_registry')
      .select('*')
      .eq('component_code', component_code)
      .eq('is_active', true)
      .single();

    if (componentError || !component) {
      return NextResponse.json(
        { error: `Component '${component_code}' not found or not active` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      component,
      success: true
    });

  } catch (error: any) {
    console.error('Error fetching component:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
