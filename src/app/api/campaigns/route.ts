// ============================================================================
// BuildBid: Campaigns API
// GET: List campaigns (optional for MVP)
// POST: Create new campaign
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getCurrentAppUuid } from '@/lib/supabase/app-helpers';
import type { CampaignFormData, Campaign } from '@/lib/types/campaign';

// Force dynamic rendering - don't try to build this at compile time
export const dynamic = 'force-dynamic';

// GET /api/campaigns - List campaigns (optional for MVP)
export async function GET(req: NextRequest) {
  try {
    const accessToken = req.headers.get('authorization')?.replace('Bearer ', '');
    const supabase = await createServerClient(accessToken);

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get app_uuid for multi-tenancy filtering
    const appUuid = await getCurrentAppUuid();
    if (!appUuid) {
      return NextResponse.json({ error: 'Unable to determine app context' }, { status: 500 });
    }

    // Query campaigns with related data
    const { data: campaigns, error } = await supabase
      .from('campaigns')
      .select(`
        *,
        campaign_type:campaign_types!campaign_type_id(
          id,
          code,
          name,
          description
        ),
        owner:stakeholders!owner_id(
          id,
          name,
          email,
          reference
        )
      `)
      .eq('app_uuid', appUuid)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[CAMPAIGNS API] Error fetching campaigns:', error);
      return NextResponse.json(
        { error: 'Failed to fetch campaigns', details: error.message },
        { status: 500 }
      );
    }

    if (!campaigns || campaigns.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // Get opportunity counts for all campaigns in a single query
    const campaignIds = campaigns.map(c => c.id);
    const { data: opportunityCounts, error: countError } = await supabase
      .from('campaign_opportunities')
      .select('campaign_id')
      .in('campaign_id', campaignIds);

    if (countError) {
      console.error('[CAMPAIGNS API] Error counting opportunities:', countError);
      // Don't fail the request, just continue without counts
    }

    // Count opportunities per campaign
    const countsByCampaign = new Map<string, number>();
    (opportunityCounts || []).forEach((opp: any) => {
      const current = countsByCampaign.get(opp.campaign_id) || 0;
      countsByCampaign.set(opp.campaign_id, current + 1);
    });

    // Add opportunity count to each campaign (override stale actual_count)
    const campaignsWithCounts = campaigns.map(campaign => ({
      ...campaign,
      actual_count: countsByCampaign.get(campaign.id) || 0,
    }));

    return NextResponse.json({ data: campaignsWithCounts });
  } catch (e: any) {
    console.error('[CAMPAIGNS API] Error:', e);
    return NextResponse.json(
      { error: e.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/campaigns - Create new campaign
export async function POST(req: NextRequest) {
  try {
    const accessToken = req.headers.get('authorization')?.replace('Bearer ', '');
    const supabase = await createServerClient(accessToken);

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin access
    const { data: stakeholder } = await supabase
      .from('stakeholders')
      .select(`
        id,
        stakeholder_roles!inner(
          roles:role_id(code)
        )
      `)
      .eq('auth_user_id', user.id)
      .single();

    if (!stakeholder) {
      return NextResponse.json({ error: 'Stakeholder not found' }, { status: 404 });
    }

    const isAdmin = stakeholder.stakeholder_roles?.some(
      (sr: any) => {
        const roleCode = sr.roles?.code?.toLowerCase();
        return roleCode === 'administrator' || roleCode === 'admin' || roleCode === 'campaign_admin';
      }
    );

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Only administrators can create campaigns' },
        { status: 403 }
      );
    }

    // Get app_uuid
    const appUuid = await getCurrentAppUuid();
    if (!appUuid) {
      return NextResponse.json({ error: 'Unable to determine app context' }, { status: 500 });
    }

    // Parse request body
    const body: CampaignFormData = await req.json();

    // Validate required fields
    if (!body.name || !body.campaign_type_id || !body.owner_id) {
      return NextResponse.json(
        { error: 'Missing required fields: name, campaign_type_id, and owner_id are required' },
        { status: 400 }
      );
    }

    // Validate dates if both provided
    if (body.launch_date && body.end_date) {
      const launchDate = new Date(body.launch_date);
      const endDate = new Date(body.end_date);
      if (endDate <= launchDate) {
        return NextResponse.json(
          { error: 'End date must be after launch date' },
          { status: 400 }
        );
      }
    }

    // Validate target_count if provided
    if (body.target_count !== undefined && body.target_count !== null) {
      if (body.target_count < 1 || !Number.isInteger(body.target_count)) {
        return NextResponse.json(
          { error: 'Target count must be a positive integer' },
          { status: 400 }
        );
      }
    }

    // Insert campaign
    // Note: Reference field is auto-generated by database DEFAULT clause
    // Note: If campaigns table has app_uuid column, include it; otherwise omit
    const campaignData: any = {
      name: body.name.trim(),
      campaign_type_id: body.campaign_type_id,
      description: body.description?.trim() || null,
      owner_id: body.owner_id,
      team_members: body.team_members || [],
      launch_date: body.launch_date || null,
      end_date: body.end_date || null,
      target_count: body.target_count || null,
      status: 'planning' as const, // Always starts in planning
      created_by: user.id,
    };

    // Add app_uuid if campaigns table has this column (check schema first)
    // For now, we'll try to include it - if column doesn't exist, database will return error
    // which we'll handle gracefully
    campaignData.app_uuid = appUuid;

    const { data: createdCampaign, error: insertError } = await supabase
      .from('campaigns')
      .insert([campaignData])
      .select()
      .single();

    if (insertError) {
      console.error('[CAMPAIGNS API] Error creating campaign:', insertError);
      return NextResponse.json(
        { error: 'Failed to create campaign', details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(createdCampaign as Campaign, { status: 201 });
  } catch (e: any) {
    console.error('[CAMPAIGNS API] Error:', e);
    return NextResponse.json(
      { error: e.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

