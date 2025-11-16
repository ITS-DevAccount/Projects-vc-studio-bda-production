# Phase 1c Sprint: Admin Dashboard Restructuring & JSON Tools

**Document Purpose:** Seed document for Cursor implementation  
**Status:** Ready for execution  
**Date:** November 2025  
**Application:** vc-bda-production  
**Scope:** Single focused sprint combining dashboard menu restructuring and JSON tools implementation  
**Estimated Duration:** 1-2 days

---

## Executive Summary

This sprint consolidates two complementary improvements into one coherent change:

1. **Admin Dashboard Menu Restructuring** — Reorganize top-level menu from inconsistent layout to standardized tab-based navigation
2. **JSON Tools Implementation** — Add JSON Viewer and JSON Editor as new admin tools

**Outcome:** Consistent, professional admin interface with proper content organization and system debugging capabilities.

---

## Part 1: Dashboard Menu Restructuring

### 1.1 Current State Issues

**Current Menu (Inconsistent):**
- Screenshot 1: Horizontal tabs (Blog Posts | Enquiries | Pages | Stakeholders)
- Screenshot 2: Card-based dashboard with mixed navigation
- Screenshot 3-4: Inconsistent button/link styling

**Problems:**
- "Stakeholders" tab in main menu should not be at top level
- Blog Posts and Pages need semantic grouping as "Content"
- "Admin Dashboard" naming inconsistent with "VC Studio Admin"
- Back-to navigation uses button styling instead of link styling
- No dedicated section for system tools (JSON, config, etc.)

### 1.2 Target Menu Structure

```
┌─────────────────────────────────────────────────────────────┐
│ VC Studio Admin          [Admin Settings] [Logout]           │
├─────────────────────────────────────────────────────────────┤
│ Community | Content | Enquiries | JSON Tools                 │
├─────────────────────────────────────────────────────────────┤
│ [Main Content Area]                                           │
└─────────────────────────────────────────────────────────────┘
```

**Tab-Based Navigation:**

| Tab | Purpose | Sub-Items |
|-----|---------|-----------|
| **Community** | Stakeholder & relationship management | • Stakeholder Registry<br>• Roles<br>• Relationship Types<br>• Stakeholder Type Roles |
| **Content** | Editorial content management | • Blog Posts<br>• Pages |
| **Enquiries** | Contact form submissions | • Enquiry List<br>• View/respond |
| **JSON Tools** | System configuration & debugging | • JSON Viewer<br>• JSON Editor |

### 1.3 Navigation Patterns

**Pattern 1: Tab Navigation**
```typescript
// Main menu tabs — one per section
Community | Content | Enquiries | JSON Tools
```

**Pattern 2: Back Navigation (Link Style)**
```typescript
// Back links should be plain text links, not buttons
< Back to Community
```

**Pattern 3: Primary Actions**
```typescript
// Create/Action buttons stay top right
[Create Role] or [Create Post] etc.
```

---

## Part 2: JSON Tools Implementation

### 2.1 New Components Structure

```
src/
├── components/
│   └── admin/
│       ├── AdminMenu.tsx                 # Tab-based menu component
│       ├── JsonViewer/
│       │   ├── JsonViewer.tsx            # Viewer component
│       │   └── JsonViewerPage.tsx        # Page wrapper
│       └── JsonEditor/
│           ├── JsonEditor.tsx            # Editor component
│           └── JsonEditorPage.tsx        # Page wrapper
│
└── app/
    └── admin/
        ├── page.tsx                      # Community Dashboard
        ├── roles/
        │   └── page.tsx
        ├── stakeholders/
        │   └── page.tsx
        ├── relationship-types/
        │   └── page.tsx
        ├── stakeholder-type-roles/
        │   └── page.tsx
        ├── blog-posts/
        │   └── page.tsx
        ├── pages/
        │   └── page.tsx
        ├── enquiries/
        │   └── page.tsx
        ├── json-viewer/
        │   └── page.tsx                  # NEW
        └── json-editor/
            └── page.tsx                  # NEW
```

