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
  const supabase = await createServerClient(accessToken);

  // Get site_code from environment variable
  const siteCode = process.env.NEXT_PUBLIC_SITE_CODE || 'VC_STUDIO';

  // Query site_settings for the active app
  const { data, error } = await supabase
    .from('site_settings')
    .select('app_uuid, site_code, domain_code, site_name, is_active_app, is_active')
    .or(`site_code.eq.${siteCode},is_active_app.eq.true`)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error fetching app context:', error);
    throw new Error(`Failed to load app context: ${error.message}`);
  }

  if (!data) {
    // Fallback: try to get any active app
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('site_settings')
      .select('app_uuid, site_code, domain_code, site_name, is_active_app, is_active')
      .eq('is_active_app', true)
      .limit(1)
      .maybeSingle();

    if (fallbackError || !fallbackData) {
      throw new Error('No active application found in site_settings. Please configure an active app.');
    }

    return {
      app_uuid: fallbackData.app_uuid || '',
      site_code: fallbackData.site_code || siteCode,
      domain_code: fallbackData.domain_code || 'BDA',
      site_name: fallbackData.site_name || 'VC Studio',
      is_active_app: fallbackData.is_active_app !== undefined ? fallbackData.is_active_app : (fallbackData.is_active || false),
    };
  }

  return {
    app_uuid: data.app_uuid || '',
    site_code: data.site_code || siteCode,
    domain_code: data.domain_code || 'BDA',
    site_name: data.site_name || 'VC Studio',
    is_active_app: data.is_active_app !== undefined ? data.is_active_app : (data.is_active || false),
  };
}
