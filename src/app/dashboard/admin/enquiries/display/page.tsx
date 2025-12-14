'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { Mail, Trash2, RefreshCw, Loader } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import AdminHeader from '@/components/admin/AdminHeader'
import AdminMenu from '@/components/admin/AdminMenu'
import { useApp } from '@/contexts/AppContext'

interface Enquiry {
  id: string
  name: string
  email: string
  subject: string
  message: string
  status: string
  created_at: string
}

export default function EnquiriesDisplayPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const { app_uuid: appUuid } = useApp()
  const [loading, setLoading] = useState(true)
  const [enquiries, setEnquiries] = useState<Enquiry[]>([])

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/auth/login')
      return
    }
    if (user && appUuid) {
      loadEnquiries()
    }
  }, [user, authLoading, appUuid])

  const loadEnquiries = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('enquiries')
        .select('*')
        .eq('app_uuid', appUuid)
        .order('created_at', { ascending: false })

      if (error) throw error
      setEnquiries(data || [])
    } catch (err) {
      console.error('Error fetching enquiries:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this enquiry?')) return

    try {
      const { error } = await supabase
        .from('enquiries')
        .delete()
        .eq('id', id)

      if (error) throw error
      loadEnquiries()
    } catch (err) {
      console.error('Error deleting enquiry:', err)
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
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Enquiries Display</h1>
              <p className="text-gray-600">View and manage contact form submissions</p>
            </div>
            <button
              onClick={loadEnquiries}
              disabled={loading}
              className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg transition"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">
            <Loader className="w-8 h-8 animate-spin mx-auto mb-4" />
            Loading enquiries...
          </div>
        ) : enquiries.length > 0 ? (
          <div className="grid gap-4">
            {enquiries.map((enquiry) => (
              <div key={enquiry.id} className="bg-white rounded-lg p-6 border border-gray-200 hover:border-blue-300 transition">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-2">{enquiry.subject}</h3>
                    <div className="space-y-2 text-sm text-gray-600 mb-3">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        {enquiry.email}
                      </div>
                      <div>From: {enquiry.name}</div>
                      <div className="text-xs text-gray-500">{new Date(enquiry.created_at).toLocaleString()}</div>
                    </div>
                    <p className="text-sm text-gray-700 mb-3">{enquiry.message}</p>
                    <div className="inline-block px-3 py-1 bg-gray-100 rounded text-xs">
                      {enquiry.status}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(enquiry.id)}
                    className="bg-red-50 hover:bg-red-100 p-2 rounded-lg transition text-red-600"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <p className="text-gray-600">No enquiries yet</p>
          </div>
        )}
      </main>
    </div>
  )
}













