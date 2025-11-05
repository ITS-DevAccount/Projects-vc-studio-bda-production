/**
 * Helper functions for multi-app Supabase queries
 * These utilities ensure all database queries include app_uuid filtering
 */

import { supabase } from './client'

/**
 * Get the current app's UUID from site_settings
 * Uses NEXT_PUBLIC_SITE_CODE environment variable to determine which app
 */
export async function getCurrentAppUuid(): Promise<string | null> {
  const siteCode = process.env.NEXT_PUBLIC_SITE_CODE || 'VC_STUDIO'

  const { data, error } = await supabase
    .from('site_settings')
    .select('app_uuid')
    .eq('site_code', siteCode)
    .eq('is_active_app', true)
    .single()

  if (error) {
    console.error('Error fetching app_uuid:', error)
    return null
  }

  return data?.app_uuid || null
}

/**
 * Get complete app context (uuid, codes, name)
 */
export async function getAppContext() {
  const siteCode = process.env.NEXT_PUBLIC_SITE_CODE || 'VC_STUDIO'

  const { data, error } = await supabase
    .from('site_settings')
    .select('app_uuid, site_code, domain_code, site_name, is_active_app')
    .eq('site_code', siteCode)
    .eq('is_active_app', true)
    .single()

  if (error) {
    console.error('Error fetching app context:', error)
    return null
  }

  return data
}

/**
 * Type-safe query builder that includes app_uuid filtering
 * Usage:
 *   const posts = await queryWithApp('blog_posts', appUuid)
 *     .select('*')
 *     .eq('status', 'published')
 */
export function queryWithApp(tableName: string, appUuid: string) {
  return supabase
    .from(tableName)
    .select('*')
    .eq('app_uuid', appUuid)
}

/**
 * Insert data with app_uuid automatically included
 * Usage:
 *   await insertWithApp('blog_posts', appUuid, { title, content })
 */
export async function insertWithApp(
  tableName: string,
  appUuid: string,
  data: Record<string, any>
) {
  return supabase
    .from(tableName)
    .insert({
      ...data,
      app_uuid: appUuid,
    })
}

/**
 * Update data with app_uuid in WHERE clause (security)
 * Usage:
 *   await updateWithApp('blog_posts', appUuid, recordId, { title: 'New Title' })
 */
export async function updateWithApp(
  tableName: string,
  appUuid: string,
  recordId: string,
  updates: Record<string, any>
) {
  return supabase
    .from(tableName)
    .update(updates)
    .eq('id', recordId)
    .eq('app_uuid', appUuid) // CRITICAL: Prevents cross-app updates
}

/**
 * Delete data with app_uuid in WHERE clause (security)
 * Usage:
 *   await deleteWithApp('blog_posts', appUuid, recordId)
 */
export async function deleteWithApp(
  tableName: string,
  appUuid: string,
  recordId: string
) {
  return supabase
    .from(tableName)
    .delete()
    .eq('id', recordId)
    .eq('app_uuid', appUuid) // CRITICAL: Prevents cross-app deletes
}
