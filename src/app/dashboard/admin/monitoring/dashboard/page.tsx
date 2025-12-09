/**
 * Sprint 1d.6: Workflow Monitoring Dashboard
 * Main monitoring page with tabbed interface
 * Location: /dashboard/admin/monitoring/dashboard
 */

'use client';

import { useState } from 'react';
import { BarChart3, Activity, Clock, FileText, Shield, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminMenu from '@/components/admin/AdminMenu';
import ActiveInstancesTab from '../tabs/ActiveInstancesTab';
import BottleneckAnalysisTab from '../tabs/BottleneckAnalysisTab';
import CycleTimeTab from '../tabs/CycleTimeTab';
import AuditHistoryTab from '../tabs/AuditHistoryTab';
import ComplianceTab from '../tabs/ComplianceTab';

type TabType = 'active' | 'bottleneck' | 'cycle-time' | 'audit' | 'compliance';

export default function MonitoringDashboardPage() {
  const [activeTab, setActiveTab] = useState<TabType>('active');

  const tabs = [
    {
      id: 'active' as TabType,
      label: 'Active Instances',
      icon: Activity,
      description: 'Running workflows',
    },
    {
      id: 'bottleneck' as TabType,
      label: 'Bottleneck Analysis',
      icon: BarChart3,
      description: 'Performance analysis',
    },
    {
      id: 'cycle-time' as TabType,
      label: 'Cycle Time',
      icon: Clock,
      description: 'Duration metrics',
    },
    {
      id: 'audit' as TabType,
      label: 'Audit History',
      icon: FileText,
      description: 'Event trail',
    },
    {
      id: 'compliance' as TabType,
      label: 'Compliance',
      icon: Shield,
      description: 'Reports',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      <AdminMenu />

      <main className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-4">
          <Link
            href="/dashboard/admin/monitoring"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 transition"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Monitoring
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Workflow Monitoring</h1>
          <p className="text-gray-600 mt-2">
            Monitor workflow execution, analyze performance, and generate compliance reports
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px overflow-x-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      group inline-flex items-center px-6 py-4 border-b-2 font-medium text-sm whitespace-nowrap transition
                      ${
                        isActive
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }
                    `}
                  >
                    <Icon
                      className={`w-5 h-5 mr-2 ${
                        isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-500'
                      }`}
                    />
                    <div className="text-left">
                      <div>{tab.label}</div>
                      <div className="text-xs font-normal text-gray-500">{tab.description}</div>
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'active' && <ActiveInstancesTab />}
            {activeTab === 'bottleneck' && <BottleneckAnalysisTab />}
            {activeTab === 'cycle-time' && <CycleTimeTab />}
            {activeTab === 'audit' && <AuditHistoryTab />}
            {activeTab === 'compliance' && <ComplianceTab />}
          </div>
        </div>
      </main>
    </div>
  );
}




