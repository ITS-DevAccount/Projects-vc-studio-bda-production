/**
 * Helper functions for multi-app Supabase queries
 * These utilities ensure all database queries include app_uuid filtering
 */

import { supabase } from './client'

/**
 * Get the current app's UUID from applications table
 * Uses NEXT_PUBLIC_APP_CODE environment variable to determine which app
 * Query: SELECT id as app_uuid FROM applications WHERE app_code = $1 LIMIT 1
 */
export async function getCurrentAppUuid(): Promise<string | null> {
  const appCode = process.env.NEXT_PUBLIC_APP_CODE || 'VC_STUDIO'

  const { data, error } = await supabase
    .from('applications')
    .select('id')
    .eq('app_code', appCode)
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('Error fetching app_uuid:', error)
    return null
  }

  return data?.id || null
}

/**
 * Get complete app context (uuid, codes, name) from applications table
 */
export async function getAppContext() {
  const appCode = process.env.NEXT_PUBLIC_APP_CODE || 'VC_STUDIO'

  const { data, error } = await supabase
    .from('applications')
    .select('id, app_code, app_name')
    .eq('app_code', appCode)
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('Error fetching app context:', error)
    return null
  }

  if (!data) {
    return null
  }

  // Return in format compatible with existing code
  return {
    app_uuid: data.id,
    site_code: data.app_code,
    app_code: data.app_code,
    site_name: data.app_name,
    app_name: data.app_name,
  }
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
