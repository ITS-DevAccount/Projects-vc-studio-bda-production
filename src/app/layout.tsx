import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'VC Studio - BDA',
  description: 'Business Domain Architecture',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  )
}
