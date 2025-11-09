'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/hooks/useAuth';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Shield, Network, ChevronRight } from 'lucide-react';

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
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-brand-text-muted">Manage system settings and definitions</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Stakeholder Registry */}
        <Link
          href="/dashboard/admin/stakeholders"
          className="bg-section-light p-6 rounded-lg border border-section-border hover:border-accent-primary transition group"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <ChevronRight className="w-5 h-5 text-brand-text-muted group-hover:text-accent-primary transition" />
          </div>
          <h2 className="text-lg font-semibold mb-2">Stakeholder Registry</h2>
          <p className="text-sm text-brand-text-muted">
            Manage stakeholders, view profiles, assign roles, and create relationships
          </p>
        </Link>

        {/* Roles Management */}
        <Link
          href="/dashboard/admin/roles"
          className="bg-section-light p-6 rounded-lg border border-section-border hover:border-accent-primary transition group"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Shield className="w-6 h-6 text-purple-600" />
            </div>
            <ChevronRight className="w-5 h-5 text-brand-text-muted group-hover:text-accent-primary transition" />
          </div>
          <h2 className="text-lg font-semibold mb-2">Roles</h2>
          <p className="text-sm text-brand-text-muted">
            Define and manage role types that can be assigned to stakeholders
          </p>
        </Link>

        {/* Relationship Types Management */}
        <Link
          href="/dashboard/admin/relationship-types"
          className="bg-section-light p-6 rounded-lg border border-section-border hover:border-accent-primary transition group"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <Network className="w-6 h-6 text-green-600" />
            </div>
            <ChevronRight className="w-5 h-5 text-brand-text-muted group-hover:text-accent-primary transition" />
          </div>
          <h2 className="text-lg font-semibold mb-2">Relationship Types</h2>
          <p className="text-sm text-brand-text-muted">
            Define types of relationships between stakeholders (supplier, customer, etc.)
          </p>
        </Link>
      </div>
    </div>
  );
}


