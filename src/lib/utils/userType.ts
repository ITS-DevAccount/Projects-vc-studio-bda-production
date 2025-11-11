import { supabase } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';

export type UserType = 'admin' | 'stakeholder' | 'unknown';

export interface UserInfo {
  type: UserType;
  stakeholderRecord?: any; // From stakeholders table
  dashboardRoute?: string;
}

/**
 * Determines user type based on stakeholder record and primary_role_id
 * Uses stakeholder_type.code = 'admin' to identify admin users
 */
export async function getUserType(authUser: User | null): Promise<UserInfo> {
  if (!authUser) {
    return { type: 'unknown' };
  }

  try {
    // Get stakeholder record with stakeholder_type
    const { data: stakeholderRecord, error: stakeholderError } = await supabase
      .from('stakeholders')
      .select('*, stakeholder_type:stakeholder_types(code)')
      .eq('auth_user_id', authUser.id)
      .single();

    if (stakeholderError || !stakeholderRecord) {
      console.warn('Stakeholder not found for auth user:', authUser.id);
      return { type: 'unknown' };
    }

    // Simple routing logic:
    // - Admin stakeholder type → hardcoded admin dashboard
    // - All others (organisation, individual, etc.) → dynamic stakeholder dashboard
    const isAdmin = (stakeholderRecord.stakeholder_type as any)?.code === 'admin';

    if (isAdmin) {
      return {
        type: 'admin',
        stakeholderRecord,
        dashboardRoute: '/dashboard',
      };
    }

    // All non-admin stakeholders use the dynamic dashboard renderer
    return {
      type: 'stakeholder',
      stakeholderRecord,
      dashboardRoute: '/dashboard/stakeholder',
    };

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




