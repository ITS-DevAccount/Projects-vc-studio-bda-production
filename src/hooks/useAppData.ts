/**
 * App-aware data hooks for multi-tenant queries
 * All hooks automatically filter by app_uuid from AppContext
 */

'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAppUuid } from '@/contexts/AppContext'

/**
 * Re-export useAppUuid for convenience
 */
export { useAppUuid } from '@/contexts/AppContext'

/**
 * Hook to fetch page settings for a specific page slug
 * Query: SELECT * FROM page_settings WHERE app_uuid = ? AND slug = ?
 */
export function usePageSettings(pageSlug: string) {
  const app_uuid = useAppUuid()
  const [settings, setSettings] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!app_uuid || !pageSlug) {
      setLoading(false)
      return
    }

    async function fetchPageSettings() {
      try {
        setLoading(true)
        setError(null)

        const { data, error: fetchError } = await supabase
          .from('page_settings')
          .select('*')
          .eq('app_uuid', app_uuid)
          .eq('slug', pageSlug)
          .maybeSingle()

        if (fetchError) {
          throw fetchError
        }

        setSettings(data)
      } catch (err: any) {
        console.error('Error fetching page settings:', err)
        setError(err.message || 'Failed to load page settings')
      } finally {
        setLoading(false)
      }
    }

    fetchPageSettings()
  }, [app_uuid, pageSlug])

  return { settings, loading, error }
}

/**
 * Hook to fetch active site settings
 * Query: SELECT * FROM site_settings WHERE app_uuid = ? AND is_active = true ORDER BY updated_at DESC LIMIT 1
 */
export function useSiteSettings() {
  const app_uuid = useAppUuid()
  const [settings, setSettings] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!app_uuid) {
      setLoading(false)
      return
    }

    async function fetchSiteSettings() {
      try {
        setLoading(true)
        setError(null)

        const { data, error: fetchError } = await supabase
          .from('site_settings')
          .select('*')
          .eq('app_uuid', app_uuid)
          .eq('is_active', true)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (fetchError) {
          throw fetchError
        }

        setSettings(data)
      } catch (err: any) {
        console.error('Error fetching site settings:', err)
        setError(err.message || 'Failed to load site settings')
      } finally {
        setLoading(false)
      }
    }

    fetchSiteSettings()
  }, [app_uuid])

  return { settings, loading, error }
}

/**
 * Hook to fetch published blog posts
 * Query: SELECT * FROM blog_posts WHERE app_uuid = ? AND status = 'published'
 */
export function useBlogPosts() {
  const app_uuid = useAppUuid()
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!app_uuid) {
      setLoading(false)
      return
    }

    async function fetchBlogPosts() {
      try {
        setLoading(true)
        setError(null)

        const { data, error: fetchError } = await supabase
          .from('blog_posts')
          .select('*')
          .eq('app_uuid', app_uuid)
          .eq('status', 'published')
          .order('created_at', { ascending: false })

        if (fetchError) {
          throw fetchError
        }

        setPosts(data || [])
      } catch (err: any) {
        console.error('Error fetching blog posts:', err)
        setError(err.message || 'Failed to load blog posts')
      } finally {
        setLoading(false)
      }
    }

    fetchBlogPosts()
  }, [app_uuid])

  return { posts, loading, error }
}




