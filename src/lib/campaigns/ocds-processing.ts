// ============================================================================
// BuildBid: OCDS Processing Utilities
// Database operations for processing OCDS opportunities
// ============================================================================

import { supabase } from '@/lib/supabase/client';
import type { OCDSOpportunity } from '@/lib/types/ocds';

/**
 * Get stakeholder type ID for 'Organisation' type
 * @returns UUID of Organisation stakeholder type or null
 */
export async function getCompanyStakeholderTypeId(): Promise<string | null> {
  // Query for Organisation type - handle potential trailing whitespace/newlines
  // Fetch all active stakeholder types and filter in code since the code may have trailing \r\n
  const { data, error } = await supabase
    .from('stakeholder_types')
    .select('id, code')
    .eq('is_active', true)
    .eq('is_organization', true);

  if (error) {
    console.error('Error fetching Organisation stakeholder type:', error);
    return null;
  }

  if (!data || data.length === 0) {
    console.error('Organisation stakeholder type not found');
    return null;
  }

  // Find the one that matches "Organisation" (trimmed)
  const orgType = data.find(st => st.code?.trim().toLowerCase() === 'organisation');
  
  if (!orgType) {
    console.error('Organisation stakeholder type not found (checked', data.length, 'types)');
    return null;
  }

  return orgType.id;
}

/**
 * Get stakeholder type ID for 'individual' type
 * @returns UUID of individual stakeholder type or null
 */
export async function getIndividualStakeholderTypeId(): Promise<string | null> {
  const { data, error } = await supabase
    .from('stakeholder_types')
    .select('id')
    .eq('code', 'individual')
    .maybeSingle();

  if (error) {
    console.error('Error fetching individual stakeholder type:', error);
    return null;
  }

  if (!data) {
    console.error('Individual stakeholder type not found');
    return null;
  }

  return data.id;
}

/**
 * Check for duplicate stakeholder by email (stakeholders are global, no app_uuid filter)
 * @param email - Email address to check
 * @returns Existing stakeholder or null
 */
export async function checkDuplicateStakeholder(email: string): Promise<{ id: string; name: string } | null> {
  if (!email) {
    return null;
  }

  const { data, error } = await supabase
    .from('stakeholders')
    .select('id, name')
    .eq('email', email)
    .maybeSingle();

  if (error) {
    console.error('Error checking duplicate stakeholder:', error);
    return null;
  }

  return data || null;
}

/**
 * Check for duplicate opportunity by OCID (filter through campaign.app_uuid)
 * @param campaignId - Campaign ID
 * @param ocid - OCDS OCID identifier
 * @param appUuid - Application UUID for filtering
 * @returns Existing opportunity or null
 */
export async function checkDuplicateOpportunity(
  campaignId: string,
  ocid: string,
  appUuid: string
): Promise<{ id: string } | null> {
  // Filter through campaign.app_uuid since campaign_opportunities doesn't have app_uuid
  // First verify campaign exists and belongs to app
  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .select('id')
    .eq('id', campaignId)
    .eq('app_uuid', appUuid)
    .single();

  if (campaignError || !campaign) {
    return null;
  }

  // Now check for duplicate opportunity
  const { data, error } = await supabase
    .from('campaign_opportunities')
    .select('id')
    .eq('campaign_id', campaignId)
    .eq('metadata->>ocid', ocid)
    .maybeSingle();

  if (error) {
    console.error('Error checking duplicate opportunity:', error);
    return null;
  }

  return data || null;
}

/**
 * Validate campaign can accept opportunities
 * @param campaignId - Campaign ID
 * @param appUuid - Application UUID for filtering
 * @returns Object with validation result and campaign data
 */
export async function validateCampaignForOpportunities(
  campaignId: string,
  appUuid: string
): Promise<{
  valid: boolean;
  error?: string;
  campaign?: {
    id: string;
    status: string;
    campaign_type_id: string;
    funnel_stages?: any;
  };
}> {
  // Get campaign
  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .select('id, status, campaign_type_id')
    .eq('id', campaignId)
    .eq('app_uuid', appUuid)
    .single();

  if (campaignError || !campaign) {
    return {
      valid: false,
      error: 'Campaign not found',
    };
  }

  // Campaign must be active
  if (campaign.status !== 'active') {
    return {
      valid: false,
      error: 'Campaign must be active to add opportunities',
      campaign,
    };
  }

  // Get campaign type with funnel stages
  const { data: campaignType, error: typeError } = await supabase
    .from('campaign_types')
    .select('funnel_stages')
    .eq('id', campaign.campaign_type_id)
    .single();

  if (typeError || !campaignType) {
    return {
      valid: false,
      error: 'Campaign type not found',
      campaign,
    };
  }

  // Campaign type must have funnel stages
  const funnelStages = campaignType.funnel_stages as { stages?: Array<{ order: number; name: string; is_success?: boolean }> } | null;
  if (!funnelStages?.stages || funnelStages.stages.length === 0) {
    return {
      valid: false,
      error: 'Campaign type has no funnel stages',
      campaign: {
        ...campaign,
        funnel_stages: funnelStages,
      },
    };
  }

  return {
    valid: true,
    campaign: {
      ...campaign,
      funnel_stages: funnelStages,
    },
  };
}

