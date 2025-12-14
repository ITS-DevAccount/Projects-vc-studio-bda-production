import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getAppUuid } from '@/lib/server/getAppUuid';

// Helper to get access token from request
function getAccessToken(req: NextRequest): string | undefined {
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return undefined;
}

export async function POST(req: NextRequest) {
  try {
    const accessToken = getAccessToken(req);
    const body = await req.json();

    const { name, email, subject, message, enquiry_type = 'general' } = body;

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: 'Name, email, subject, and message are required' },
        { status: 400 }
      );
    }

    // Get app_uuid for multi-tenancy
    const appUuid = await getAppUuid(accessToken);
    
    if (!appUuid) {
      return NextResponse.json(
        { error: 'Unable to determine application context' },
        { status: 500 }
      );
    }

    // Use service role client to bypass RLS for public form submissions
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!serviceRoleKey || !supabaseUrl) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const { createClient } = await import('@supabase/supabase-js');
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // Insert enquiry into database
    const { data, error } = await adminClient
      .from('enquiries')
      .insert([
        {
          app_uuid: appUuid,
          name,
          email,
          subject,
          message,
          enquiry_type,
          status: 'new',
          priority: 'medium',
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating enquiry:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to submit enquiry' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (e: any) {
    console.error('API error in POST /api/enquiries:', e);
    return NextResponse.json(
      { error: e.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const accessToken = getAccessToken(req);

    // Verify user is authenticated
    const supabase = await createServerClient(accessToken);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get app_uuid for multi-tenancy filtering
    const appUuid = await getAppUuid(accessToken);

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || undefined;
    const enquiryType = searchParams.get('enquiry_type') || undefined;

    let query = supabase
      .from('enquiries')
      .select('*')
      .eq('app_uuid', appUuid)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    if (enquiryType) {
      query = query.eq('enquiry_type', enquiryType);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching enquiries:', error);
      throw error;
    }

    return NextResponse.json(data || []);
  } catch (e: any) {
    console.error('API error in GET /api/enquiries:', e);
    return NextResponse.json(
      { error: e.message || 'Internal server error' },
      { status: 500 }
    );
  }
}


