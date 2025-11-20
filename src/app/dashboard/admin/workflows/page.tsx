'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/hooks/useAuth';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CheckSquare, BarChart3, Workflow, PlayCircle, Settings } from 'lucide-react';
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
      id: 'my-tasks',
      label: 'My Tasks',
      description: 'View and complete tasks assigned to you',
      icon: CheckSquare,
      href: '/dashboard/admin/my-tasks'
    },
    {
      id: 'running-instances',
      label: 'Running Instances',
      description: 'Monitor active workflow instances and their progress',
      icon: BarChart3,
      href: '/dashboard/admin/instances'
    },
    {
      id: 'create-instance',
      label: 'Create Instance',
      description: 'Create new workflow instances from templates',
      icon: PlayCircle,
      href: '/dashboard/admin/workflow-instances'
    },
    {
      id: 'workflow-designer',
      label: 'Workflow Designer',
      description: 'Create and edit workflow templates',
      icon: Workflow,
      href: '/dashboard/admin/workflow-designer'
    },
    {
      id: 'function-registry',
      label: 'Function Registry',
      description: 'Manage workflow task definitions and schemas',
      icon: Settings,
      href: '/dashboard/admin/function-registry'
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      <AdminMenu />

      <main className="max-w-7xl mx-auto px-4 py-12">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Workflows</h1>
          <p className="text-gray-600 mb-8">Manage workflow tasks, instances, and templates</p>
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
