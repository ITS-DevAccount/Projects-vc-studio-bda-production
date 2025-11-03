import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Authentication - VC Studio",
  description: "Sign in to VC Studio",
};

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