/**
 * Get first funnel stage from campaign type
 * @param campaignTypeId - Campaign type ID
 * @param appUuid - Application UUID for filtering
 * @returns First stage name or null
 */
export async function getFirstFunnelStage(
  campaignTypeId: string,
  appUuid: string
): Promise<string | null> {
  const { data: campaignType, error } = await supabase
    .from('campaign_types')
    .select('funnel_stages')
    .eq('id', campaignTypeId)
    .eq('app_uuid', appUuid)
    .single();

  if (error || !campaignType) {
    console.error('Error fetching campaign type:', error);
    return null;
  }

  const funnelStages = campaignType.funnel_stages as { stages?: Array<{ order: number; name: string; is_success?: boolean | null }> } | null;
  
  if (!funnelStages?.stages || funnelStages.stages.length === 0) {
    return null;
  }

  // Find first stage (order = 1, or lowest order number) that is in-progress (not won/lost)
  const sortedStages = [...funnelStages.stages].sort((a, b) => a.order - b.order);
  const firstStage = sortedStages.find(s => s.is_success === null || s.is_success === undefined) || sortedStages[0];

  return firstStage?.name || null;
}

/**
 * Create organization stakeholder from OCDS opportunity
 * @param opp - OCDS opportunity data
 * @param campaignId - Campaign ID for metadata
 * @param appUuid - Application UUID for stakeholder_roles entry
 * @returns Created stakeholder ID or null
 */
