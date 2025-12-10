// Page CTA Placement Individual Routes
// DELETE /api/page-settings/[id]/cta-placements/[placement_id] - Remove CTA placement (admin only)

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * DELETE /api/page-settings/[id]/cta-placements/[placement_id]
 * Remove CTA placement from page (admin only)
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; placement_id: string }> }
) {
  try {
    const supabase = await createClient();
    const { placement_id } = await params;

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

    // Delete placement
    const { error } = await supabase
      .from('page_cta_placements')
      .delete()
      .eq('id', placement_id);

    if (error) {
      console.error('Error deleting CTA placement:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: { id: placement_id } }, { status: 200 });
  } catch (error) {
    console.error('[Placement DELETE Error]:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
