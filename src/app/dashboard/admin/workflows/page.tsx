'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/hooks/useAuth';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Settings, Database, Workflow, PlayCircle, Cloud, FileText } from 'lucide-react';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminMenu from '@/components/admin/AdminMenu';

export default function WorkflowsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth/login');
    }
  }, [loading, user, router]);

  if (loading || !user) return null;

  const sections = [
    {
      id: 'function-registry',
      label: 'Function Registry',
      description: 'Manage workflow task definitions with input/output schemas',
      icon: Settings,
      href: '/dashboard/admin/function-registry'
    },
    {
      id: 'component-register',
      label: 'Component Register',
      description: 'Manage system components, AI functions, and workflow tasks registry',
      icon: Database,
      href: '/dashboard/admin/registry'
    },
    {
      id: 'workflow-designer',
      label: 'Workflow Designer',
      description: 'Create and manage workflow templates with visual canvas',
      icon: Workflow,
      href: '/dashboard/admin/workflow-designer'
    },
    {
      id: 'workflow-instances',
      label: 'Create Workflow Instance',
      description: 'Create executable workflow instances from templates with stakeholder assignments',
      icon: PlayCircle,
      href: '/dashboard/admin/workflow-instances'
    },
    {
      id: 'service-configurations',
      label: 'Service Configurations',
      description: 'Manage REAL and MOCK service configurations for workflow service tasks',
      icon: Cloud,
      href: '/dashboard/admin/services'
    },
    {
      id: 'service-logs',
      label: 'Service Execution Logs',
      description: 'View audit trail of all service executions with performance metrics',
      icon: FileText,
      href: '/dashboard/admin/service-logs'
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      <AdminMenu />

      <main className="max-w-7xl mx-auto px-4 py-12">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Workflows</h1>
          <p className="text-gray-600 mb-8">Manage workflow templates, instances, and configurations</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sections.map(section => {
            const Icon = section.icon;
            return (
              <Link
                key={section.id}
                href={section.href}
                className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg hover:border-blue-300 transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <Icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold text-gray-900 mb-1">
                      {section.label}
                    </h2>
                    <p className="text-sm text-gray-600">
                      {section.description}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
