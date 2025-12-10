// CTA Button Configuration System - Individual Button Routes
// GET /api/cta-buttons/[id] - Get CTA button by ID
// PUT /api/cta-buttons/[id] - Update CTA button (admin only)
// DELETE /api/cta-buttons/[id] - Soft delete CTA button (admin only)

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/cta-buttons/[id]
 * Get CTA button by ID
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    const { data, error } = await supabase
      .from('cta_buttons')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { success: false, error: 'CTA button not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error) {
    console.error('[CTA GET by ID Error]:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/cta-buttons/[id]
 * Update CTA button (admin only)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

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
    const updates = await request.json() as {
      label?: string;
      href?: string;
      style?: string;
      icon?: string;
      is_active?: boolean;
    };

    // Validate href if provided
    if (updates.href && !updates.href.match(/^https?:\/\/|^\/|^#/)) {
      return NextResponse.json(
        { success: false, error: 'Invalid href format. Must be absolute URL, relative path, or anchor' },
        { status: 400 }
      );
    }

    // Update CTA button
    const { data, error } = await supabase
      .from('cta_buttons')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        // Unique constraint violation
        return NextResponse.json(
          { success: false, error: `CTA label "${updates.label}" already exists for this application` },
          { status: 409 }
        );
      }
      console.error('Error updating CTA button:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error) {
    console.error('[CTA PUT Error]:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/cta-buttons/[id]
 * Soft delete CTA button (admin only)
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

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

    // Soft delete (set is_active = false)
    const { error } = await supabase
      .from('cta_buttons')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      console.error('Error deleting CTA button:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: { id } }, { status: 200 });
  } catch (error) {
    console.error('[CTA DELETE Error]:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
