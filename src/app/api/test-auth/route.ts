import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createServerClient()

    // Test connection
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    // Test database connection
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id, name')
      .limit(1)

    const { data: stakeholdersData, error: stakeholdersError } = await supabase
      .from('stakeholders')
      .select('id, name, email')
      .limit(1)

    return NextResponse.json({
      supabaseConnected: true,
      currentUser: user ? { id: user.id, email: user.email } : null,
      userError: userError?.message || null,
      usersTableWorks: !usersError,
      usersError: usersError?.message || null,
      usersCount: usersData?.length || 0,
      stakeholdersTableWorks: !stakeholdersError,
      stakeholdersError: stakeholdersError?.message || null,
      stakeholdersCount: stakeholdersData?.length || 0
    })
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      supabaseConnected: false
    }, { status: 500 })
  }
}
