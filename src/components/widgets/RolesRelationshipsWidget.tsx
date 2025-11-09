'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

interface Role {
  id: string
  role_name: string
  description?: string
}

interface Relationship {
  id: string
  related_stakeholder_name: string
  relationship_type: string
  strength?: number
}

interface RolesRelationshipsData {
  roles: Role[]
  relationships: Relationship[]
}

interface RolesRelationshipsWidgetProps {
  stakeholder: {
    id: string
  }
}

export function RolesRelationshipsWidget({ stakeholder }: RolesRelationshipsWidgetProps) {
  const [data, setData] = useState<RolesRelationshipsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)

        // Get the session token for authorization
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          throw new Error('Not authenticated')
        }

        const response = await fetch(`/api/stakeholder/roles-relationships?stakeholder_id=${stakeholder.id}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        })

        if (!response.ok) {
          throw new Error('Failed to fetch roles and relationships')
        }

        const result = await response.json()
        setData(result)
      } catch (err) {
        console.error('Error fetching roles and relationships:', err)
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [stakeholder.id])

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <h3 className="text-lg font-semibold mb-4 text-gray-900">Roles & Relationships</h3>
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <h3 className="text-lg font-semibold mb-4 text-gray-900">Roles & Relationships</h3>
        <p className="text-red-500">Error: {error}</p>
      </div>
    )
  }

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
      <h3 className="text-lg font-semibold mb-4 text-gray-900">Roles & Relationships</h3>

      <div className="space-y-6">
        {/* Roles Section */}
        <div>
          <h4 className="font-semibold text-gray-700 mb-2">Roles</h4>
          {data?.roles && data.roles.length > 0 ? (
            <ul className="space-y-2">
              {data.roles.map((role) => (
                <li key={role.id} className="flex items-start">
                  <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3"></span>
                  <div>
                    <p className="font-medium text-gray-900">{role.role_name}</p>
                    {role.description && (
                      <p className="text-sm text-gray-500">{role.description}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 text-sm">No roles assigned</p>
          )}
        </div>

        {/* Relationships Section */}
        <div>
          <h4 className="font-semibold text-gray-700 mb-2">Relationships</h4>
          {data?.relationships && data.relationships.length > 0 ? (
            <ul className="space-y-2">
              {data.relationships.map((rel) => (
                <li key={rel.id} className="flex items-start">
                  <span className="inline-block w-2 h-2 bg-green-500 rounded-full mt-2 mr-3"></span>
                  <div>
                    <p className="font-medium text-gray-900">{rel.related_stakeholder_name}</p>
                    <p className="text-sm text-gray-500">
                      {rel.relationship_type}
                      {rel.strength && ` • Strength: ${rel.strength}/10`}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 text-sm">No relationships yet</p>
          )}
        </div>
      </div>
    </div>
  )
}
