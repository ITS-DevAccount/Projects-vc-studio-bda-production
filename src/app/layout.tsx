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