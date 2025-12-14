import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { getAppUuid } from '@/lib/server/getAppUuid';
import type { AuthError, SupabaseClient, User } from '@supabase/supabase-js';

function getAccessToken(req: NextRequest): string | undefined {
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return undefined;
}

async function listStakeholdersServer(params: {
  q?: string;
  type?: string;
  status?: string;
  verified?: 'true' | 'false';
  sort?: string;
  order?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}, accessToken?: string) {
  const supabase = await createServerClient(accessToken);
  const {
    q,
    type,
    status,
    verified,
    sort = 'created_at',
    order = 'desc',
    page = 1,
    pageSize = 50,
  } = params;

  let query = supabase
    .from('stakeholders')
    .select(`
      id, 
      reference, 
      name, 
      stakeholder_type_id, 
      primary_role_id, 
      email, 
      status, 
      is_verified, 
      created_at,
      stakeholder_type:stakeholder_type_id(id, code, label)
    `, { count: 'exact' });

  if (q) query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%`);
  if (type) query = query.eq('stakeholder_type_id', type);
  if (status) query = query.eq('status', status);
  if (verified === 'true' || verified === 'false') query = query.eq('is_verified', verified === 'true');

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await query.order(sort, { ascending: order === 'asc' }).range(from, to);
  if (error) {
    console.error('Error listing stakeholders:', error);
    throw error;
  }
  return { data: data || [], count: count || 0 };
}

type AuthAdminClient = SupabaseClient['auth']['admin'];

async function findAuthUserByEmail(admin: AuthAdminClient, email: string): Promise<{ user: User | null; error: AuthError | null }> {
  const normalizedEmail = email.trim().toLowerCase();
  let page = 1;
  const perPage = 100;

  while (true) {
    const response = await admin.listUsers({ page, perPage });
    if (response.error) {
      return { user: null, error: response.error };
    }

    const users = response.data?.users ?? [];
    const matchingUser = users.find((u) => (u.email ?? '').toLowerCase() === normalizedEmail);
    if (matchingUser) {
      return { user: matchingUser, error: null };
    }

    const nextPage = (response.data as (typeof response.data) & { nextPage?: number | null })?.nextPage ?? null;
    if (!nextPage || nextPage <= page) {
      break;
    }

    page = nextPage;
  }

  return { user: null, error: null };
}

export async function GET(req: NextRequest) {
  try {
    const accessToken = getAccessToken(req);
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') || undefined;
    const type = searchParams.get('type') || undefined;
    const status = searchParams.get('status') || undefined;
    const verified = (searchParams.get('verified') as 'true' | 'false') || undefined;
    const sort = searchParams.get('sort') || undefined;
    const order = (searchParams.get('order') as 'asc' | 'desc') || undefined;
    const page = Number(searchParams.get('page') || '1');
    const pageSize = Number(searchParams.get('pageSize') || '50');

    const result = await listStakeholdersServer({
      q, type, status, verified, sort, order, page, pageSize
    }, accessToken);
    return NextResponse.json(result);
  } catch (e: any) {
    console.error('API error in GET /api/stakeholders:', e);
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const accessToken = getAccessToken(req);
    const body = await req.json();

    const supabase = await createServerClient(accessToken);
    const { data: { user } } = await supabase.auth.getUser();

    let createdByUserId: string | null = null;
    if (user) {
      const { data: creatorRecord } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();
      createdByUserId = creatorRecord?.id ?? null;
    }

    const {
      stakeholder: stakeholderInput,
      roleCodes = [],
      primaryRoleId = null,
      relationships = [],
      portalAccess = { enabled: false, email: null, temporaryPassword: null },
    } = body && body.stakeholder ? body : {
      stakeholder: body,
      roleCodes: [],
      primaryRoleId: body?.primary_role_id ?? null,
      relationships: [],
      portalAccess: { enabled: Boolean(body?.is_user), email: body?.invite_email ?? body?.email ?? null, temporaryPassword: null },
    };

    if (!stakeholderInput?.name || !stakeholderInput?.stakeholder_type_id) {
      return NextResponse.json({ error: 'Stakeholder name and stakeholder_type_id are required' }, { status: 400 });
    }

    // Get app_uuid for multi-tenancy
    const appUuid = await getAppUuid(accessToken);
    console.log('[STAKEHOLDERS API] Using app_uuid:', appUuid);
    console.log('[STAKEHOLDERS API] Role codes being assigned:', roleCodes);
    console.log('[STAKEHOLDERS API] Primary role ID:', primaryRoleId);

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!serviceRoleKey || !supabaseUrl) {
      const missingVars = [];
      if (!serviceRoleKey) missingVars.push('SUPABASE_SERVICE_ROLE_KEY');
      if (!supabaseUrl) missingVars.push('NEXT_PUBLIC_SUPABASE_URL');
      
      console.error('Missing Supabase service role configuration for stakeholder provisioning:', {
        missing: missingVars,
        hasServiceRoleKey: !!serviceRoleKey,
        hasSupabaseUrl: !!supabaseUrl
      });
      
      return NextResponse.json({ 
        error: 'Server configuration error',
        details: `Missing required environment variables: ${missingVars.join(', ')}. The service role key is required for creating stakeholder accounts with user authentication. Get it from: Supabase Dashboard → Settings → API → service_role key`
      }, { status: 500 });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    let authUserId: string | null = stakeholderInput?.auth_user_id ?? null;
    let authEmail: string | null = portalAccess?.email ?? stakeholderInput?.invite_email ?? stakeholderInput?.email ?? null;
    let createdAuthUser = false;

    if (portalAccess?.enabled) {
      if (!authEmail) {
        return NextResponse.json({ error: 'Portal access requires an email address' }, { status: 400 });
      }

      const { user: existingUser, error: lookupError } = await findAuthUserByEmail(adminClient.auth.admin, authEmail);

      if (lookupError) {
        console.error('Failed to lookup auth user by email:', lookupError);
        return NextResponse.json({ error: 'Failed to lookup auth user' }, { status: 500 });
      }

      if (existingUser) {
        authUserId = existingUser.id;

        if (portalAccess?.temporaryPassword) {
          const { error: resetError } = await adminClient.auth.admin.updateUserById(authUserId, {
            password: portalAccess.temporaryPassword,
          });

          if (resetError) {
            console.error('Failed to reset password for existing auth user:', resetError);
            return NextResponse.json({ error: resetError.message || 'Failed to reset password' }, { status: 400 });
          }
        }
      } else {
        const passwordToUse = portalAccess?.temporaryPassword;
        if (!passwordToUse || passwordToUse.length < 8) {
          return NextResponse.json({ error: 'Temporary password must be at least 8 characters' }, { status: 400 });
        }

        const { data: createdUser, error: createUserError } = await adminClient.auth.admin.createUser({
          email: authEmail,
          password: passwordToUse,
          email_confirm: true,
        });

        if (createUserError) {
          console.error('Failed to create auth user:', createUserError);
          return NextResponse.json({ error: createUserError.message || 'Failed to create auth user' }, { status: 400 });
        }

        authUserId = createdUser.user?.id ?? null;
        if (!authUserId) {
          return NextResponse.json({ error: 'Auth user creation did not return an ID' }, { status: 500 });
        }
        createdAuthUser = true;
      }
    }

    const rpcPayload = {
      p_stakeholder: {
        ...stakeholderInput,
        auth_user_id: authUserId,
        invite_email: portalAccess?.enabled ? authEmail : stakeholderInput?.invite_email ?? null,
        is_user: portalAccess?.enabled ? true : stakeholderInput?.is_user ?? false,
      },
      p_role_codes: roleCodes?.length ? roleCodes : null,
      p_primary_role_id: primaryRoleId,
      p_relationships: relationships?.length ? relationships : null,
      p_auth_user_id: authUserId,
      p_invite_email: portalAccess?.enabled ? authEmail : stakeholderInput?.invite_email ?? null,
      p_is_user: portalAccess?.enabled ? true : stakeholderInput?.is_user ?? false,
      p_created_by: createdByUserId,
      p_app_uuid: appUuid, // Pass app_uuid to RPC function
    };

    console.log('RPC payload:', rpcPayload);

    let rpcResult;
    try {
      const { data: result, error: rpcError } = await adminClient.rpc('provision_stakeholder_v2', rpcPayload);
      console.log('RPC result:', { data: result, error: rpcError });
      if (rpcError) {
        throw rpcError;
      }
      rpcResult = result ?? {};
    } catch (rpcError: any) {
      console.error('Failed to provision stakeholder:', rpcError);

      if (createdAuthUser && authUserId) {
        await adminClient.auth.admin.deleteUser(authUserId);
      }

      return NextResponse.json({ error: rpcError.message || 'Failed to provision stakeholder' }, { status: 400 });
    }

    const stakeholderId = rpcResult?.stakeholder_out_id || stakeholderInput?.id;

    if (!stakeholderId) {
      console.error('Provision stakeholder function returned no ID');
      return NextResponse.json({ error: 'Provisioning failed without creating a stakeholder record' }, { status: 500 });
    }

    return NextResponse.json({ id: stakeholderId, auth_user_id: authUserId, invite_email: authEmail });
  } catch (e: any) {
    console.error('API error in POST /api/stakeholders:', e);
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 });
  }
}

