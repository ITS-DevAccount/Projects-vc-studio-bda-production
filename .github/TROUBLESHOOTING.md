# Quick Troubleshooting Guide

## "invariant expected layout router to be mounted" Error

If this error appears, run this checklist:

### 1. Check for stray layout files (Most Common Issue)
```bash
find src -name "layout.*" -not -path "*/app/*"
```
**Expected:** No output (empty)
**If files found:** DELETE them - layout files only belong in `src/app/` subdirectories

### 2. Verify all layouts use .tsx extension
```bash
find src/app -name "layout.*"
```
**Expected:** All files end in `.tsx`, not `.ts`

### 3. Verify client/server component boundaries

**Root Layout** (`src/app/layout.tsx`) - Server Component:
```tsx
// NO 'use client' directive
import { AuthProviderWrapper } from "@/components/providers/AuthProviderWrapper";

export const metadata = { /* ... */ };

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <AuthProviderWrapper>{children}</AuthProviderWrapper>
      </body>
    </html>
  );
}
```

**Auth Layout** (`src/app/auth/layout.tsx`) - Server Component:
```tsx
// NO 'use client' directive
export const metadata = { /* ... */ };

export default function AuthLayout({ children }) {
  return <>{children}</>;
}
```

**Dashboard Layout** (`src/app/dashboard/layout.tsx`) - Client Component:
```tsx
'use client';  // ← MUST HAVE THIS

export default function DashboardLayout({ children }) {
  return <>{children}</>;
}
```

### 4. Clear cache and restart
```bash
rm -rf .next
npm run dev
```

### 5. Verify environment variables
```bash
cat .env.local
```
Should contain:
- `NEXT_PUBLIC_SUPABASE_URL=...`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=...`

## Quick Verification Script

Run this to verify everything is correct:
```bash
cd "c:\Users\ian\ITS-Development\Projects\vc-studio-bda-production"
echo "1. Stray layouts:" && find src -name "layout.*" -not -path "*/app/*" || echo "✅ None"
echo "2. All layouts:" && find src/app -name "layout.tsx"
echo "3. .ts layouts:" && find src/app -name "layout.ts" || echo "✅ None"
```

## File Structure Reference
```
src/
├── app/
│   ├── layout.tsx              ← SERVER (root, has metadata)
│   ├── page.tsx                ← CLIENT (landing page)
│   ├── auth/
│   │   ├── layout.tsx          ← SERVER (has metadata)
│   │   ├── login/page.tsx      ← CLIENT
│   │   └── signup/page.tsx     ← CLIENT
│   └── dashboard/
│       ├── layout.tsx          ← CLIENT ('use client')
│       ├── page.tsx            ← CLIENT
│       └── blog/
│           ├── [id]/page.tsx   ← CLIENT
│           └── new/page.tsx    ← CLIENT
├── components/
│   └── providers/
│       └── AuthProviderWrapper.tsx  ← CLIENT ('use client')
└── lib/
    └── hooks/
        └── useAuth.ts          ← CLIENT (exports AuthProvider)
```

## For Full Details

See `LAYOUT_FIX_DOCUMENTATION.md` for complete root cause analysis and detailed explanation.
