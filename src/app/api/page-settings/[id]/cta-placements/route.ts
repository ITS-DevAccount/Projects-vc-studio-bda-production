// Page CTA Placements API Routes
// GET /api/page-settings/[id]/cta-placements - List CTA placements for a page
// POST /api/page-settings/[id]/cta-placements - Add CTA placement to page (admin only)

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { CreatePlacementInput } from '@/lib/types/cta';

/**
 * GET /api/page-settings/[id]/cta-placements
 * Get all CTA placements for a page with full button details
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: pageSettingsId } = await params;

    // Execute helper function to get placements with button data
    const { data, error } = await supabase.rpc('get_page_cta_placements', {
      page_settings_id_param: pageSettingsId,
    });

    if (error) {
      console.error('Error fetching page CTA placements:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: data || [] }, { status: 200 });
  } catch (error) {
    console.error('[Page CTA GET Error]:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/page-settings/[id]/cta-placements
 * Add CTA placement to page (admin only)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: pageSettingsId } = await params;

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

    // Parse request body
    const { cta_button_id, section, sort_order = 0 }: CreatePlacementInput =
      await request.json();

    if (!cta_button_id || !section) {
      return NextResponse.json(
        { success: false, error: 'cta_button_id and section are required' },
        { status: 400 }
      );
    }

    // Create placement
    const { data, error } = await supabase
      .from('page_cta_placements')
      .insert({
        page_settings_id: pageSettingsId,
        cta_button_id,
        section,
        sort_order,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        // Unique constraint violation
        return NextResponse.json(
          {
            success: false,
            error: 'CTA already assigned to this section at this sort order',
          },
          { status: 409 }
        );
      }
      console.error('Error creating CTA placement:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    console.error('[Page CTA POST Error]:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
