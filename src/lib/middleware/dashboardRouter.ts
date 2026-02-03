import { createClient, isRefreshTokenError } from '@/lib/supabase/client'

export async function getDashboardPath(userId: string): Promise<string> {
  // Use the browser client which has session context
  const supabase = createClient()

  try {
    // First verify we have a valid session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session) {
      console.error('[DashboardRouter] No valid session:', sessionError)
      // If it's a refresh token error, we'll handle it upstream
      if (isRefreshTokenError(sessionError)) {
        throw sessionError
      }
      return '/auth/login'
    }

    // Log session info for debugging
    console.log('[DashboardRouter] Session info:', {
      userId: userId,
      authUid: session.user.id,
      match: userId === session.user.id,
      email: session.user.email
    })

    // Query users table - use maybeSingle() to avoid coercion errors when no record exists
    // Use session.user.id directly since RLS policies check against auth.uid()
    const queryUserId = session.user.id
    console.log('[DashboardRouter] Querying users table with userId:', queryUserId)
    
    const { data: user, error } = await supabase
      .from('users')
      .select('role')
      .eq('auth_user_id', queryUserId)
      .maybeSingle()

    if (error) {
      // Log detailed error information
      try {
        const errorDetails = {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          status: (error as any).status,
          statusText: (error as any).statusText,
        }
        console.log('[DashboardRouter] Users table query error:', errorDetails)
      } catch (logError) {
        console.log('[DashboardRouter] Users table query error (raw):', error)
      }
      
      // If it's an auth error (401), the session might be invalid
      if (error.code === 'PGRST301' || error.message?.includes('JWT') || error.message?.includes('token')) {
        console.error('[DashboardRouter] Auth error querying users table')
        throw new Error('Authentication error')
      }
      
      // Handle 406 Not Acceptable errors (often RLS-related or not found)
      // Also handle PGRST116 (not found) - continue to check stakeholders
      if ((error as any).status === 406 || error.code === 'PGRST116') {
        console.warn('[DashboardRouter] 406/not found error querying users - checking stakeholders...')
        // Continue to check stakeholders below
      } else {
        // For other errors, log and redirect to login
        console.error('[DashboardRouter] Error querying users:', {
          message: error.message || 'Unknown error',
          code: error.code || 'No code',
          details: error.details || 'No details',
          hint: error.hint || 'No hint',
          status: (error as any).status,
        })
        return '/auth/login'
      }
    }

      // If user not found (or error occurred), check stakeholders
    // BUT FIRST: Check if user might be an admin by checking stakeholders with admin type
    if (!user) {
      console.log('[DashboardRouter] User not found in users table, checking stakeholders...')
      
      // Check if there's a stakeholder with admin type
      // Use session.user.id directly since queryUserId is defined later
      const { data: adminStakeholder } = await supabase
        .from('stakeholders')
        .select('id, stakeholder_type:stakeholder_types(code)')
        .eq('auth_user_id', session.user.id)
        .maybeSingle()
      
      // Check if they have an active workspace first - if so, they should go to the workspace dashboard
      // This allows admin users to also have workspaces (e.g. for testing)
      if (adminStakeholder) {
        console.log('[DashboardRouter] Checking for active workspace for stakeholder:', adminStakeholder.id)
        const { data: workspace } = await supabase
          .from('workspaces')
          .select('id, primary_role_code')
          .eq('owner_stakeholder_id', adminStakeholder.id)
          .eq('status', 'active')
          .limit(1)
          .maybeSingle()
          
        if (workspace) {
          console.log('[DashboardRouter] Found active workspace, routing to stakeholder dashboard. Role:', workspace.primary_role_code)
          return '/dashboard/stakeholder'
        }

        const stakeholderType = (adminStakeholder.stakeholder_type as any)?.code
        console.log('[DashboardRouter] Found stakeholder, type:', stakeholderType)
        
        // If stakeholder type is 'admin' (and no workspace found), route to admin dashboard
        if (stakeholderType === 'admin') {
          console.log('[DashboardRouter] Admin stakeholder detected, routing to /dashboard/admin')
          return '/dashboard/admin'
        }
      }
      
      console.log('[DashboardRouter] Checking stakeholders for regular stakeholder...')
      console.log('[DashboardRouter] Searching for stakeholder with auth_user_id:', userId)
      
      // First, let's try to get the current user's ID from the session to verify
      const { data: { user: authUser } } = await supabase.auth.getUser()
      console.log('[DashboardRouter] Current auth user ID:', authUser?.id)
      
      // Try querying stakeholders - first without filter to see if RLS allows any access
      const { data: allStakeholders, error: testError } = await supabase
        .from('stakeholders')
        .select('id, auth_user_id, email')
        .limit(1)
      
      console.log('[DashboardRouter] Test stakeholders query (no filter):', {
        hasData: !!allStakeholders,
        data: allStakeholders,
        error: testError ? {
          message: testError.message,
          code: testError.code,
          status: (testError as any).status,
        } : null
      })
      
      // Now try the actual query - RLS should allow this if auth_user_id = auth.uid()
      // Since RLS checks auth.uid(), we should query using the session user ID
      const queryUserId = session.user.id
      console.log('[DashboardRouter] Querying stakeholders with userId:', queryUserId)
      
      let { data: stakeholder, error: stakeholderError } = await supabase
        .from('stakeholders')
        .select('id, auth_user_id, email')
        .eq('auth_user_id', queryUserId)
        .maybeSingle()

      if (stakeholderError) {
        // Log stakeholder query error with full details
        console.error('[DashboardRouter] Stakeholder query error:', {
          message: stakeholderError.message,
          code: stakeholderError.code,
          details: stakeholderError.details,
          hint: stakeholderError.hint,
          status: (stakeholderError as any).status,
          statusText: (stakeholderError as any).statusText,
        })
      }

      // If no stakeholder found by auth_user_id, try searching by email as fallback
      // This handles cases where auth_user_id doesn't match (data inconsistency)
      if (!stakeholder && session.user.email) {
        console.warn('[DashboardRouter] Stakeholder not found by auth_user_id, trying email fallback:', session.user.email)
        const { data: stakeholderByEmail, error: emailError } = await supabase
          .from('stakeholders')
          .select('id, auth_user_id, email')
          .eq('email', session.user.email)
          .maybeSingle()
        
        if (emailError) {
          console.error('[DashboardRouter] Stakeholder query by email error:', {
            message: emailError.message,
            code: emailError.code,
            status: (emailError as any).status,
          })
        } else if (stakeholderByEmail) {
          console.warn('[DashboardRouter] Found stakeholder by email but auth_user_id mismatch!', {
            stakeholderAuthUserId: stakeholderByEmail.auth_user_id,
            currentAuthUserId: queryUserId,
            email: stakeholderByEmail.email
          })
          console.warn('[DashboardRouter] WARNING: Data inconsistency detected! The stakeholder record has auth_user_id:', stakeholderByEmail.auth_user_id, 'but the authenticated user ID is:', queryUserId)
          console.warn('[DashboardRouter] This should be fixed in the database. For now, routing to stakeholder dashboard.')
          // Still route to stakeholder dashboard even with mismatch
          stakeholder = stakeholderByEmail
        }
      }

      if (stakeholder) {
        console.log('[DashboardRouter] Stakeholder found:', stakeholder, 'routing to stakeholder dashboard')
        return '/dashboard/stakeholder'
      }

      // User not found in either table
      console.warn('[DashboardRouter] User not found in users or stakeholders table')
      console.warn('[DashboardRouter] This might be an RLS issue. Check that:')
      console.warn('  1. The user exists in the stakeholders table')
      console.warn('  2. The auth_user_id matches auth.uid()')
      console.warn('  3. RLS policies allow SELECT on stakeholders for authenticated users')
      return '/auth/login'
    }

    // User found in users table - check role and route accordingly
    console.log('[DashboardRouter] User role from users table:', user.role)
    
    // Admin roles → admin dashboard
    const adminRoles = ['super_admin', 'domain_admin', 'app_manager', 'admin']
    if (adminRoles.includes(user.role)) {
      console.log('[DashboardRouter] Admin user detected (role:', user.role, '), routing to /dashboard/admin')
      return '/dashboard/admin'
    }

    // If user role is not admin, check if they have an admin stakeholder type
    // This handles cases where admin users might not have the role set correctly in users table
    const { data: stakeholderCheck } = await supabase
      .from('stakeholders')
      .select('id, stakeholder_type:stakeholder_types(code)')
      .eq('auth_user_id', queryUserId)
      .maybeSingle()
    
    if (stakeholderCheck) {
      const stakeholderType = (stakeholderCheck.stakeholder_type as any)?.code
      console.log('[DashboardRouter] User also has stakeholder record, type:', stakeholderType)
      
      if (stakeholderType === 'admin') {
        console.log('[DashboardRouter] Admin stakeholder type detected, routing to /dashboard/admin')
        return '/dashboard/admin'
      }
    }

    // Regular users → user dashboard (existing dashboard)
    console.log('[DashboardRouter] Regular user detected (role:', user.role, '), routing to /dashboard')
    return '/dashboard'
  } catch (error: any) {
    // Handle refresh token errors specifically
    if (isRefreshTokenError(error)) {
      console.error('[DashboardRouter] Refresh token error:', error.message)
      throw error // Re-throw to be handled upstream
    }
    
    // If there's any other error, log and redirect to login
    console.error('[DashboardRouter] Error determining dashboard path:', error)
    return '/auth/login'
  }
}

