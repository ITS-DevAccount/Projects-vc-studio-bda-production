import { supabase } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';

export type UserType = 'admin' | 'stakeholder' | 'unknown';

export interface UserInfo {
  type: UserType;
  userRecord?: any; // From users table
  stakeholderRecord?: any; // From stakeholders table
}

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

    if (!userError && userRecord) {
      return {
        type: 'admin',
        userRecord,
      };
    }

    // If not in users table, check if they're a stakeholder
    const { data: stakeholderRecord, error: stakeholderError } = await supabase
      .from('stakeholders')
      .select('*')
      .eq('auth_user_id', authUser.id)
      .single();

    if (!stakeholderError && stakeholderRecord) {
      return {
        type: 'stakeholder',
        stakeholderRecord,
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
export function getDashboardRoute(userType: UserType): string {
  switch (userType) {
    case 'admin':
      return '/dashboard';
    case 'stakeholder':
      return '/dashboard/stakeholder';
    default:
      return '/dashboard'; // Default to admin dashboard
  }
}

