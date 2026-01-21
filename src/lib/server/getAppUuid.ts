/**
 * Server-side utility to get the current app_uuid
 * Used by API routes to filter data by application
 */

import { createServerClient } from '@/lib/supabase/server';

export interface AppContext {
  app_uuid: string;
  site_code: string;
  domain_code: string;
  site_name: string;
  is_active_app: boolean;
}

/**
 * Get the app_uuid for the current application
 * @param accessToken - Optional access token for authentication
 * @returns The app_uuid string
 * @throws Error if no active app found
 */
export async function getAppUuid(accessToken?: string): Promise<string> {
  const context = await getAppContext(accessToken);
  return context.app_uuid;
}

/**
 * Get the full app context including site_code, domain_code, etc.
 * @param accessToken - Optional access token for authentication
 * @returns AppContext object
 * @throws Error if no active app found
 */
export async function getAppContext(accessToken?: string): Promise<AppContext> {
  try {
    const supabase = await createServerClient(accessToken);

    // Get app_code from environment variable
    const appCode = process.env.NEXT_PUBLIC_APP_CODE || 'VC_STUDIO';

    // Query applications table: SELECT id as app_uuid FROM applications WHERE app_code = $1 LIMIT 1
    const { data, error } = await supabase
      .from('applications')
      .select('id, app_code, app_name')
      .eq('app_code', appCode)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching app context:', error);
      // Check if it's an RLS policy error or authentication error
      if (error.code === 'PGRST301' || error.message?.includes('permission denied') || error.message?.includes('RLS')) {
        throw new Error(`Permission denied: Unable to access applications table. Check RLS policies and authentication. ${error.message}`);
      }
      throw new Error(`Failed to load app context: ${error.message}`);
    }

    if (!data) {
      // Fallback: try to get any app
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('applications')
        .select('id, app_code, app_name')
        .limit(1)
        .maybeSingle();

      if (fallbackError) {
        console.error('Error fetching fallback app context:', fallbackError);
        throw new Error(`No application found and fallback query failed: ${fallbackError.message}`);
      }

      if (!fallbackData) {
        throw new Error(`No application found with app_code: ${appCode}. Please configure an application in the applications table.`);
      }

      return {
        app_uuid: fallbackData.id,
        site_code: fallbackData.app_code,
        domain_code: 'BDA',
        site_name: fallbackData.app_name || 'VC Studio',
        is_active_app: true,
      };
    }

    return {
      app_uuid: data.id,
      site_code: data.app_code,
      domain_code: 'BDA',
      site_name: data.app_name || 'VC Studio',
      is_active_app: true,
    };
  } catch (error: any) {
    // Re-throw if it's already a formatted error
    if (error.message && error.message.startsWith('Failed to load') || error.message.startsWith('No application')) {
      throw error;
    }
    // Otherwise wrap it
    console.error('Unexpected error in getAppContext:', error);
    throw new Error(`Failed to get app context: ${error.message || 'Unknown error'}`);
  }
}
