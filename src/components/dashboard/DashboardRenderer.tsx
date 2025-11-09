'use client'

import { ProfileCard } from '@/components/widgets/ProfileCard'
import { RolesRelationshipsWidget } from '@/components/widgets/RolesRelationshipsWidget'
import { WorkflowTasksWidget } from '@/components/widgets/WorkflowTasksWidget'

interface Widget {
  widget_id: string
  title: string
  component: string
  data_source: string
  layout: {
    lg?: string
    md?: string
    sm?: string
  }
}

interface RoleConfiguration {
  dashboard_name: string
  menu_items: string[]
  widgets: Widget[]
}

interface CoreConfig {
  __meta?: {
    version: string
    created_at: string
    stakeholder_id: string
    roles: string[]
  }
  function_registry?: any[]
  role_configurations?: {
    [key: string]: RoleConfiguration
  }
}

interface Stakeholder {
  id: string
  name: string
  email?: string
  stakeholder_type?: string
  phone?: string
  country?: string
  city?: string
  core_config?: CoreConfig
}

interface DashboardRendererProps {
  stakeholder: Stakeholder
}

// Map component names to actual components
const WIDGET_COMPONENTS: Record<string, React.ComponentType<any>> = {
  ProfileCard,
  RolesRelationshipsWidget,
  WorkflowTasksWidget,
}

// Helper to convert Tailwind class to grid columns
const getGridColSpan = (layoutClass: string = ''): string => {
  // Extract the fraction from classes like 'w-1/3', 'w-2/3', 'w-full'
  if (layoutClass.includes('w-full')) return 'col-span-12'
  if (layoutClass.includes('w-1/3')) return 'col-span-12 lg:col-span-4'
  if (layoutClass.includes('w-2/3')) return 'col-span-12 lg:col-span-8'
  if (layoutClass.includes('w-1/2')) return 'col-span-12 lg:col-span-6'
  return 'col-span-12' // Default to full width
}

export function DashboardRenderer({ stakeholder }: DashboardRendererProps) {
  const coreConfig = stakeholder.core_config

  // If no core_config, show a basic message
  if (!coreConfig || !coreConfig.role_configurations) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Dashboard</h1>
        <p className="text-gray-600">
          Your workspace is being set up. Please contact an administrator if this message persists.
        </p>
      </div>
    )
  }

  // Get the first role configuration (simplified - could be enhanced to select based on primary role)
  const roleConfigKey = Object.keys(coreConfig.role_configurations)[0]
  const roleConfig = coreConfig.role_configurations[roleConfigKey]

  if (!roleConfig) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Dashboard</h1>
        <p className="text-gray-600">No configuration available.</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {roleConfig.dashboard_name || 'Workspace Dashboard'}
      </h1>

      {/* Widgets Grid */}
      <div className="grid grid-cols-12 gap-6">
        {roleConfig.widgets.map((widget) => {
          const WidgetComponent = WIDGET_COMPONENTS[widget.component]

          if (!WidgetComponent) {
            console.warn(`Widget component "${widget.component}" not found`)
            return null
          }

          const gridClass = getGridColSpan(widget.layout.lg)

          return (
            <div key={widget.widget_id} className={gridClass}>
              <WidgetComponent stakeholder={stakeholder} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
