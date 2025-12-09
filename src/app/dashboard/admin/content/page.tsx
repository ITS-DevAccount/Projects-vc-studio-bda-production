'use client'

import Link from 'next/link'
import { useAuth } from '@/lib/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { FileText, FileEdit } from 'lucide-react'
import AdminHeader from '@/components/admin/AdminHeader'
import AdminMenu from '@/components/admin/AdminMenu'

export default function ContentPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/auth/login')
    }
  }, [user, authLoading, router])

  if (authLoading || !user) return null

  const sections = [
    {
      id: 'pages',
      label: 'Pages',
      description: 'Edit homepage content, images, and sections',
      icon: FileEdit,
      href: '/dashboard/admin/pages'
    },
    {
      id: 'blog-posts',
      label: 'Blog Posts',
      description: 'Create and manage blog posts and articles',
      icon: FileText,
      href: '/dashboard/admin/blog-posts'
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      <AdminMenu />

      <main className="max-w-7xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Content</h1>
          <p className="text-gray-600">Manage editorial content and pages</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sections.map(section => {
            const Icon = section.icon;
            return (
              <Link
                key={section.id}
                href={section.href}
                className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg hover:border-blue-300 transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <Icon className="w-8 h-8 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{section.label}</h3>
                    <p className="text-sm text-gray-600">{section.description}</p>
                  </div>
                  <div className="text-gray-400 group-hover:text-blue-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  )
}






