import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({
        error: 'Not authenticated',
        user: null
      })
    }

    // Get stakeholder data
    const { data: stakeholder, error: stakeholderError } = await supabase
      .from('stakeholders')
      .select(`
        id,
        name,
        email,
        stakeholder_type_id,
        phone,
        country,
        city,
        core_config,
        auth_user_id,
        stakeholder_type:stakeholder_type_id(type_name)
      `)
      .eq('auth_user_id', user.id)
      .single()

    if (stakeholderError) {
      return NextResponse.json({
        error: 'Stakeholder not found',
        details: stakeholderError.message,
        auth_user_id: user.id
      })
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email
      },
      stakeholder: {
        id: stakeholder.id,
        name: stakeholder.name,
        email: stakeholder.email,
        stakeholder_type: stakeholder.stakeholder_type?.type_name,
        has_core_config: !!stakeholder.core_config && Object.keys(stakeholder.core_config).length > 0,
        core_config_keys: stakeholder.core_config ? Object.keys(stakeholder.core_config) : [],
        core_config: stakeholder.core_config
      },
      diagnosis: {
        migrations_applied: !!stakeholder.core_config,
        ready_for_dashboard: !!stakeholder.core_config &&
                            !!stakeholder.core_config.role_configurations
      }
    })

  } catch (error) {
    console.error('Debug error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
