# Phase 1c Correction Specification

**Document Purpose:** Correction specification for Phase 1c implementation issues  
**Status:** Ready for execution  
**Date:** November 2025  
**Application:** vc-bda-production  
**Previous Document:** Phase-1c_Sprint_Admin-Restructure-JSON-Tools.md

---

## Executive Summary

The initial Phase 1c implementation has several issues that need correction:

1. **Admin routing** — Users directed to wrong dashboard
2. **Header/layout consistency** — Missing admin header on pages
3. **Content consolidation** — Blog Posts and Pages not combined
4. **JSON search UX** — Needs dropdown autocomplete and context persistence
5. **Navigation redundancy** — "Back to Community" links unnecessary

This document specifies the corrections needed.

---

## Issue 1: Admin Routing & Dashboard Structure

### Problem

- Admin users logging in are directed to `/dashboard` (main user dashboard)
- `/dashboard/admin` should be the primary admin entry point
- `/dashboard` should be blank or redirect based on role
- Currently no explicit routing logic for admin users

### Solution

**Create role-based routing middleware:**

**File:** `src/lib/middleware/dashboardRouter.ts`

```typescript
import { createClient } from '@supabase/supabase-js'

export async function getDashboardPath(userId: string): Promise<string> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: user, error } = await supabase
    .from('users')
    .select('role')
    .eq('auth_user_id', userId)
    .single()

  if (error || !user) {
    return '/auth' // Default to auth if user not found
  }

  // Admin roles → admin dashboard
  if (['super_admin', 'domain_admin', 'app_manager'].includes(user.role)) {
    return '/dashboard/admin'
  }

  // Regular users → user dashboard
  return '/dashboard'
}
```

**File:** `src/app/dashboard/page.tsx` (Modified)

```typescript
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { getDashboardPath } from '@/lib/middleware/dashboardRouter'

export default function DashboardPage() {
  const router = useRouter()

  useEffect(() => {
    const checkUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/auth')
        return
      }

      const path = await getDashboardPath(user.id)
      router.push(path)
    }

    checkUserRole()
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <p className="text-gray-600">Redirecting...</p>
      </div>
    </div>
  )
}
```

### Expected Behavior

- Admin user logs in → redirected to `/dashboard/admin`
- Regular user logs in → redirected to `/dashboard` (existing user dashboard)
- Non-logged-in user → redirected to `/auth`

---

## Issue 2: Admin Header Component & Layout Consistency

### Problem

- Admin pages missing consistent header with:
  - Admin title/branding
  - Current user display
  - Logout button
- "Back to Community" links should be removed
- All admin pages need same header structure

### Solution

**Create AdminHeader component:**

**File:** `src/components/admin/AdminHeader.tsx`

```typescript
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { LogOut, Settings } from 'lucide-react'

export default function AdminHeader() {
  const [user, setUser] = useState<any>(null)
  const [email, setEmail] = useState('')

  useEffect(() => {
    const getUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser) {
        setEmail(authUser.email || '')
        
        // Fetch user record for display name
        const { data: userData } = await supabase
          .from('users')
          .select('display_name')
          .eq('auth_user_id', authUser.id)
          .single()
        
        setUser(userData)
      }
    }

    getUser()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/auth'
  }

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">VC Studio Admin</h1>
            <p className="text-sm text-gray-600">{email}</p>
          </div>
          
          <div className="flex items-center gap-4">
            <Link
              href="/admin/settings"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4" />
              Admin Settings
            </Link>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
```

**Update all admin pages to use header:**

Example structure for all pages:

```typescript
import AdminHeader from '@/components/admin/AdminHeader'
import AdminMenu from '@/components/admin/AdminMenu'

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      <AdminMenu />
      
      <main className="max-w-7xl mx-auto px-4 py-12">
        {/* Page content - NO "Back to Community" link */}
      </main>
    </div>
  )
}
```

### Files to Update

Add `AdminHeader` to all these pages:
- `src/app/admin/page.tsx` (Community Dashboard)
- `src/app/admin/content/page.tsx` (NEW - see Issue 3)
- `src/app/admin/enquiries/page.tsx`
- `src/app/admin/json-viewer/page.tsx`
- `src/app/admin/json-editor/page.tsx`
- All other admin sub-pages

**Remove from all pages:**
- `< Back to Community` links
- Direct navigation links in main content

---

## Issue 3: Content Tab - Blog Posts & Pages Consolidation

### Problem

- Content tab exists but doesn't consolidate Blog Posts and Pages
- Users have to navigate separately to each section
- No unified content management view

### Solution

**Create unified Content page:**

**File:** `src/app/admin/content/page.tsx` (NEW)

