import { supabase } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import { getDashboardRouteForStakeholder } from '@/lib/db/dashboardRoutes';

export type UserType = 'admin' | 'stakeholder' | 'unknown';

export interface UserInfo {
  type: UserType;
  userRecord?: any; // From users table
  stakeholderRecord?: any; // From stakeholders table
  dashboardRoute?: string;
}

const ADMIN_ROLES = new Set(['super_admin', 'domain_admin', 'manager', 'viewer']);

/**
 * Determines if a logged-in user is an admin (in users table) or a stakeholder
 */
export async function getUserType(authUser: User | null): Promise<UserInfo> {
  if (!authUser) {
    return { type: 'unknown' };
  }

  try {
    // First check if they're in the users table (admin)
    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('auth_user_id', authUser.id)
      .single();

    if (userError) {
      console.warn('Admin lookup failed in getUserType', {
        code: (userError as any)?.code,
        message: userError.message,
        details: (userError as any)?.details,
        hint: (userError as any)?.hint,
      });
    }

    if (!userError && userRecord && ADMIN_ROLES.has(userRecord.role)) {
      return {
        type: 'admin',
        userRecord,
        dashboardRoute: '/dashboard',
      };
    }

    if (userRecord && !ADMIN_ROLES.has(userRecord.role)) {
      console.log('User record found but role is not admin, treating as stakeholder', {
        role: userRecord.role,
        authUserId: authUser.id,
      });
    }

    // If not in users table, check if they're a stakeholder
    const { data: stakeholderRecord, error: stakeholderError } = await supabase
      .from('stakeholders')
      .select('*')
      .eq('auth_user_id', authUser.id)
      .single();

    if (!stakeholderError && stakeholderRecord) {
      const route = await getDashboardRouteForStakeholder(
        stakeholderRecord.id,
        stakeholderRecord.stakeholder_type_id || null,
        stakeholderRecord.primary_role_id || null
      );

      return {
        type: 'stakeholder',
        stakeholderRecord,
        dashboardRoute: route || '/dashboard/stakeholder',
      };
    }

    // Neither found
    return { type: 'unknown' };
  } catch (error) {
    console.error('Error determining user type:', error);
    return { type: 'unknown' };
  }
}

/**
 * Gets the appropriate dashboard route for a user type
 */
export function getDashboardRoute(userInfo: UserInfo): string {
  if (userInfo.dashboardRoute) {
    return userInfo.dashboardRoute;
  }

  switch (userInfo.type) {
    case 'admin':
      return '/dashboard';
    case 'stakeholder':
      return '/dashboard/stakeholder';
    default:
      return '/dashboard'; // Default to admin dashboard
  }
}




