'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/hooks/useAuth';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminHome() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth/login');
    }
  }, [loading, user, router]);

  if (loading || !user) return null;

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
      <div className="grid gap-4">
        <Link href="/dashboard/admin/stakeholders" className="bg-section-light p-6 rounded-lg border border-section-border hover:border-accent-primary transition">
          Stakeholder Registry
        </Link>
      </div>
    </div>
  );
}


