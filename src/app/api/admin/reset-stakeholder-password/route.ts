import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Admin endpoint to reset stakeholder password and confirm email
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, new_password } = body

    if (!email || !new_password) {
      return NextResponse.json(
        { error: 'Email and new_password are required' },
        { status: 400 }
      )
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

    // Find user by email
    const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers()

    if (listError) {
      console.error('Error listing users:', listError)
      return NextResponse.json({ error: listError.message }, { status: 500 })
    }

    const authUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase())

    if (!authUser) {
      return NextResponse.json({ error: 'Auth user not found' }, { status: 404 })
    }

    // Update password and confirm email
    const { error: updateError } = await adminClient.auth.admin.updateUserById(
      authUser.id,
      {
        password: new_password,
        email_confirm: true, // Auto-confirm email
      }
    )

    if (updateError) {
      console.error('Error updating user:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Activate the stakeholder
    const { error: stakeholderError } = await adminClient
      .from('stakeholders')
      .update({ status: 'active', is_user: true })
      .eq('auth_user_id', authUser.id)

    if (stakeholderError) {
      console.warn('Could not update stakeholder status:', stakeholderError)
    }

    return NextResponse.json({
      success: true,
      email: email,
      message: 'Password reset and email confirmed. User can now login.',
      auth_user_id: authUser.id
    })

  } catch (error) {
    console.error('Error resetting password:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