```typescript
'use client'

import { useState } from 'react'
import AdminHeader from '@/components/admin/AdminHeader'
import AdminMenu from '@/components/admin/AdminMenu'
import BlogPostsSection from '@/components/admin/content/BlogPostsSection'
import PagesSection from '@/components/admin/content/PagesSection'

type ContentTab = 'blog-posts' | 'pages'

export default function ContentPage() {
  const [activeTab, setActiveTab] = useState<ContentTab>('blog-posts')

  const tabs = [
    { id: 'blog-posts', label: 'Blog Posts' },
    { id: 'pages', label: 'Pages' }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      <AdminMenu />

      <main className="max-w-7xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Content Management</h1>
          <p className="text-gray-600">Manage editorial content and pages</p>
        </div>

        {/* Content tabs */}
        <div className="border-b border-gray-200 mb-8">
          <div className="flex gap-8">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ContentTab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content sections */}
        {activeTab === 'blog-posts' && <BlogPostsSection />}
        {activeTab === 'pages' && <PagesSection />}
      </main>
    </div>
  )
}
```

**Update AdminMenu to point to /admin/content:**

```typescript
const menuItems: MenuItem[] = [
  { id: 'community', label: 'Community', href: '/admin' },
  { id: 'content', label: 'Content', href: '/admin/content' },  // Updated
  { id: 'enquiries', label: 'Enquiries', href: '/admin/enquiries' },
  { id: 'json-tools', label: 'JSON Tools', href: '/admin/json-viewer' },
]
```

**Move existing blog/pages content to components:**

- Extract Blog Posts list from existing page → `src/components/admin/content/BlogPostsSection.tsx`
- Extract Pages list from existing page → `src/components/admin/content/PagesSection.tsx`
- Import both into new unified content page

### File Structure

```
src/
├── app/admin/
│   ├── content/
│   │   └── page.tsx                    (NEW - unified view)
│   ├── blog-posts/
│   │   └── page.tsx                    (keep for direct links)
│   └── pages/
│       └── page.tsx                    (keep for direct links)
│
└── components/admin/
    └── content/
        ├── BlogPostsSection.tsx        (NEW)
        └── PagesSection.tsx            (NEW)
```

---

## Issue 4: JSON Search with Dropdown Autocomplete & Context Persistence

### Problem

1. JSON search field is plain text input — no autocomplete
2. Switching between Viewer and Editor loses search context
3. Have to re-search stakeholder every time
4. No visual feedback on available stakeholders

### Solution

**Create shared search context:**

**File:** `src/lib/hooks/useJsonSearchContext.ts`

```typescript
'use client'

import { create } from 'zustand'

interface JsonSearchState {
  selectedReference: string
  selectedSource: 'stakeholder' | 'workflow'
  setSelectedReference: (ref: string) => void
  setSelectedSource: (source: 'stakeholder' | 'workflow') => void
  clearContext: () => void
}

export const useJsonSearchContext = create<JsonSearchState>((set) => ({
  selectedReference: '',
  selectedSource: 'stakeholder',
  setSelectedReference: (ref: string) => set({ selectedReference: ref }),
  setSelectedSource: (source: 'stakeholder' | 'workflow') => set({ selectedSource: source }),
  clearContext: () => set({ selectedReference: '', selectedSource: 'stakeholder' })
}))
```

**Create StakeholderSearch component with autocomplete:**

**File:** `src/components/admin/JsonTools/StakeholderSearch.tsx`

```typescript
'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { ChevronDown } from 'lucide-react'

interface Stakeholder {
  id: string
  reference: string
  name: string
}

interface Props {
  value: string
  onChange: (ref: string) => void
  disabled?: boolean
}

export default function StakeholderSearch({ value, onChange, disabled }: Props) {
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([])
  const [filtered, setFiltered] = useState<Stakeholder[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Load all stakeholders on mount
  useEffect(() => {
    const loadStakeholders = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('stakeholders')
        .select('id, reference, name')
        .order('reference', { ascending: true })

      if (!error && data) {
        setStakeholders(data)
        setFiltered(data)
      }
      setLoading(false)
    }

    loadStakeholders()
  }, [])

  // Filter stakeholders based on input
  const handleInputChange = (searchValue: string) => {
    onChange(searchValue)
    
    if (!searchValue.trim()) {
      setFiltered(stakeholders)
    } else {
      const term = searchValue.toLowerCase()
      setFiltered(
        stakeholders.filter(s =>
          s.reference.toLowerCase().includes(term) ||
          s.name.toLowerCase().includes(term)
        )
      )
    }
    
    setIsOpen(true)
  }

  // Handle selection
  const handleSelect = (stakeholder: Stakeholder) => {
    onChange(stakeholder.reference)
    setIsOpen(false)
  }

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={dropdownRef} className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Search Reference
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          onClick={() => setIsOpen(true)}
          disabled={disabled}
          placeholder="Type to search (e.g., STK-001)"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 pr-10"
        />
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>

      {/* Dropdown list */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
          {loading ? (
            <div className="px-4 py-2 text-gray-500 text-sm">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-2 text-gray-500 text-sm">No stakeholders found</div>
          ) : (
            filtered.map(stakeholder => (
              <button
                key={stakeholder.id}
                onClick={() => handleSelect(stakeholder)}
                className="w-full text-left px-4 py-2 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0"
              >
                <div className="font-mono font-semibold text-blue-600">{stakeholder.reference}</div>
                <div className="text-sm text-gray-600">{stakeholder.name}</div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
```

**Update JSON Viewer to use context & search component:**

**File:** `src/components/admin/JsonViewer/JsonViewer.tsx` (Updated)

