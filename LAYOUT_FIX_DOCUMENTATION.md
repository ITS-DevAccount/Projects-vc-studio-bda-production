# Layout Router Error - Root Cause Analysis & Permanent Fix

## Error Message
```
invariant expected layout router to be mounted
```

## Root Cause Analysis

The "invariant expected layout router to be mounted" error in Next.js App Router occurs when there is a **mismatch between server and client component architecture** in the layout hierarchy. This specific project had **MULTIPLE issues** that compounded to cause this error:

### Issue #1: Duplicate Layout File (CRITICAL)
**Location:** `src/layout.tsx` (WRONG LOCATION)

**Problem:**
- In Next.js App Router, layout files MUST be inside the `app` directory
- A stray `src/layout.tsx` file existed outside the `app` directory
- This file conflicted with the proper `src/app/layout.tsx` file
- Next.js couldn't determine which layout to use, causing the router mounting error

**Fix:** Deleted `src/layout.tsx`

**Prevention:** Only create layout files inside `src/app/` or its subdirectories

---

### Issue #2: Client/Server Component Architecture Mismatch
**Location:** `src/app/dashboard/layout.tsx`

**Problem:**
- The root layout (`src/app/layout.tsx`) is a server component (no `'use client'`)
- The dashboard page (`src/app/dashboard/page.tsx`) is a client component (`'use client'`)
- The dashboard layout was initially a server component with metadata export
- This created a server→client→server pattern that broke the router

**Fix:** Made `src/app/dashboard/layout.tsx` a client component:
```tsx
'use client';

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
```

**Why this works:**
- Next.js requires consistent component boundaries
- Client components can render client components (no boundary crossing)
- Removed the `metadata` export (not allowed in client components)

---

### Issue #3: AuthProvider Implementation
**Location:** `src/app/layout.tsx` and `src/lib/hooks/useAuth.ts`

**Problem:**
- Root layout is a server component but needs to wrap children with AuthProvider
- AuthProvider (`src/lib/hooks/useAuth.ts`) is a client component (uses hooks)
- Direct import would break server component rules

**Fix:** Created `AuthProviderWrapper` component:

**File:** `src/components/providers/AuthProviderWrapper.tsx`
```tsx
'use client';

import { AuthProvider } from '@/lib/hooks/useAuth';
import { Suspense } from 'react';

export function AuthProviderWrapper({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <AuthProvider>{children}</AuthProvider>
    </Suspense>
  );
}
```

**File:** `src/app/layout.tsx`
```tsx
import type { Metadata } from "next";
import "./globals.css";
import { AuthProviderWrapper } from "@/components/providers/AuthProviderWrapper";

export const metadata: Metadata = {
  title: "VC Studio",
  description: "Value Chain Studio - Business transformation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AuthProviderWrapper>
          {children}
        </AuthProviderWrapper>
      </body>
    </html>
  );
}
```

**Why this works:**
- Server component (RootLayout) imports and uses client component (AuthProviderWrapper)
- Client component boundary is clearly defined
- AuthProvider stays a client component with access to hooks
- Suspense prevents hydration mismatches

---

### Issue #4: Environment Variables (.env.local)
**Location:** `.env.local`

**Problem:**
- File had BOM (Byte Order Mark) character `﻿` at the beginning
- Can cause environment variable parsing issues

**Fix:** Recreated `.env.local` without BOM:
```env
NEXT_PUBLIC_SUPABASE_URL=https://ihebxuoyklkaimjtcwwq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Correct Directory Structure

```
src/
├── app/
│   ├── layout.tsx              ✅ SERVER component (root layout with metadata)
│   ├── page.tsx                ✅ CLIENT component (landing page)
│   ├── globals.css             ✅ Global styles
│   │
│   ├── auth/
│   │   ├── layout.tsx          ✅ SERVER component (auth section layout)
│   │   ├── login/
│   │   │   └── page.tsx        ✅ CLIENT component (login page)
│   │   └── signup/
│   │       └── page.tsx        ✅ CLIENT component (signup page)
│   │
│   ├── dashboard/
│   │   ├── layout.tsx          ✅ CLIENT component (dashboard layout)
│   │   ├── page.tsx            ✅ CLIENT component (dashboard home)
│   │   └── blog/
│   │       ├── [id]/
│   │       │   └── page.tsx    ✅ CLIENT component (blog editor)
│   │       └── new/
│   │           └── page.tsx    ✅ CLIENT component (new blog)
│   │
│   └── test-auth/
│       └── page.tsx            ✅ CLIENT component (test page)
│
├── components/
│   └── providers/
│       └── AuthProviderWrapper.tsx  ✅ CLIENT component (wraps AuthProvider)
│
├── lib/
│   ├── hooks/
│   │   └── useAuth.ts          ✅ CLIENT component (exports AuthProvider)
│   └── supabase/
│       └── client.ts           ✅ Supabase client initialization
│
└── layout.tsx                  ❌ DELETE THIS - WRONG LOCATION!
```

---

## File Extension Rules

All Next.js App Router special files MUST use `.tsx` extension:
- ✅ `layout.tsx` (not `layout.ts`)
- ✅ `page.tsx` (not `page.ts`)
- ✅ `loading.tsx` (not `loading.ts`)
- ✅ `error.tsx` (not `error.ts`)

Regular utility files can use `.ts`:
- ✅ `client.ts` (Supabase client)
- ✅ `config.ts` (configuration files)

---

## Client vs Server Component Rules

### When to use Server Components (default)
```tsx
// No 'use client' directive
import type { Metadata } from "next";

