// CTA Button Configuration System - API Routes
// GET /api/cta-buttons - List CTA buttons for an app
// POST /api/cta-buttons - Create new CTA button (admin only)

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { CreateCTAInput } from '@/lib/types/cta';

/**
 * GET /api/cta-buttons
 * List CTA buttons for an application
 *
 * Query params:
 * - app_uuid: Filter by application UUID (required)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const app_uuid = searchParams.get('app_uuid');

    if (!app_uuid) {
      return NextResponse.json(
        { success: false, error: 'app_uuid required' },
        { status: 400 }
      );
    }

    // Fetch CTA buttons
    const { data, error } = await supabase
      .from('cta_buttons')
      .select('*')
      .eq('app_uuid', app_uuid)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching CTA buttons:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: data || [] }, { status: 200 });
  } catch (error) {
    console.error('[CTA GET Error]:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cta-buttons
 * Create new CTA button (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: isAdminResult } = await supabase.rpc('is_user_admin');
    if (!isAdminResult) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Get app_uuid from VC_STUDIO application
    const { data: app, error: appError } = await supabase
      .from('applications')
      .select('id')
      .eq('app_code', 'VC_STUDIO')
      .single();

    if (appError || !app) {
      return NextResponse.json(
        { success: false, error: 'Application VC_STUDIO not found' },
        { status: 500 }
      );
    }

    // Parse request body
    const { label, href, variant = 'primary', icon_name, analytics_event }: CreateCTAInput =
      await request.json();

    // Validation
    if (!label || !href) {
      return NextResponse.json(
        { success: false, error: 'label and href are required' },
        { status: 400 }
      );
    }

    if (!href.match(/^https?:\/\/|^\/|^#/)) {
      return NextResponse.json(
        { success: false, error: 'Invalid href format. Must be absolute URL, relative path, or anchor' },
        { status: 400 }
      );
    }

    // Create CTA button
    const { data, error } = await supabase
      .from('cta_buttons')
      .insert({
        app_uuid: app.id,
        label,
        href,
        variant,
        icon_name,
        analytics_event,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        // Unique constraint violation
        return NextResponse.json(
          { success: false, error: `CTA label "${label}" already exists for this application` },
          { status: 409 }
        );
      }
      console.error('Error creating CTA button:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    console.error('[CTA POST Error]:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