```typescript
'use client'

import { useState, useEffect } from 'react'
import ReactJsonView from 'react-json-view'
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
  }, [selectedReference])

  const handleSearch = async () => {
    if (!selectedReference.trim()) {
      setError('Please enter a reference')
      return
    }

    setLoading(true)
    setError(null)

    try {
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
      <AdminHeader />
      <AdminMenu />

      <main className="max-w-7xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">JSON Configuration Viewer</h1>
          <p className="text-gray-600">Inspect and download configuration data</p>
          <Link href="/admin/json-editor" className="text-blue-600 hover:text-blue-700 text-sm mt-2 inline-block">
            Switch to JSON Editor →
          </Link>
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
            <p>Select a stakeholder reference above to view configuration</p>
          </div>
        )}
      </main>
    </div>
  )
}
```

**Update JSON Editor similarly** with context persistence and search component.

### Key Features

✓ Dropdown list of all stakeholders  
✓ Search/filter by reference or name  
✓ Context persists when switching between Viewer/Editor  
✓ Auto-load when reference selected  
✓ "Switch to JSON Editor" link maintains search context  

---

## Issue 5: Remove "Back to Community" Links

### Problem

- "Back to Community" links unnecessary since menu allows navigation
- Clutters UI and is redundant

### Solution

**Remove from all admin pages:**

```typescript
// DELETE THIS:
<Link
  href="/admin"
  className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium mb-4"
>
  <ArrowLeft className="w-4 h-4" />
  Back to Community
</Link>
```

Users can navigate via:
- AdminMenu tabs (Community | Content | Enquiries | JSON Tools)
- "Switch to JSON Editor/Viewer" links within JSON tools

---

## Implementation Checklist

### Phase 1: Routing & Header
- [ ] Create `dashboardRouter.ts` middleware
- [ ] Update `/dashboard/page.tsx` with role-based routing
- [ ] Create `AdminHeader.tsx` component
- [ ] Add AdminHeader to all admin pages

### Phase 2: Content Consolidation
- [ ] Create `/admin/content/page.tsx` (unified)
- [ ] Create `BlogPostsSection.tsx` component
- [ ] Create `PagesSection.tsx` component
- [ ] Update AdminMenu content link

### Phase 3: JSON Search Enhancement
- [ ] Create `useJsonSearchContext.ts` hook (Zustand)
- [ ] Create `StakeholderSearch.tsx` component
- [ ] Update `JsonViewer.tsx` with context & search
- [ ] Update `JsonEditor.tsx` with context & search
- [ ] Add "Switch to Editor/Viewer" links

### Phase 4: Cleanup
- [ ] Remove all "Back to Community" links
- [ ] Remove `ArrowLeft` imports where no longer used
- [ ] Test navigation across all pages
- [ ] Verify context persistence when switching tools

### Phase 5: Testing
- [ ] Admin user login → redirects to `/dashboard/admin` ✓
- [ ] Regular user login → redirects to `/dashboard` ✓
- [ ] All pages have AdminHeader with logout ✓
- [ ] Content tab shows both Blog Posts and Pages ✓
- [ ] JSON search shows dropdown ✓
- [ ] Switching Viewer↔Editor maintains search context ✓
- [ ] AdminMenu tabs highlight correctly ✓
- [ ] No broken navigation ✓

---

## Files Summary

**New Files:**
```
src/lib/middleware/dashboardRouter.ts
src/lib/hooks/useJsonSearchContext.ts
src/components/admin/AdminHeader.tsx
src/components/admin/content/BlogPostsSection.tsx
src/components/admin/content/PagesSection.tsx
src/components/admin/JsonTools/StakeholderSearch.tsx
src/app/admin/content/page.tsx
```

**Modified Files:**
```
src/app/dashboard/page.tsx
src/components/admin/AdminMenu.tsx
src/components/admin/JsonViewer/JsonViewer.tsx
src/components/admin/JsonEditor/JsonEditor.tsx
src/app/admin/page.tsx
src/app/admin/enquiries/page.tsx
src/app/admin/json-editor/page.tsx
src/app/admin/json-viewer/page.tsx
(+ all other admin sub-pages)
```

**Total Changes:** 15+ files

---

## Execution Notes for Cursor

**Priority Order:**
1. Create routing middleware and update `/dashboard/page.tsx` first
2. Create AdminHeader component
3. Add AdminHeader to all existing admin pages
4. Create Content consolidation page
5. Create search context and StakeholderSearch component
6. Update JSON tools to use new search
7. Remove "Back to Community" links everywhere
8. Test thoroughly

**Key Testing Points:**
- Login as admin user → should redirect to `/dashboard/admin`
- Login as regular user → should redirect to `/dashboard`
- Navigate AdminMenu tabs → should highlight current section
- Search JSON tools → dropdown should appear with stakeholders
- Switch between JSON Viewer and Editor → search context should persist
- All logout buttons should work

---

**Document Status:** Ready for Cursor execution  
**Last Updated:** November 2025  
**Scope:** Correct identified issues from Phase 1c implementation  
**Estimated Effort:** 1-2 development days
