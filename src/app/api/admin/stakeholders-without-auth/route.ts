import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

/**
 * Admin endpoint to list stakeholders without auth users
 * Helps identify which stakeholders need auth credentials created
 */
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createServerClient()

    // Verify admin authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get stakeholders without auth_user_id
    const { data: stakeholders, error: stakeholdersError } = await supabase
      .from('stakeholders')
      .select(`
        id,
        name,
        email,
        phone,
        status,
        is_user,
        auth_user_id,
        invite_email,
        created_at,
        stakeholder_type:stakeholder_type_id (
          type_name,
          code
        )
      `)
      .is('auth_user_id', null)
      .order('created_at', { ascending: false })

    if (stakeholdersError) {
      console.error('Error fetching stakeholders:', stakeholdersError)
      return NextResponse.json(
        { error: 'Failed to fetch stakeholders' },
        { status: 500 }
      )
    }

    // Also get stakeholders WITH auth users for comparison
    const { data: stakeholdersWithAuth, error: withAuthError } = await supabase
      .from('stakeholders')
      .select(`
        id,
        name,
        email,
        status,
        is_user,
        auth_user_id,
        created_at
      `)
      .not('auth_user_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(5)

    if (withAuthError) {
      console.warn('Error fetching stakeholders with auth:', withAuthError)
    }

    return NextResponse.json({
      stakeholders_without_auth: stakeholders || [],
      count_without_auth: stakeholders?.length || 0,
      recent_stakeholders_with_auth: stakeholdersWithAuth || [],
      message: 'Use POST /api/stakeholders/create-user to create auth credentials for these stakeholders'
    })

  } catch (error) {
    console.error('Error in stakeholders-without-auth endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
