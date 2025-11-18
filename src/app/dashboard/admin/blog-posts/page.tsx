'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Edit2, Trash2, RefreshCw, Loader } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import AdminHeader from '@/components/admin/AdminHeader'
import AdminMenu from '@/components/admin/AdminMenu'
import { useApp } from '@/contexts/AppContext'

interface BlogPost {
  id: string
  title: string
  excerpt: string
  status: string
  published_at: string
  is_featured: boolean
  created_at: string
}

export default function BlogPostsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const { app_uuid: appUuid } = useApp()
  const [loading, setLoading] = useState(true)
  const [blogs, setBlogs] = useState<BlogPost[]>([])

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/auth/login')
      return
    }
    if (user && appUuid) {
      loadBlogs()
    }
  }, [user, authLoading, appUuid])

  const loadBlogs = async () => {
    setLoading(true)
    try {
      console.log('🔍 Loading blog posts for app_uuid:', appUuid)
      
      let blogsData = null
      let blogsError = null

      // Try with app_uuid filter if available
      if (appUuid) {
        const result = await supabase
          .from('blog_posts')
          .select('*')
          .eq('app_uuid', appUuid)
          .order('created_at', { ascending: false })
        
        blogsData = result.data
        blogsError = result.error
      } else {
        // No appUuid, try without filter
        const result = await supabase
          .from('blog_posts')
          .select('*')
          .order('created_at', { ascending: false })
        
        blogsData = result.data
        blogsError = result.error
      }

      // If error is about app_uuid column, try without that filter
      if (blogsError) {
        const errorCode = (blogsError as any)?.code || 'unknown'
        const errorMessage = (blogsError as any)?.message || String(blogsError)
        
        console.warn('⚠️ Error fetching blogs with app_uuid filter:', { errorCode, errorMessage })
        
        if (errorCode === '42703' || errorMessage?.includes('app_uuid')) {
          console.warn('⚠️ app_uuid column not found, fetching all blog posts (migration may not have run)')
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('blog_posts')
            .select('*')
            .order('created_at', { ascending: false })

          if (fallbackError) {
            console.error('❌ Error fetching blogs (fallback):', fallbackError)
            setBlogs([])
            return
          }
          console.log(`✅ Loaded ${fallbackData?.length || 0} blog posts (fallback)`)
          setBlogs(fallbackData || [])
          return
        }
        
        // Other errors
        console.error('❌ Error fetching blogs:', blogsError)
        setBlogs([])
        return
      }

      console.log(`✅ Loaded ${blogsData?.length || 0} blog posts`)
      setBlogs(blogsData || [])
    } catch (err) {
      console.error('❌ Error fetching blogs:', err)
      setBlogs([])
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this blog post?')) return

    try {
      const { error } = await supabase
        .from('blog_posts')
        .delete()
        .eq('id', id)

      if (error) throw error
      loadBlogs()
    } catch (err) {
      console.error('Error deleting blog:', err)
    }
  }

  if (authLoading || !user) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      <AdminMenu />

      <main className="max-w-7xl mx-auto px-4 py-12">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Blog Posts</h1>
              <p className="text-gray-600">Manage editorial content and blog articles</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={loadBlogs}
                disabled={loading}
                className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg transition"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <Link
                href="/dashboard/blog/new"
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
              >
                <Plus className="w-5 h-5" />
                New Post
              </Link>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">
            <Loader className="w-8 h-8 animate-spin mx-auto mb-4" />
            Loading blog posts...
          </div>
        ) : blogs.length > 0 ? (
          <div className="grid gap-4">
            {blogs.map((blog) => (
              <div key={blog.id} className="bg-white rounded-lg p-6 border border-gray-200 hover:border-blue-300 transition">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-2">{blog.title}</h3>
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">{blog.excerpt}</p>
                    <div className="flex gap-4 text-xs text-gray-500">
                      <span>Status: {blog.status}</span>
                      <span>Featured: {blog.is_featured ? 'Yes' : 'No'}</span>
                      <span>{new Date(blog.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/dashboard/blog/${blog.id}`}
                      className="bg-gray-100 hover:bg-gray-200 p-2 rounded-lg transition"
                    >
                      <Edit2 className="w-5 h-5" />
                    </Link>
                    <button
                      onClick={() => handleDelete(blog.id)}
                      className="bg-red-50 hover:bg-red-100 p-2 rounded-lg transition text-red-600"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <p className="text-gray-600 mb-4">No blog posts yet</p>
            <Link
              href="/dashboard/blog/new"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
            >
              <Plus className="w-5 h-5" />
              Create First Post
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}

