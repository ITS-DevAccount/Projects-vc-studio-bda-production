import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

function getAccessToken(req: NextRequest): string | undefined {
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return undefined;
}

export async function GET(request: NextRequest) {
  try {
    const accessToken = getAccessToken(request);
    const supabase = await createServerClient(accessToken)

    // Get stakeholder_id from query params
    const searchParams = request.nextUrl.searchParams
    const stakeholderId = searchParams.get('stakeholder_id')

    if (!stakeholderId) {
      return NextResponse.json(
        { error: 'stakeholder_id is required' },
        { status: 400 }
      )
    }

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Fetch stakeholder to verify ownership
    const { data: stakeholder, error: stakeholderError } = await supabase
      .from('stakeholders')
      .select('id, auth_user_id')
      .eq('id', stakeholderId)
      .single()

    if (stakeholderError || !stakeholder) {
      return NextResponse.json(
        { error: 'Stakeholder not found' },
        { status: 404 }
      )
    }

    // Verify user owns this stakeholder record
    if (stakeholder.auth_user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    // Fetch roles - simplified query
    const { data: rolesData, error: rolesError } = await supabase
      .from('stakeholder_roles')
      .select('role_id, role_type')
      .eq('stakeholder_id', stakeholderId)

    if (rolesError) {
      console.error('Error fetching roles:', rolesError)
      return NextResponse.json(
        { error: 'Failed to fetch roles' },
        { status: 500 }
      )
    }

    // Format roles - use simple data for now
    const roles = rolesData?.map((r: any) => ({
      id: r.role_id,
      role_name: r.role_type,
      description: '',
      code: r.role_type
    })) || []

    // Fetch relationships - simplified query without joins
    const { data: relationshipsData, error: relationshipsError } = await supabase
      .from('relationships')
      .select('id, to_stakeholder_id, relationship_type_id, strength, status')
      .eq('from_stakeholder_id', stakeholderId)
      .eq('status', 'active')

    if (relationshipsError) {
      console.error('Error fetching relationships:', relationshipsError)
      return NextResponse.json(
        { error: 'Failed to fetch relationships' },
        { status: 500 }
      )
    }

    // Fetch related stakeholder names and relationship types separately if needed
    const relationships = await Promise.all(
      (relationshipsData || []).map(async (rel: any) => {
        // Fetch stakeholder name
        const { data: stakeholderData } = await supabase
          .from('stakeholders')
          .select('name')
          .eq('id', rel.to_stakeholder_id)
          .single()

        // Fetch relationship type
        const { data: relationshipTypeData } = await supabase
          .from('relationship_types')
          .select('type_name')
          .eq('id', rel.relationship_type_id)
          .single()

        return {
          id: rel.id,
          related_stakeholder_name: stakeholderData?.name || 'Unknown',
          relationship_type: relationshipTypeData?.type_name || 'Unknown',
          strength: rel.strength,
          status: rel.status
        }
      })
    )

    return NextResponse.json({
      roles,
      relationships
    })

  } catch (error) {
    console.error('Error in roles-relationships endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