### 2.2 AdminMenu Component (NEW)

**File:** `src/components/admin/AdminMenu.tsx`

```typescript
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface MenuItem {
  id: string
  label: string
  href: string
  icon?: string
}

const menuItems: MenuItem[] = [
  { id: 'community', label: 'Community', href: '/admin' },
  { id: 'content', label: 'Content', href: '/admin/blog-posts' },
  { id: 'enquiries', label: 'Enquiries', href: '/admin/enquiries' },
  { id: 'json-tools', label: 'JSON Tools', href: '/admin/json-viewer' },
]

export default function AdminMenu() {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/admin' && pathname === '/admin') return true
    if (href !== '/admin' && pathname.startsWith(href.split('/').slice(0, -1).join('/'))) return true
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
```

### 2.3 Community Dashboard Page (Renamed)

**File:** `src/app/admin/page.tsx`

```typescript
import AdminMenu from '@/components/admin/AdminMenu'
import Link from 'next/link'
import { Users, Shield, Share2, UserCheck } from 'lucide-react'

export default function CommunityDashboard() {
  const sections = [
    {
      id: 'stakeholder-registry',
      label: 'Stakeholder Registry',
      description: 'Manage stakeholders, view profiles, assign roles, and create relationships',
      icon: Users,
      href: '/admin/stakeholders'
    },
    {
      id: 'roles',
      label: 'Roles',
      description: 'Define and manage role types that can be assigned to stakeholders',
      icon: Shield,
      href: '/admin/roles'
    },
    {
      id: 'relationship-types',
      label: 'Relationship Types',
      description: 'Define types of relationships between stakeholders (supplier, customer, etc.)',
      icon: Share2,
      href: '/admin/relationship-types'
    },
    {
      id: 'stakeholder-type-roles',
      label: 'Stakeholder Type Roles',
      description: 'Configure which roles are available for each stakeholder type',
      icon: UserCheck,
      href: '/admin/stakeholder-type-roles'
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminMenu />
      
      <main className="max-w-7xl mx-auto px-4 py-12">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Community Dashboard</h1>
          <p className="text-gray-600 mb-8">Manage system settings and community structure</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sections.map(section => {
            const Icon = section.icon
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
            )
          })}
        </div>
      </main>
    </div>
  )
}
```

### 2.4 JSON Viewer Component (NEW)

**File:** `src/components/admin/JsonViewer/JsonViewer.tsx`

```typescript
'use client'

import { useState } from 'react'
import ReactJsonView from 'react-json-view'
import { Search, Copy, Download, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import AdminMenu from '../AdminMenu'

interface JsonData {
  source: 'stakeholder' | 'workflow'
  reference: string
  data: any
  lastModified: string
}

export default function JsonViewer() {
  const [jsonData, setJsonData] = useState<JsonData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchRef, setSearchRef] = useState('')
  const [selectedSource, setSelectedSource] = useState<'stakeholder' | 'workflow'>('stakeholder')

  const handleSearch = async () => {
    if (!searchRef.trim()) {
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
          .eq('reference', searchRef.toUpperCase())
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
      document.body.removeChild(element)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminMenu />

      <main className="max-w-7xl mx-auto px-4 py-12">
        <div className="mb-8">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Community
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">JSON Configuration Viewer</h1>
          <p className="text-gray-600">Inspect and download configuration data</p>
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
                <option value="workflow">Workflow Definition</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Search Reference</label>
              <input
                type="text"
                value={searchRef}
                onChange={(e) => setSearchRef(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="e.g., STK-001, WF-FLIM-001"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <button
            onClick={handleSearch}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Search className="w-4 h-4" />
            {loading ? 'Searching...' : 'View Configuration'}
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
              <ReactJsonView
                src={jsonData.data}
                theme="rjv-default"
                collapsed={1}
                displayDataTypes={true}
                enableClipboard={false}
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
            <p>Enter a reference above to view JSON configuration</p>
          </div>
        )}
      </main>
    </div>
  )
}
```

**File:** `src/app/admin/json-viewer/page.tsx`

