import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

// Helper to get access token from request
function getAccessToken(req: NextRequest): string | undefined {
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return undefined;
}

export async function GET(req: NextRequest) {
  try {
    const accessToken = getAccessToken(req);
    
    if (!accessToken) {
      return NextResponse.json({ 
        error: 'No access token provided',
        hint: 'Make sure to send Authorization: Bearer <token> header'
      }, { status: 401 });
    }

    const supabase = await createServerClient(accessToken);
    
    // Check auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ 
        error: 'Not authenticated',
        authError: authError?.message 
      }, { status: 401 });
    }

    // Check users table
    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .select('id, email, display_name, role, is_active, auth_user_id')
      .eq('auth_user_id', user.id)
      .single();

    return NextResponse.json({
      authenticated: true,
      authUser: {
        id: user.id,
        email: user.email,
      },
      userRecord: userRecord || null,
      userRecordError: userError?.message || null,
      hasAdminRole: userRecord?.role && ['super_admin', 'domain_admin', 'manager'].includes(userRecord.role),
      canCreateStakeholders: userRecord?.role && ['super_admin', 'domain_admin', 'manager'].includes(userRecord.role),
    });
  } catch (e: any) {
    return NextResponse.json({ 
      error: e.message || 'Internal server error',
      stack: e.stack 
    }, { status: 500 });
  }
}