export const metadata: Metadata = { /* ... */ };

export default function Layout() {
  // Can fetch data, use metadata, etc.
}
```

**Use for:**
- Root layouts with metadata
- Layouts that don't need interactivity
- Pages that only display static/server-fetched data

### When to use Client Components
```tsx
'use client';

export default function Component() {
  // Can use useState, useEffect, event handlers, etc.
}
```

**Use for:**
- Components using React hooks (useState, useEffect, etc.)
- Components with event handlers (onClick, onChange, etc.)
- Components using browser APIs (localStorage, window, etc.)
- Context providers (like AuthProvider)

### Layout Hierarchy Rules
```
Server Layout (root)
  └─ Client Wrapper (AuthProviderWrapper)
       └─ Server Layout (auth)
            └─ Client Page (login)

       └─ Client Layout (dashboard)
            └─ Client Page (dashboard home)
```

**Key Rule:** Once you go client, everything below stays client!

---

## Prevention Checklist

Before starting development, verify:

1. ✅ **No stray layout files:** Only in `src/app/` subdirectories
   ```bash
   # Should return empty
   ls src/*.tsx src/*.ts
   ```

2. ✅ **All layouts use .tsx extension:**
   ```bash
   find src/app -name "layout.*"
   # All should be .tsx
   ```

3. ✅ **Correct client/server boundaries:**
   - Root layout = server component
   - AuthProvider wrapper = client component
   - Auth layouts = server component (if no interactivity needed)
   - Dashboard layouts = client component (if child pages need client features)

4. ✅ **No BOM in .env.local:**
   ```bash
   cat .env.local | od -c | head -1
   # Should NOT show \357\273\277 (BOM)
   ```

5. ✅ **Environment variables properly set:**
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## Testing After Fix

Run these tests to verify the fix:

1. **Dev server starts without errors:**
   ```bash
   npm run dev
   # Should show: ✓ Ready in X.Xs
   ```

2. **All routes compile successfully:**
   - `/` (landing page)
   - `/auth/login` (login page)
   - `/auth/signup` (signup page)
   - `/dashboard` (dashboard home)
   - `/dashboard/blog/new` (new blog)

3. **No console errors:**
   - Open browser console (F12)
   - Navigate to each route
   - Should have no "invariant" errors

4. **AuthProvider works:**
   - Login functionality works
   - Dashboard shows user email
   - Logout works

---

## If Error Recurs

If you see "invariant expected layout router to be mounted" again:

1. **Check for stray layout files:**
   ```bash
   find src -name "layout.*" -not -path "*/app/*"
   ```

2. **Verify client/server boundaries:**
   - Check all layout files have correct `'use client'` directives
   - Ensure AuthProviderWrapper exists and is imported correctly

3. **Clear Next.js cache:**
   ```bash
   rm -rf .next
   npm run dev
   ```

4. **Check git diff:**
   ```bash
   git diff src/app/layout.tsx
   git diff src/app/dashboard/layout.tsx
   git diff src/components/providers/AuthProviderWrapper.tsx
   ```

---

## Summary

**The fix required 4 changes:**
1. ✅ Deleted stray `src/layout.tsx` file
2. ✅ Made `src/app/dashboard/layout.tsx` a client component
3. ✅ Created `AuthProviderWrapper` to properly handle client/server boundaries
4. ✅ Removed BOM from `.env.local`

**The error was caused by:**
- Incorrect file structure (stray layout file)
- Improper client/server component boundaries
- Mixing server and client features incorrectly

**Prevention:**
- Keep layout files only in `src/app/` subdirectories
- Use proper `'use client'` directives
- Use wrapper components for client providers in server layouts
- Verify .env files have no BOM characters
