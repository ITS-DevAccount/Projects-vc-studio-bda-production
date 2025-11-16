'use client'

import { useAuth } from '@/lib/hooks/useAuth'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FileEdit, Palette } from 'lucide-react'
import AdminHeader from '@/components/admin/AdminHeader'
import AdminMenu from '@/components/admin/AdminMenu'
import { useEffect } from 'react'

export default function PagesPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/auth/login')
    }
  }, [user, authLoading, router])

  if (authLoading || !user) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      <AdminMenu />

      <main className="max-w-7xl mx-auto px-4 py-12">
        <div className="mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Pages</h1>
            <p className="text-gray-600">Manage page content and settings</p>
          </div>
        </div>

        <div className="grid gap-4 max-w-2xl">
          <Link
            href="/dashboard/settings/branding"
            className="bg-white rounded-lg p-6 border border-gray-200 hover:border-blue-300 transition group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-blue-100 p-3 rounded-lg group-hover:bg-blue-200 transition">
                  <Palette className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-1">Branding & Theme Settings</h3>
                  <p className="text-sm text-gray-600">
                    Configure site colors, logo, and global branding
                  </p>
                </div>
              </div>
            </div>
          </Link>

          <Link
            href="/dashboard/pages/editor"
            className="bg-white rounded-lg p-6 border border-gray-200 hover:border-blue-300 transition group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-green-100 p-3 rounded-lg group-hover:bg-green-200 transition">
                  <FileEdit className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-1">Page Editor</h3>
                  <p className="text-sm text-gray-600">
                    Edit homepage content, images, and sections
                  </p>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </main>
    </div>
  )
}

