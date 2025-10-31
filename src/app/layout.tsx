import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "VC Studio",
  description: "Value Chain Studio - Business transformation",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
      {children}
      </body>
    </html>
  );
}