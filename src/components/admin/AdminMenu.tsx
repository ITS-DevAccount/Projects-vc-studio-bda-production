'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface MenuItem {
  id: string
  label: string
  href: string
}

const menuItems: MenuItem[] = [
  { id: 'content', label: 'Content', href: '/dashboard/admin/content' },
  { id: 'enquiries', label: 'Enquiries', href: '/dashboard/admin/enquiries' },
  { id: 'community', label: 'Community', href: '/dashboard/admin' },
  { id: 'workflows', label: 'Workflows', href: '/dashboard/admin/workflows' },
  { id: 'monitoring', label: 'Monitoring', href: '/dashboard/admin/monitoring' },
  { id: 'ai-prompts', label: 'AI Prompts', href: '/dashboard/admin/prompts' },
  { id: 'json-tools', label: 'JSON Tools', href: '/dashboard/admin/json-tools' },
]

export default function AdminMenu() {
  const pathname = usePathname()

  const isActive = (href: string) => {
    // Community section - matches /dashboard/admin and community sub-routes
    if (href === '/dashboard/admin' && (
      pathname === '/dashboard/admin' ||
      pathname.startsWith('/dashboard/admin/stakeholders') ||
      pathname.startsWith('/dashboard/admin/roles') ||
      pathname.startsWith('/dashboard/admin/relationship-types') ||
      pathname.startsWith('/dashboard/admin/stakeholder-types')
    )) return true
    
    // Content section - matches content, pages, and blog-posts routes
    if (href === '/dashboard/admin/content' && (
      pathname.startsWith('/dashboard/admin/content') ||
      pathname.startsWith('/dashboard/admin/pages') ||
      pathname.startsWith('/dashboard/admin/blog-posts')
    )) return true
    
    // Enquiries section
    if (href === '/dashboard/admin/enquiries' && pathname.startsWith('/dashboard/admin/enquiries')) return true
    
    // Workflows section - matches workflows and all workflow-related routes
    if (href === '/dashboard/admin/workflows' && (
      pathname.startsWith('/dashboard/admin/workflows') ||
      pathname.startsWith('/dashboard/admin/workflow') ||
      pathname.startsWith('/dashboard/admin/function-registry') ||
      pathname.startsWith('/dashboard/admin/registry') ||
      pathname.startsWith('/dashboard/admin/services') ||
      pathname.startsWith('/dashboard/admin/service-logs')
    )) return true
    
    // Monitoring section
    if (href === '/dashboard/admin/monitoring' && pathname.startsWith('/dashboard/admin/monitoring')) return true
    
    // AI Prompts section
    if (href === '/dashboard/admin/prompts' && pathname.startsWith('/dashboard/admin/prompts')) return true
    
    // JSON Tools section - matches json-tools, json-editor, and json-viewer routes
    if (href === '/dashboard/admin/json-tools' && (
      pathname.startsWith('/dashboard/admin/json-tools') ||
      pathname.startsWith('/dashboard/admin/json-editor') ||
      pathname.startsWith('/dashboard/admin/json-viewer')
    )) return true
    
    return false
  }

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex gap-8">
          {menuItems.map(item => (
            <Link
              key={item.id}
              href={item.href}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                isActive(item.href)
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  )
}

