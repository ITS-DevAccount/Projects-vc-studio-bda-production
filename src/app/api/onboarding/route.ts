import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getCurrentAppUuid } from '@/lib/supabase/app-helpers';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const body = await request.json();

    const {
      stakeholder_type_code,
      name,
      email,
      phone,
      website,
      country,
      region,
      city,
      industry,
      bio,
      professional_background,
      registration_number,
      size,
      lead_contact,
      role_codes,
      primary_role_code,
      relationships,
      role_details,
      terms_accepted,
      marketing_consent,
    } = body;

    // Validation
    if (!stakeholder_type_code || !name || !email) {
      return NextResponse.json(
        { error: 'Missing required fields: stakeholder_type_code, name, email' },
        { status: 400 }
      );
    }

    if (!role_codes || role_codes.length === 0) {
      return NextResponse.json(
        { error: 'At least one role must be selected' },
        { status: 400 }
      );
    }

    if (!terms_accepted) {
      return NextResponse.json(
        { error: 'You must accept the terms and conditions' },
        { status: 400 }
      );
    }

    // Get stakeholder type ID
    const { data: stakeholderType, error: typeError } = await supabase
      .from('stakeholder_types')
      .select('id')
      .eq('code', stakeholder_type_code)
      .single();

    if (typeError || !stakeholderType) {
      return NextResponse.json(
        { error: 'Invalid stakeholder type' },
        { status: 400 }
      );
    }

    // Get primary role ID
    const { data: primaryRole, error: roleError } = await supabase
      .from('roles')
      .select('id')
      .eq('code', primary_role_code || role_codes[0])
      .single();

    if (roleError || !primaryRole) {
      return NextResponse.json(
        { error: 'Invalid primary role' },
        { status: 400 }
      );
    }

    // Build metadata object with type-specific fields
    const metadata: Record<string, any> = {
      marketing_consent,
      onboarded_at: new Date().toISOString(),
    };

    if (bio) metadata.bio = bio;
    if (professional_background) metadata.professional_background = professional_background;
    if (registration_number) metadata.registration_number = registration_number;
    if (size) metadata.size = size;
    if (lead_contact) metadata.lead_contact = lead_contact;
    if (role_details) metadata.role_details = role_details;

    // Build stakeholder object for provision_stakeholder function
    const stakeholderData = {
      name,
      stakeholder_type_id: stakeholderType.id,
      primary_role_id: primaryRole.id,
      email,
      phone: phone || null,
      website: website || null,
      country: country || null,
      region: region || null,
      city: city || null,
      industry: industry || null,
      status: 'pending',
      is_verified: false,
      metadata,
    };

    // Transform relationships to match expected format
    const relationshipsData = relationships?.map((rel: any) => ({
      to_stakeholder_id: rel.to_stakeholder_id,
      relationship_type_id: rel.relationship_type_id,
      strength: rel.strength || null,
      metadata: rel.metadata || {},
    })) || [];

    // Call provision_stakeholder stored function
    const { data: result, error: provisionError } = await supabase.rpc(
      'provision_stakeholder',
      {
        p_stakeholder: stakeholderData,
        p_role_codes: role_codes,
        p_primary_role_id: primaryRole.id,
        p_relationships: relationshipsData,
        p_auth_user_id: null, // Will be set later when user verifies email
        p_invite_email: email,
        p_is_user: false, // Not a system user yet
        p_created_by: null, // Self-registration
      }
    );

    if (provisionError) {
      console.error('Error provisioning stakeholder:', provisionError);
      return NextResponse.json(
        { error: 'Failed to create stakeholder', details: provisionError.message },
        { status: 500 }
      );
    }

    // TODO: Send verification email
    // This would integrate with your email service (SendGrid, Resend, etc.)
    // For now, we'll just return success

    // Auto-create workspace if role has a template
    let workspaceCreated = false;
    let workspaceId = null;

    try {
      // Get the app UUID
      const appUuid = await getCurrentAppUuid();

      if (appUuid && result?.stakeholder_out_id) {
        // Look up if the primary role has a workspace template
        const { data: roleWithTemplate } = await supabase
          .from('roles')
          .select('id, code, workspace_template_id')
          .eq('id', primaryRole.id)
          .single();

        if (roleWithTemplate?.workspace_template_id) {
          console.log(`[Onboarding] Auto-creating workspace for stakeholder ${result.stakeholder_out_id} with template ${roleWithTemplate.workspace_template_id}`);

          // Call provision_workspace RPC to create workspace
          const { data: workspaceData, error: workspaceError } = await supabase.rpc('provision_workspace', {
            p_workspace_name: `${name}'s Workspace`,
            p_owner_stakeholder_id: result.stakeholder_out_id,
            p_app_uuid: appUuid,
            p_primary_role_code: primary_role_code || role_codes[0],
            p_template_id: roleWithTemplate.workspace_template_id,
            p_description: `Workspace for ${name}`,
          });

          if (workspaceError) {
            console.error('[Onboarding] Failed to create workspace:', workspaceError);
            // Don't fail the whole onboarding, just log the error
          } else if (workspaceData?.success) {
            workspaceCreated = true;
            workspaceId = workspaceData.workspace_id;
            console.log(`[Onboarding] Workspace created successfully: ${workspaceId}`);
          }
        } else {
          console.log(`[Onboarding] Role ${primary_role_code} has no workspace template, skipping auto-creation`);
        }
      }
    } catch (workspaceErr: any) {
      console.error('[Onboarding] Error in workspace auto-creation:', workspaceErr);
      // Don't fail the whole onboarding
    }

    return NextResponse.json({
      success: true,
      stakeholder_id: result?.stakeholder_out_id,
      is_new: result?.is_new,
      workspace_created: workspaceCreated,
      workspace_id: workspaceId,
      message: 'Registration successful! Please check your email to verify your account.',
    });
  } catch (error: any) {
    console.error('Onboarding error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred', details: error.message },
      { status: 500 }
    );
  }
}

// GET endpoint to fetch onboarding reference data
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // Fetch stakeholder types, roles, and relationship types
    const [
      { data: stakeholderTypes, error: typesError },
      { data: roles, error: rolesError },
      { data: relationshipTypes, error: relTypesError },
    ] = await Promise.all([
      supabase
        .from('stakeholder_types')
        .select('*')
        .eq('is_active', true)
        .order('label'),
      supabase
        .from('roles')
        .select('*')
        .eq('is_active', true)
        .order('label'),
      supabase
        .from('relationship_types')
        .select('*')
        .eq('is_active', true)
        .order('label'),
    ]);

    if (typesError || rolesError || relTypesError) {
      throw typesError || rolesError || relTypesError;
    }

    return NextResponse.json({
      stakeholder_types: stakeholderTypes || [],
      roles: roles || [],
      relationship_types: relationshipTypes || [],
    });
  } catch (error: any) {
    console.error('Error fetching onboarding data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch onboarding data', details: error.message },
      { status: 500 }
    );
  }
}