export async function createOrganizationStakeholder(
  opp: OCDSOpportunity,
  campaignId: string,
  appUuid: string
): Promise<string | null> {
  // Get organisation stakeholder type ID
  const companyTypeId = await getCompanyStakeholderTypeId();
  if (!companyTypeId) {
    throw new Error('Organisation stakeholder type not found');
  }

  // Email is required
  if (!opp.contact_email) {
    throw new Error('Contact email required for stakeholder creation');
  }

  const roleId = 'e8cff496-e1f5-4fd6-8bf5-528aa4536757'; // "Build Bid Opportunity" role

  // Get role code from role ID
  const { data: roleData, error: roleError } = await supabase
    .from('roles')
    .select('code')
    .eq('id', roleId)
    .eq('app_uuid', appUuid)
    .maybeSingle();

  if (roleError || !roleData) {
    console.error('Error fetching role details:', roleError);
    throw new Error('Opportunity role not found');
  }

  const { data, error } = await supabase
    .from('stakeholders')
    .insert({
      name: opp.company_name,
      email: opp.contact_email,
      phone: opp.contact_phone || null,
      stakeholder_type_id: companyTypeId,
      primary_role_id: roleId,
      address: opp.address,
      size_employees: opp.company_size === 'sme' ? 50 : opp.company_size === 'large' ? 500 : null,
      metadata: {
        onboard_source: 'Campaign',
        campaign_reference: campaignId,
        ocds_data: {
          ocid: opp.ocid,
          tender_ref: opp.tender_ref,
          company_size: opp.company_size,
          vcse: opp.vcse,
          address: opp.address,
          buyer_name: opp.buyer_name,
          buyer_id: opp.buyer_id,
        },
      },
      status: 'active',
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error creating organization stakeholder:', error);
    throw error;
  }

  if (!data?.id) {
    throw new Error('Failed to create stakeholder');
  }

  // Create stakeholder_roles entry
  const { error: roleInsertError } = await supabase
    .from('stakeholder_roles')
    .insert({
      stakeholder_id: data.id,
      role_id: roleId,
      role_type: roleData.code,
      app_uuid: appUuid,
      metadata: {
        onboard_source: 'Campaign',
        campaign_reference: campaignId,
      },
    });

  if (roleInsertError) {
    console.error('Error creating stakeholder_roles entry:', roleInsertError);
    // Don't throw - the stakeholder was created successfully, this is secondary
    // But log the error for debugging
  }

  return data.id;
}

/**
 * Create campaign opportunity from OCDS data
 * @param opp - OCDS opportunity data
 * @param campaignId - Campaign ID
 * @param stakeholderId - Stakeholder ID (organization)
 * @param appUuid - Application UUID (for validation)
 * @returns Created opportunity ID or null
 */
export async function createCampaignOpportunity(
  opp: OCDSOpportunity,
  campaignId: string,
  stakeholderId: string,
  appUuid: string
): Promise<string | null> {
  // Validate campaign (this also fetches campaign data)
  const validation = await validateCampaignForOpportunities(campaignId, appUuid);
  if (!validation.valid) {
    throw new Error(validation.error || 'Campaign validation failed');
  }

  if (!validation.campaign) {
    throw new Error('Campaign data not available');
  }

  const firstStageName = await getFirstFunnelStage(validation.campaign.campaign_type_id, appUuid);
  if (!firstStageName) {
    throw new Error('No first stage found in campaign funnel');
  }

  // Create opportunity
  const { data, error } = await supabase
    .from('campaign_opportunities')
    .insert({
      campaign_id: campaignId,
      stakeholder_id: stakeholderId,
      current_stage_name: firstStageName,
      status: 'active',
      engagement_level: 'cold',
      estimated_value: 0,
      metadata: {
        ocid: opp.ocid,
        tender_ref: opp.tender_ref,
        tender_title: opp.tender_title,
        tender_description: opp.tender_description,
        contract_value: opp.contract_value,
        currency: opp.currency,
        buyer_name: opp.buyer_name,
        buyer_id: opp.buyer_id,
        source: 'ocds_upload',
        outcome: null,
        next_action: 'Initial outreach required',
      },
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error creating campaign opportunity:', error);
    throw error;
  }

  if (!data?.id) {
    return null;
  }

  const opportunityId = data.id;

  // Auto-create first interaction (open) for the first stage
  try {
    // Get current user's stakeholder ID if available
    const { data: { user } } = await supabase.auth.getUser();
    let initiatedById: string | null = null;
    
    if (user) {
      const { data: stakeholder } = await supabase
        .from('stakeholders')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle();
      
      if (stakeholder) {
        initiatedById = stakeholder.id;
      }
    }

    // Create open interaction for first stage
    const insertData: any = {
      opportunity_id: opportunityId,
      interaction_type: 'other',
      notes: `Stage opened: ${firstStageName}`,
      app_uuid: appUuid,
    };

    // Add optional fields
    if (initiatedById) {
      insertData.initiated_by_id = initiatedById;
    }

    // Try with new columns first
    insertData.stage_name = firstStageName;
    insertData.status = 'open';
    insertData.opened_at = new Date().toISOString();

    let interactionCreated = false;
    const { data: interactionData, error: interactionError } = await supabase
      .from('campaign_interactions')
      .insert(insertData)
      .select('id')
      .single();

    if (interactionError) {
      // If columns don't exist, try fallback
      if (interactionError.code === '42703' || interactionError.code === 'PGRST116' || interactionError.message?.includes('column') || interactionError.message?.includes('does not exist') || interactionError.message?.includes('Could not find')) {
        console.warn('New columns not found, using fallback structure for initial interaction');
        
        // Fallback to old structure
        const fallbackData: any = {
          opportunity_id: opportunityId,
          interaction_type: 'other',
          notes: `Stage opened: ${firstStageName}`,
          app_uuid: appUuid,
          interaction_date: new Date().toISOString(),
        };

        if (initiatedById) {
          fallbackData.initiated_by_id = initiatedById;
        }

        const { data: fallbackDataResult, error: fallbackError } = await supabase
          .from('campaign_interactions')
          .insert(fallbackData)
          .select('id')
          .single();

        if (fallbackError) {
          console.error('Error creating initial interaction (fallback):', {
            error: fallbackError,
            code: fallbackError.code,
            message: fallbackError.message,
            details: fallbackError.details,
            hint: fallbackError.hint,
            opportunityId,
          });
        } else if (fallbackDataResult) {
          interactionCreated = true;
          console.log('Successfully created initial interaction (fallback):', fallbackDataResult.id);
        }
      } else {
        console.error('Error creating initial interaction:', {
          error: interactionError,
          code: interactionError.code,
          message: interactionError.message,
          details: interactionError.details,
          hint: interactionError.hint,
          opportunityId,
        });
      }
    } else if (interactionData) {
      interactionCreated = true;
      console.log('Successfully created initial interaction:', interactionData.id);
    }

    if (!interactionCreated) {
      console.warn('WARNING: Initial interaction was not created for opportunity:', opportunityId);
    }
  } catch (interactionErr: any) {
    console.error('Unexpected error in auto-create interaction:', {
      error: interactionErr,
      message: interactionErr?.message,
      stack: interactionErr?.stack,
      opportunityId,
    });
  }

  return opportunityId;
}

/**
 * Get relationship type ID for 'employs'
 * @returns UUID of employs relationship type or null
 */
export async function getEmploysRelationshipTypeId(): Promise<string | null> {
  const { data, error } = await supabase
    .from('relationship_types')
    .select('id')
    .eq('code', 'employs')
    .maybeSingle();

  if (error) {
    console.error('Error fetching employs relationship type:', error);
    return null;
  }

  if (!data) {
    console.error('Employs relationship type not found');
    return null;
  }

  return data.id;
}