```typescript
import JsonViewer from '@/components/admin/JsonViewer/JsonViewer'

export default function JsonViewerPage() {
  return <JsonViewer />
}
```

### 2.5 JSON Editor Component (NEW)

**File:** `src/components/admin/JsonEditor/JsonEditor.tsx`

```typescript
'use client'

import { useState } from 'react'
import { Save, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import AdminMenu from '../AdminMenu'

interface JsonData {
  id: string
  reference: string
  source: 'stakeholder' | 'workflow'
  currentConfig: any
}

export default function JsonEditor() {
  const [jsonData, setJsonData] = useState<JsonData | null>(null)
  const [editedJson, setEditedJson] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [searchRef, setSearchRef] = useState('')
  const [selectedSource, setSelectedSource] = useState<'stakeholder' | 'workflow'>('stakeholder')

  const handleSearch = async () => {
    if (!searchRef.trim()) {
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
          .eq('reference', searchRef.toUpperCase())
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

      if (selectedSource === 'stakeholder') {
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
      <AdminMenu />

      <main className="max-w-7xl mx-auto px-4 py-12">
        <div className="mb-8">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Community
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">JSON Configuration Editor</h1>
          <p className="text-gray-600">Edit and update configuration data</p>
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
                <option value="workflow">Workflow Definition</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Search Reference</label>
              <input
                type="text"
                value={searchRef}
                onChange={(e) => setSearchRef(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                disabled={jsonData !== null}
                placeholder="e.g., STK-001"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          <button
            onClick={handleSearch}
            disabled={loading || jsonData !== null}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium px-4 py-2 rounded-lg transition-colors"
          >
            {loading ? 'Searching...' : jsonData ? 'Editing...' : 'Load Configuration'}
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
```

**File:** `src/app/admin/json-editor/page.tsx`

```typescript
import JsonEditor from '@/components/admin/JsonEditor/JsonEditor'

export default function JsonEditorPage() {
  return <JsonEditor />
}
```

---

## Part 3: Existing Pages Updates

### 3.1 Update Existing Admin Pages

All existing admin pages (Roles, Stakeholder Registry, etc.) need the `AdminMenu` component added at the top.

**Pattern for all existing admin pages:**

```typescript
import AdminMenu from '@/components/admin/AdminMenu'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function YourAdminPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminMenu />
      
      <main className="max-w-7xl mx-auto px-4 py-12">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Community
        </Link>
        
        {/* Your existing page content */}
      </main>
    </div>
  )
}
```

**Files to update:**
- `src/app/admin/roles/page.tsx`
- `src/app/admin/stakeholders/page.tsx`
- `src/app/admin/relationship-types/page.tsx`
- `src/app/admin/stakeholder-type-roles/page.tsx`
- `src/app/admin/blog-posts/page.tsx`
- `src/app/admin/pages/page.tsx`
- `src/app/admin/enquiries/page.tsx`

### 3.2 Navigation Link Updates

Replace all instances of:
- `"Back to Admin"` → `"Back to Community"`
- `href="/admin"` navigation links (ensure they work with new structure)

---

## Part 4: Implementation Checklist

### Phase 4.1: Setup & Dependencies
- [ ] Install `react-json-view`: `npm install react-json-view`
- [ ] Verify all imports available (Lucide icons, Next.js components)
- [ ] Create component directory structure

### Phase 4.2: Core Components
- [ ] Create `AdminMenu.tsx` component
- [ ] Test menu highlighting on current route
- [ ] Create Community Dashboard page (`/admin/page.tsx`)
- [ ] Verify dashboard layout and card styling

### Phase 4.3: JSON Tools
- [ ] Create `JsonViewer.tsx` component
- [ ] Create `JsonEditor.tsx` component
- [ ] Create page routes for both
- [ ] Test Supabase query integration
- [ ] Test JSON rendering with react-json-view
- [ ] Test JSON editing and save functionality

