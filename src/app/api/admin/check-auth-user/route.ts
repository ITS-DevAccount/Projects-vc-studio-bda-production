import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Admin endpoint to check auth user status
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

    if (!serviceRoleKey || !supabaseUrl) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

    // Get auth user by email
    const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers()

    if (listError) {
      console.error('Error listing users:', listError)
      return NextResponse.json({ error: listError.message }, { status: 500 })
    }

    const authUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase())

    if (!authUser) {
      return NextResponse.json({
        found: false,
        message: 'No auth user found with this email'
      })
    }

    // Get stakeholder linked to this auth user
    const { data: stakeholder, error: stakeholderError } = await adminClient
      .from('stakeholders')
      .select('id, name, email, status, is_user, auth_user_id')
      .eq('auth_user_id', authUser.id)
      .single()

    return NextResponse.json({
      found: true,
      auth_user: {
        id: authUser.id,
        email: authUser.email,
        email_confirmed_at: authUser.email_confirmed_at,
        confirmed: !!authUser.email_confirmed_at,
        created_at: authUser.created_at,
        last_sign_in_at: authUser.last_sign_in_at,
        banned: authUser.banned_until ? true : false,
        banned_until: authUser.banned_until,
        user_metadata: authUser.user_metadata,
      },
      stakeholder: stakeholder || null,
      diagnosis: {
        can_login: !!authUser.email_confirmed_at && !authUser.banned_until,
        issues: [
          !authUser.email_confirmed_at ? 'Email not confirmed' : null,
          authUser.banned_until ? 'User is banned' : null,
          !stakeholder ? 'No stakeholder record linked' : null,
        ].filter(Boolean)
      }
    })

  } catch (error) {
    console.error('Error checking auth user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
