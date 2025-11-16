'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import AdminHeader from '@/components/admin/AdminHeader'
import AdminMenu from '@/components/admin/AdminMenu'
import BlogPostsSection from '@/components/admin/content/BlogPostsSection'
import PagesSection from '@/components/admin/content/PagesSection'

type ContentTab = 'blog-posts' | 'pages'

export default function ContentPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<ContentTab>('blog-posts')

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/auth/login')
    }
  }, [user, authLoading, router])

  if (authLoading || !user) return null

  const tabs = [
    { id: 'blog-posts', label: 'Blog Posts' },
    { id: 'pages', label: 'Pages' }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      <AdminMenu />

      <main className="max-w-7xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Content Management</h1>
          <p className="text-gray-600">Manage editorial content and pages</p>
        </div>

        {/* Content tabs */}
        <div className="border-b border-gray-200 mb-8">
          <div className="flex gap-8">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ContentTab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content sections */}
        {activeTab === 'blog-posts' && <BlogPostsSection />}
        {activeTab === 'pages' && <PagesSection />}
      </main>
    </div>
  )
}