### Phase 4.4: Update Existing Pages
- [ ] Add `AdminMenu` to all 7 existing admin pages
- [ ] Update "Back to Admin" links to "Back to Community"
- [ ] Test navigation between all pages
- [ ] Verify styling consistency

### Phase 4.5: Testing
- [ ] Navigate through all menu tabs
- [ ] Test JSON Viewer search functionality
- [ ] Test JSON Editor validation
- [ ] Test JSON Editor save with valid/invalid JSON
- [ ] Verify all back-navigation links work
- [ ] Test responsive layout on mobile/tablet

### Phase 4.6: Deployment
- [ ] Build verification: `npm run build`
- [ ] Type checking: `npm run type-check`
- [ ] Commit all changes to Git
- [ ] Deploy to Vercel

---

## Part 5: File Summary

**New Files to Create:**
```
src/components/admin/AdminMenu.tsx
src/components/admin/JsonViewer/JsonViewer.tsx
src/app/admin/json-viewer/page.tsx
src/components/admin/JsonEditor/JsonEditor.tsx
src/app/admin/json-editor/page.tsx
src/app/admin/page.tsx (new Community Dashboard)
```

**Files to Modify:**
```
src/app/admin/roles/page.tsx
src/app/admin/stakeholders/page.tsx
src/app/admin/relationship-types/page.tsx
src/app/admin/stakeholder-type-roles/page.tsx
src/app/admin/blog-posts/page.tsx
src/app/admin/pages/page.tsx
src/app/admin/enquiries/page.tsx
```

**Total Changes:** 13 files (6 new, 7 modified)

---

## Part 6: Menu Navigation Map

```
VC Studio Admin (top header)
│
├─ Community Tab
│  └─ URL: /admin
│     Content: Community Dashboard (card grid)
│     Cards link to:
│     ├─ Stakeholder Registry → /admin/stakeholders
│     ├─ Roles → /admin/roles
│     ├─ Relationship Types → /admin/relationship-types
│     └─ Stakeholder Type Roles → /admin/stakeholder-type-roles
│
├─ Content Tab
│  └─ URL: /admin/blog-posts
│     Content: Blog Posts list (existing)
│     Secondary: /admin/pages (Pages list)
│
├─ Enquiries Tab
│  └─ URL: /admin/enquiries
│     Content: Enquiries list (existing)
│
└─ JSON Tools Tab
   ├─ Primary: /admin/json-viewer
   │  Content: JSON Viewer (NEW)
   │
   └─ Secondary: /admin/json-editor
      Content: JSON Editor (NEW)
```

---

## Part 7: RLS & Security

**JSON Tools Access Policy:**

Add to Supabase policies for `stakeholders` table:

```sql
-- Only super_admin and domain_admin can use JSON tools
CREATE POLICY "JSON tools access for admins only" ON stakeholders
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.auth_user_id = auth.uid() 
            AND u.role IN ('super_admin', 'domain_admin')
        )
    );
```

---

## Part 8: Future Enhancements (Post-Sprint)

- [ ] Add Monaco Editor for advanced JSON editing (Phase 1d)
- [ ] Implement JSON schema validation
- [ ] Add JSON comparison tool (before/after versions)
- [ ] Support for workflow definition editing
- [ ] Bulk JSON operations
- [ ] Configuration versioning and history
- [ ] AI-powered JSON recommendations via Claude

---

## Execution Notes for Cursor

**Start With:**
1. Create `AdminMenu.tsx` first — all other pages depend on it
2. Create new Community Dashboard page
3. Add menu to all existing pages
4. Create JSON tools components last

**Test After Each Major Section:**
- After AdminMenu: verify highlighting works
- After dashboard: verify cards link correctly
- After updating existing pages: verify all links work
- After JSON tools: verify search and operations

**Key Considerations:**
- Maintain consistent styling with existing Tailwind setup
- Ensure responsive design works on mobile
- Test all navigation paths thoroughly
- Verify no broken links after changes

---

**Document Status:** Ready for Cursor execution  
**Last Updated:** November 2025  
**Estimated Effort:** 1-2 development days  
**Scope:** Complete Phase 1c implementation
