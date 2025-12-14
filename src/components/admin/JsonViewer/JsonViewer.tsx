'use client'

import { useState, useEffect } from 'react'
import JsonView from '@uiw/react-json-view'
import { Copy, Download } from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import AdminHeader from '../AdminHeader'
import AdminMenu from '../AdminMenu'
import StakeholderSearch from '../JsonTools/StakeholderSearch'
import { useJsonSearchContext } from '@/lib/hooks/useJsonSearchContext'

interface JsonData {
  source: 'stakeholder'
  reference: string
  data: any
  lastModified: string
}

export default function JsonViewer() {
  const { selectedReference, selectedSource, setSelectedReference, setSelectedSource } = useJsonSearchContext()
  const [jsonData, setJsonData] = useState<JsonData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Auto-load when reference changes
  useEffect(() => {
    if (selectedReference.trim()) {
      handleSearch()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedReference])

  const handleSearch = async () => {
    if (!selectedReference.trim()) {
      setError('Please enter a reference')
      return
    }

    setLoading(true)
    setError(null)

    try {
      if (selectedSource === 'stakeholder') {
        const { data, error: fetchError } = await supabase
          .from('stakeholders')
          .select('id, reference, core_config, updated_at')
          .eq('reference', selectedReference.toUpperCase())
          .single()

        if (fetchError) throw new Error('Stakeholder not found')

        setJsonData({
          source: 'stakeholder',
          reference: data.reference,
          data: data.core_config,
          lastModified: data.updated_at
        })
      }
    } catch (err: any) {
      setError(err.message)
      setJsonData(null)
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    if (jsonData?.data) {
      navigator.clipboard.writeText(JSON.stringify(jsonData.data, null, 2))
      // Add toast notification if available
    }
  }

  const handleDownload = () => {
    if (jsonData?.data) {
      const element = document.createElement('a')
      element.setAttribute(
        'href',
        'data:text/plain;charset=utf-8,' + encodeURIComponent(JSON.stringify(jsonData.data, null, 2))
      )
      element.setAttribute('download', `${jsonData.reference}-config.json`)
      element.style.display = 'none'
      document.body.appendChild(element)
      element.click()
      // Safely remove the element if it still exists
      // Use setTimeout to ensure click completes before removal
      setTimeout(() => {
        try {
          if (element && element.parentNode === document.body) {
            document.body.removeChild(element)
          }
        } catch (err) {
          console.warn('Error removing download element:', err);
        }
      }, 100);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      <AdminMenu />

      <main className="max-w-7xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">JSON Configuration Viewer</h1>
          <p className="text-gray-600">Inspect and download configuration data</p>
          <div className="mt-4">
            <Link
              href="/dashboard/admin/json-editor"
              className="text-sm text-blue-600 hover:text-blue-700 underline"
            >
              Switch to JSON Editor →
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Data Source</label>
              <select
                value={selectedSource}
                onChange={(e) => setSelectedSource(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="stakeholder">Stakeholder Config</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <StakeholderSearch
                value={selectedReference}
                onChange={setSelectedReference}
              />
            </div>
          </div>

          <button
            onClick={handleSearch}
            disabled={loading || !selectedReference}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium px-4 py-2 rounded-lg transition-colors"
          >
            {loading ? 'Loading...' : 'View Configuration'}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-6">
            <p className="text-sm">{error}</p>
          </div>
        )}

        {jsonData && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-sm text-gray-600">Reference</p>
                <p className="text-lg font-mono font-semibold text-blue-600">{jsonData.reference}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Last modified: {new Date(jsonData.lastModified).toLocaleString()}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCopy}
                  className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors"
                  title="Copy to clipboard"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={handleDownload}
                  className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors"
                  title="Download as JSON"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 overflow-x-auto max-h-[500px] overflow-y-auto border border-gray-200">
              <JsonView
                value={jsonData.data}
                style={{
                  backgroundColor: 'transparent',
                  fontSize: '13px',
                  fontFamily: 'Fira Code, monospace'
                }}
              />
            </div>
          </div>
        )}

        {!jsonData && !error && (
          <div className="text-center py-12 text-gray-400">
            <p>Select a stakeholder reference above to view configuration</p>
          </div>
        )}
      </main>
    </div>
  )
}

