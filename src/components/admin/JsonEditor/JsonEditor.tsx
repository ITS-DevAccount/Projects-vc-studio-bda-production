'use client'

import { useState, useEffect } from 'react'
import { Save, AlertCircle, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import AdminHeader from '../AdminHeader'
import AdminMenu from '../AdminMenu'
import StakeholderSearch from '../JsonTools/StakeholderSearch'
import { useJsonSearchContext } from '@/lib/hooks/useJsonSearchContext'

interface JsonData {
  id: string
  reference: string
  source: 'stakeholder'
  currentConfig: any
}

export default function JsonEditor() {
  const { selectedReference, selectedSource, setSelectedReference, setSelectedSource } = useJsonSearchContext()
  const [jsonData, setJsonData] = useState<JsonData | null>(null)
  const [editedJson, setEditedJson] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Auto-load when reference changes
  useEffect(() => {
    if (selectedReference.trim() && !jsonData) {
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
    setSuccess(null)

    try {
      if (selectedSource === 'stakeholder') {
        const { data, error: fetchError } = await supabase
          .from('stakeholders')
          .select('id, reference, core_config')
          .eq('reference', selectedReference.toUpperCase())
          .single()

        if (fetchError) throw new Error('Stakeholder not found')

        setJsonData({
          id: data.id,
          reference: data.reference,
          source: 'stakeholder',
          currentConfig: data.core_config
        })
        setEditedJson(JSON.stringify(data.core_config, null, 2))
      }
    } catch (err: any) {
      setError(err.message)
      setJsonData(null)
    } finally {
      setLoading(false)
    }
  }

  const validateJson = (jsonString: string): boolean => {
    try {
      JSON.parse(jsonString)
      return true
    } catch {
      return false
    }
  }

  const handleSave = async () => {
    if (!jsonData) return

    if (!validateJson(editedJson)) {
      setError('Invalid JSON syntax. Please check your configuration.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const updatedConfig = JSON.parse(editedJson)

      if (jsonData.source === 'stakeholder') {
        const { error: updateError } = await supabase
          .from('stakeholders')
          .update({
            core_config: updatedConfig,
            updated_at: new Date().toISOString()
          })
          .eq('id', jsonData.id)

        if (updateError) throw updateError
      }

      setSuccess('Configuration saved successfully!')
      setJsonData(prev => (prev ? { ...prev, currentConfig: updatedConfig } : null))

      setTimeout(() => setSuccess(null), 5000)
    } catch (err: any) {
      setError(err.message || 'Failed to save configuration')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    if (jsonData) {
      setEditedJson(JSON.stringify(jsonData.currentConfig, null, 2))
      setError(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      <AdminMenu />

      <main className="max-w-7xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">JSON Configuration Editor</h1>
          <p className="text-gray-600">Edit and update configuration data</p>
          <div className="mt-4">
            <Link
              href="/dashboard/admin/json-viewer"
              className="text-sm text-blue-600 hover:text-blue-700 underline"
            >
              Switch to JSON Viewer →
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
                disabled={jsonData !== null}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="stakeholder">Stakeholder Config</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <StakeholderSearch
                value={selectedReference}
                onChange={setSelectedReference}
                disabled={jsonData !== null}
              />
            </div>
          </div>

          <button
            onClick={handleSearch}
            disabled={loading || jsonData !== null || !selectedReference}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium px-4 py-2 rounded-lg transition-colors"
          >
            {loading ? 'Loading...' : jsonData ? 'Editing...' : 'Load Configuration'}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-4 mb-4 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <p className="text-sm">{success}</p>
          </div>
        )}

        {jsonData && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-white p-4 rounded-lg border border-gray-200">
              <div>
                <p className="text-sm text-gray-600">Editing</p>
                <p className="text-lg font-mono font-semibold text-blue-600">{jsonData.reference}</p>
              </div>
              <button
                onClick={handleReset}
                className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
              >
                Reset
              </button>
            </div>

            <textarea
              value={editedJson}
              onChange={(e) => setEditedJson(e.target.value)}
              className={`w-full h-96 bg-white border rounded-lg p-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                validateJson(editedJson) ? 'border-gray-300' : 'border-red-300'
              }`}
              spellCheck="false"
            />

            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={loading || !validateJson(editedJson)}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                {loading ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>

            {!validateJson(editedJson) && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
                Invalid JSON syntax detected. Please correct before saving.
              </div>
            )}
          </div>
        )}

        {!jsonData && !error && (
          <div className="text-center py-12 text-gray-400">
            <p>Load a configuration to edit</p>
          </div>
        )}
      </main>
    </div>
  )
}

