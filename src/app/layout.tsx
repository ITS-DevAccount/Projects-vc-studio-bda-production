import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProviderWrapper } from "@/components/providers/AuthProviderWrapper";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { AppProvider } from "@/contexts/AppContext";

export const metadata: Metadata = {
  title: "VC Studio",
  description: "Value Chain Studio - Business transformation",
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AppProvider>
          <ThemeProvider>
            <AuthProviderWrapper>
              {children}
            </AuthProviderWrapper>
          </ThemeProvider>
        </AppProvider>
      </body>
    </html>
  );
}