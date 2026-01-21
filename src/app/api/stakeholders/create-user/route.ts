import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { getCurrentAppUuid } from '@/lib/supabase/app-helpers';

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
    const {
      stakeholderId,
      email,
      temporaryPassword,
    } = await req.json();

    if (!stakeholderId) {
      return NextResponse.json({ error: 'Missing stakeholderId' }, { status: 400 });
    }

    const supabase = await createServerClient(accessToken);
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!serviceRoleKey || !supabaseUrl) {
      console.error('Missing Supabase service role configuration');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }
    const adminClient = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const { data: stakeholder, error: stakeholderError } = await supabase
      .from('stakeholders')
      .select('*')
      .eq('id', stakeholderId)
      .single();

    if (stakeholderError) {
      console.error('Failed to load stakeholder:', stakeholderError);
      return NextResponse.json({ error: 'Stakeholder not found' }, { status: 404 });
    }

    const allowTestEmails = (process.env.ALLOW_TEST_USER_EMAILS || '').toLowerCase() === 'true';
    const testEmailDomain = process.env.TEST_USER_EMAIL_DOMAIN || 'example.test';

    let finalEmail = (email || '').trim();

    if ((!finalEmail || !finalEmail.includes('@')) && allowTestEmails) {
      finalEmail = `stakeholder+${randomUUID()}@${testEmailDomain}`;
      console.log('Generated test stakeholder email', { stakeholderId, finalEmail });
    }

    if (!finalEmail || !finalEmail.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }

    if (!temporaryPassword && !stakeholder.auth_user_id) {
      return NextResponse.json({
        error: 'Temporary password is required when creating a new account',
      }, { status: 400 });
    }

    let authUserId = stakeholder.auth_user_id;

    if (!authUserId) {
      const { data: signUpData, error: signUpError } = await adminClient.auth.admin.createUser({
        email: finalEmail,
        password: temporaryPassword,
        email_confirm: true,
      });

      if (signUpError) {
        console.error('Failed to create auth user:', signUpError);
        return NextResponse.json({ error: signUpError.message }, { status: 400 });
      }

      authUserId = signUpData.user?.id;

      if (!authUserId) {
        return NextResponse.json({ error: 'Failed to create auth user' }, { status: 500 });
      }

      const { error: updateStakeholderError } = await supabase
        .from('stakeholders')
        .update({ auth_user_id: authUserId, is_user: true, invite_email: finalEmail })
        .eq('id', stakeholderId);

      if (updateStakeholderError) {
        console.error('Failed to update stakeholder with auth user:', updateStakeholderError);
        return NextResponse.json({ error: 'Failed to update stakeholder record' }, { status: 500 });
      }
    } else {
      const updatePayload: Record<string, any> = {};
      if (temporaryPassword) {
        updatePayload.password = temporaryPassword;
      }
      if (finalEmail) {
        updatePayload.email = finalEmail;
      }

      if (Object.keys(updatePayload).length > 0) {
        const { error: adminUpdateError } = await adminClient.auth.admin.updateUserById(authUserId, updatePayload);

        if (adminUpdateError) {
          console.error('Failed to update existing auth user:', adminUpdateError);
          return NextResponse.json({ error: adminUpdateError.message }, { status: 400 });
        }
      }

      if (finalEmail) {
        const { error: updateStakeholderEmailError } = await supabase
          .from('stakeholders')
          .update({ invite_email: finalEmail, is_user: true })
          .eq('id', stakeholderId);

        if (updateStakeholderEmailError) {
          console.error('Failed to refresh stakeholder invite email:', updateStakeholderEmailError);
          return NextResponse.json({ error: 'Failed to update stakeholder record' }, { status: 500 });
        }
      }
    }

    // No public.users entry for stakeholders

    // Auto-create workspace if stakeholder doesn't have one and role has a template
    let workspaceCreated = false;
    let workspaceId = null;

    try {
      // Get the app UUID
      const appUuid = await getCurrentAppUuid();

      if (appUuid) {
        // Check if stakeholder already has a workspace
        const { data: existingWorkspace } = await supabase
          .from('workspaces')
          .select('id')
          .eq('owner_stakeholder_id', stakeholderId)
          .eq('app_uuid', appUuid)
          .eq('status', 'active')
          .maybeSingle();

        if (!existingWorkspace) {
          // Get stakeholder with primary role
          const { data: stakeholderWithRole } = await supabase
            .from('stakeholders')
            .select(`
              id,
              name,
              primary_role_id,
              roles!inner(
                id,
                code,
                workspace_template_id
              )
            `)
            .eq('id', stakeholderId)
            .single();

          const role = Array.isArray(stakeholderWithRole?.roles) ? stakeholderWithRole.roles[0] : stakeholderWithRole?.roles;
          
          if (stakeholderWithRole && role?.workspace_template_id) {
            console.log(`[Create User] Auto-creating workspace for stakeholder ${stakeholderId} with template ${role.workspace_template_id}`);

            // Call provision_workspace RPC to create workspace
            const { data: workspaceData, error: workspaceError } = await supabase.rpc('provision_workspace', {
              p_workspace_name: `${stakeholderWithRole.name}'s Workspace`,
              p_owner_stakeholder_id: stakeholderId,
              p_app_uuid: appUuid,
              p_primary_role_code: role.code,
              p_template_id: role.workspace_template_id,
              p_description: `Workspace for ${stakeholderWithRole.name}`,
            });

            if (workspaceError) {
              console.error('[Create User] Failed to create workspace:', workspaceError);
              // Don't fail the whole operation, just log the error
            } else if (workspaceData?.success) {
              workspaceCreated = true;
              workspaceId = workspaceData.workspace_id;
              console.log(`[Create User] Workspace created successfully: ${workspaceId}`);
            }
          } else {
            console.log(`[Create User] Stakeholder's role has no workspace template, skipping auto-creation`);
          }
        } else {
          console.log(`[Create User] Stakeholder already has a workspace, skipping auto-creation`);
        }
      }
    } catch (workspaceErr: any) {
      console.error('[Create User] Error in workspace auto-creation:', workspaceErr);
      // Don't fail the whole operation
    }

    return NextResponse.json({
      ok: true,
      auth_user_id: authUserId,
      email: finalEmail,
      workspace_created: workspaceCreated,
      workspace_id: workspaceId,
    });
  } catch (e: any) {
    console.error('API error in POST /api/stakeholders/create-user:', e);
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 });
  }
}


