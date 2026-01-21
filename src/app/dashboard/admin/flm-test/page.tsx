'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminMenu from '@/components/admin/AdminMenu';

// Import FLM components
import FLMModelDisplay from '@/components/flm/FLMModelDisplay';
import BVSBuilder from '@/components/flm/BVSBuilder';
import DBSForm from '@/components/flm/DBSForm';
import L0Builder from '@/components/flm/L0Builder';
import L1Builder from '@/components/flm/L1Builder';
import L2Builder from '@/components/flm/L2Builder';
import BlueprintGenerator from '@/components/flm/BlueprintGenerator';
import ArtefactStatusBadge from '@/components/flm/ArtefactStatusBadge';
import ArtefactVersionHistory from '@/components/flm/ArtefactVersionHistory';
import SourceDocUploader from '@/components/flm/SourceDocUploader';

export default function FLMTestPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [activeComponent, setActiveComponent] = useState<string>('display');

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth/login');
    }
  }, [loading, user, router]);

  if (loading || !user) return null;

  const components = [
    { id: 'display', label: 'FLM Model Display', component: FLMModelDisplay },
    { id: 'bvs', label: 'BVS Builder', component: BVSBuilder },
    { id: 'dbs', label: 'DBS Form', component: DBSForm },
    { id: 'l0', label: 'L0 Builder', component: L0Builder },
    { id: 'l1', label: 'L1 Builder', component: L1Builder },
    { id: 'l2', label: 'L2 Builder', component: L2Builder },
    { id: 'blueprint', label: 'Blueprint Generator', component: BlueprintGenerator },
    { id: 'badge', label: 'Status Badge', component: ArtefactStatusBadge },
    { id: 'history', label: 'Version History', component: ArtefactVersionHistory },
    { id: 'uploader', label: 'Source Doc Uploader', component: SourceDocUploader },
  ];

  const ActiveComponent = components.find(c => c.id === activeComponent)?.component;

  // Mock data and handlers for testing
  const mockProps = {
    vcModelId: 'test-vc-model-id',
    flmModelId: 'test-flm-model-id',
    stakeholderId: 'test-stakeholder-id',
    onSave: async (data: any) => {
      console.log('Mock onSave called with:', data);
      alert('Mock save handler called. Check console for data.');
    },
    onGenerateDBS: () => {
      console.log('Mock onGenerateDBS called');
      alert('Mock DBS generation handler called.');
    },
    onGenerate: async () => {
      console.log('Mock onGenerate called');
      alert('Mock generate handler called.');
    },
  };

  function renderComponent(componentId: string) {
    switch (componentId) {
      case 'display':
        return (
          <FLMModelDisplay
            vcModelId={mockProps.vcModelId}
            flmModelId={mockProps.flmModelId}
            stakeholderId={mockProps.stakeholderId}
          />
        );
      case 'bvs':
        return (
          <BVSBuilder
            vcModelId={mockProps.vcModelId}
            flmModelId={mockProps.flmModelId}
            stakeholderId={mockProps.stakeholderId}
            onSave={mockProps.onSave}
            onGenerateDBS={mockProps.onGenerateDBS}
          />
        );
      case 'dbs':
        return (
          <DBSForm
            vcModelId={mockProps.vcModelId}
            flmModelId={mockProps.flmModelId}
            schema={{
              type: 'object',
              properties: {
                business_name: { type: 'string', title: 'Business Name' },
                legal_structure: { type: 'string', enum: ['Sole Trader', 'Partnership', 'Limited Company'] },
              },
              required: ['business_name']
            }}
            onSave={mockProps.onSave}
          />
        );
      case 'l0':
        return (
          <L0Builder
            vcModelId={mockProps.vcModelId}
            flmModelId={mockProps.flmModelId}
            onSave={mockProps.onSave}
          />
        );
      case 'l1':
        return (
          <L1Builder
            vcModelId={mockProps.vcModelId}
            flmModelId={mockProps.flmModelId}
            onSave={mockProps.onSave}
          />
        );
      case 'l2':
        return (
          <L2Builder
            vcModelId={mockProps.vcModelId}
            flmModelId={mockProps.flmModelId}
            onSave={mockProps.onSave}
          />
        );
      case 'blueprint':
        return (
          <BlueprintGenerator
            vcModelId={mockProps.vcModelId}
            flmModelId={mockProps.flmModelId}
            onGenerate={mockProps.onGenerate}
          />
        );
      case 'badge':
        return (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-2">Draft:</p>
              <ArtefactStatusBadge status="DRAFT" />
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-2">Pending Review:</p>
              <ArtefactStatusBadge status="PENDING_REVIEW" />
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-2">Confirmed:</p>
              <ArtefactStatusBadge status="CONFIRMED" />
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-2">Superseded:</p>
              <ArtefactStatusBadge status="SUPERSEDED" />
            </div>
          </div>
        );
      case 'history':
        return (
          <ArtefactVersionHistory
            artefactType="BVS"
            versions={[
              { id: 'v1', version: 1, status: 'CONFIRMED', created_at: '2026-01-01T00:00:00Z', created_by: 'user1' },
              { id: 'v2', version: 2, status: 'DRAFT', created_at: '2026-01-02T00:00:00Z', created_by: 'user1' },
            ]}
            currentVersion={1}
          />
        );
      case 'uploader':
        return (
          <SourceDocUploader
            flmModelId={mockProps.flmModelId}
            stakeholderId={mockProps.stakeholderId}
            onUploadComplete={() => console.log('Upload complete')}
          />
        );
      default:
        return <p className="text-gray-500">Component rendering not implemented</p>;
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      <div className="flex">
        <AdminMenu />
        <main className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">FLM Components Test Page</h1>
            <p className="text-gray-600 mb-8">
              This page allows you to test and view FLM components in isolation.
              <br />
              <strong>Note:</strong> Components may require mock data or proper VC Model/FLM context to function fully.
            </p>

            {/* Component Selector */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Component to View:
              </label>
              <select
                value={activeComponent}
                onChange={(e) => setActiveComponent(e.target.value)}
                className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {components.map((comp) => (
                  <option key={comp.id} value={comp.id}>
                    {comp.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Active Component Display */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold mb-4">
                {components.find(c => c.id === activeComponent)?.label}
              </h2>
              
              {ActiveComponent ? (
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  {renderComponent(activeComponent)}
                </div>
              ) : (
                <p className="text-gray-500">Component not found</p>
              )}

              {/* Component Info */}
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">Component Information</h3>
                <p className="text-sm text-blue-800">
                  <strong>Component ID:</strong> {activeComponent}
                  <br />
                  <strong>Note:</strong> These components are designed to work with real VC Model and FLM data.
                  They may show errors or placeholders without proper database context.
                  Full integration (Phase 5) will provide proper data flows.
                </p>
              </div>
            </div>

            {/* All Components List */}
            <div className="mt-8">
              <h2 className="text-2xl font-semibold mb-4">Available FLM Components</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {components.map((comp) => (
                  <div
                    key={comp.id}
                    className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 cursor-pointer transition-colors"
                    onClick={() => setActiveComponent(comp.id)}
                  >
                    <h3 className="font-semibold">{comp.label}</h3>
                    <p className="text-sm text-gray-500 mt-1">ID: {comp.id}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
