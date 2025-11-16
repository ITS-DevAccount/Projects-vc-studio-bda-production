'use client'

import Link from 'next/link'
import { FileEdit, Palette } from 'lucide-react'

export default function PagesSection() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Pages</h2>
        <p className="text-gray-600 text-sm mt-1">Manage page content and settings</p>
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
    </div>
  )
}





