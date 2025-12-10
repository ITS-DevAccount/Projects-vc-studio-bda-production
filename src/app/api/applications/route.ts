// Applications API Routes
// GET /api/applications - Fetch applications

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/applications
 * Fetch applications from the applications table
 *
 * Query params:
 * - app_code: Filter by application code (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const app_code = searchParams.get('app_code');

    // Build query
    let query = supabase.from('applications').select('*');

    // Apply filter if app_code provided
    if (app_code) {
      query = query.eq('app_code', app_code);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching applications:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: data || [] }, { status: 200 });
  } catch (error) {
    console.error('[Applications GET Error]:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
