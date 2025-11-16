'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface MenuItem {
  id: string
  label: string
  href: string
}

const menuItems: MenuItem[] = [
  { id: 'community', label: 'Community', href: '/dashboard/admin' },
  { id: 'content', label: 'Content', href: '/dashboard/admin/content' },
  { id: 'enquiries', label: 'Enquiries', href: '/dashboard/admin/enquiries' },
  { id: 'json-tools', label: 'JSON Tools', href: '/dashboard/admin/json-viewer' },
]

export default function AdminMenu() {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/dashboard/admin' && pathname === '/dashboard/admin') return true
    if (href === '/dashboard/admin/content' && (pathname.startsWith('/dashboard/admin/content') || pathname.startsWith('/dashboard/admin/blog-posts') || pathname.startsWith('/dashboard/admin/pages'))) return true
    if (href === '/dashboard/admin/json-viewer' && (pathname.startsWith('/dashboard/admin/json-viewer') || pathname.startsWith('/dashboard/admin/json-editor'))) return true
    if (href !== '/dashboard/admin' && pathname.startsWith(href)) return true
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

