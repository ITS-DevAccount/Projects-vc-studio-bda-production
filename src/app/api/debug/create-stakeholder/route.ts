/**
 * DEBUG: Create Stakeholder for Current User
 * POST /api/debug/create-stakeholder
 * Creates a stakeholder record linked to the current authenticated user
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getAppContext } from '@/lib/server/getAppUuid';

function getAccessToken(req: NextRequest): string | undefined {
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return undefined;
}

export async function POST(request: NextRequest) {
  try {
    const accessToken = getAccessToken(request);
    const supabase = await createServerClient(accessToken);

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if stakeholder already exists
    const { data: existingStakeholder } = await supabase
      .from('stakeholders')
      .select('*')
      .eq('auth_user_id', user.id)
      .single();

    if (existingStakeholder) {
      return NextResponse.json({
        success: false,
        message: 'Stakeholder record already exists for this user',
        stakeholder: existingStakeholder,
      });
    }

    // Get app context
    const appContext = await getAppContext(accessToken);

    // Parse request body for optional name
    const body = await request.json().catch(() => ({}));
    const personName = body.name || user.email?.split('@')[0] || 'User';

    // Create stakeholder record
    const { data: newStakeholder, error: createError } = await supabase
      .from('stakeholders')
      .insert([{
        app_code: appContext.site_code,
        auth_user_id: user.id,
        person_name: personName,
        email: user.email,
        role: 'user',
        is_active: true,
      }])
      .select()
      .single();

    if (createError) {
      console.error('Error creating stakeholder:', createError);
      return NextResponse.json(
        { error: 'Failed to create stakeholder', details: createError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Stakeholder record created successfully',
      stakeholder: newStakeholder,
      next_steps: [
        'You can now be assigned to workflow tasks',
        'Create a new workflow instance and assign tasks to yourself',
        'Your tasks will appear in the "My Tasks" widget on the dashboard',
      ],
    });
  } catch (error: any) {
    console.error('Error in debug/create-stakeholder POST:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
