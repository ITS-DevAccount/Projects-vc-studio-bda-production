'use client';

import { useState, useMemo } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminMenu from '@/components/admin/AdminMenu';
import { Layers, ChevronDown, ChevronUp } from 'lucide-react';

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

interface ComponentConfig {
  id: string;
  label: string;
  description: string;
  component: React.ComponentType<any>;
  expanded?: boolean;
}

// Mock data defined outside component to prevent recreation on each render
const mockDBSchema = {
  type: 'object',
  properties: {
    business_name: { type: 'string', title: 'Business Name' },
    legal_structure: { type: 'string', enum: ['Sole Trader', 'Partnership', 'Limited Company'] },
  },
  required: ['business_name']
};

const mockDBPrefill = {};
const mockDBInitialData = {};

export default function VCModelPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    display: true,
    bvs: false,
    dbs: false,
    l0: false,
    l1: false,
    l2: false,
    blueprint: false,
    badge: false,
    history: false,
    uploader: false,
  });

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth/login');
    }
  }, [loading, user, router]);

  if (loading || !user) return null;

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

  const components: ComponentConfig[] = [
    { 
      id: 'display', 
      label: 'FLM Model Display', 
      description: 'Main navigation and progress display component',
      component: FLMModelDisplay 
    },
    { 
      id: 'bvs', 
      label: 'BVS Builder', 
      description: 'Business Value Summary capture component',
      component: BVSBuilder 
    },
    { 
      id: 'dbs', 
      label: 'DBS Form', 
      description: 'Domain Business Summary dynamic form',
      component: DBSForm 
    },
    { 
      id: 'l0', 
      label: 'L0 Builder', 
      description: 'L0 Domain Definition editor',
      component: L0Builder 
    },
    { 
      id: 'l1', 
      label: 'L1 Builder', 
      description: 'L1 Pillar Definition editor',
      component: L1Builder 
    },
    { 
      id: 'l2', 
      label: 'L2 Builder', 
      description: 'L2 Capability Matrix editor',
      component: L2Builder 
    },
    { 
      id: 'blueprint', 
      label: 'Blueprint Generator', 
      description: 'Business Blueprint compilation component',
      component: BlueprintGenerator 
    },
    { 
      id: 'badge', 
      label: 'Status Badge', 
      description: 'Artefact status indicator component',
      component: ArtefactStatusBadge 
    },
    { 
      id: 'history', 
      label: 'Version History', 
      description: 'Artefact version tracking UI',
      component: ArtefactVersionHistory 
    },
    { 
      id: 'uploader', 
      label: 'Source Doc Uploader', 
      description: 'Document upload component for FLM source documents',
      component: SourceDocUploader 
    },
  ];

  function toggleComponent(componentId: string) {
    setExpanded(prev => ({
      ...prev,
      [componentId]: !prev[componentId]
    }));
  }

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
            schema={mockDBSchema}
            prefill={mockDBPrefill}
            initialData={mockDBInitialData}
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
      <AdminMenu />
      
      <main className="max-w-7xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">VC Model</h1>
          <p className="text-gray-600">Value Chain Model management and FLM components</p>
        </div>

        {/* Foundation Layer Model Card */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-8">
          <div className="p-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="flex-shrink-0">
                <Layers className="w-8 h-8 text-blue-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">Foundation Layer Model (FLM)</h2>
                <p className="text-gray-600">
                  Framework Level Mapping components for creating L0-L2 Value Chain Models through AI-assisted workflow.
                  Click on any component below to expand and view it.
                </p>
              </div>
            </div>

            {/* Component List */}
            <div className="space-y-4">
              {components.map((comp) => {
                const isExpanded = expanded[comp.id] || false;
                const Component = comp.component;

                return (
                  <div
                    key={comp.id}
                    className="border border-gray-200 rounded-lg overflow-hidden"
                  >
                    {/* Component Header - Clickable */}
                    <button
                      onClick={() => toggleComponent(comp.id)}
                      className="w-full px-6 py-4 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between text-left"
                    >
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{comp.label}</h3>
                        <p className="text-sm text-gray-600 mt-1">{comp.description}</p>
                      </div>
                      <div className="ml-4 flex-shrink-0">
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </button>

                    {/* Component Content - Expandable */}
                    {isExpanded && (
                      <div className="p-6 bg-white border-t border-gray-200">
                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                          {renderComponent(comp.id)}
                        </div>
                        
                        {/* Component Info */}
                        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-sm text-blue-800">
                            <strong>Component ID:</strong> {comp.id}
                            <br />
                            <strong>Note:</strong> These components are designed to work with real VC Model and FLM data.
                            They may show errors or placeholders without proper database context and API routes.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Info Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-2">About FLM Components</h3>
          <p className="text-sm text-blue-800 mb-4">
            The Foundation Layer Model (FLM) component suite provides a complete workflow for creating 
            machine-readable Value Chain Models through AI-assisted generation with human confirmation at each step.
          </p>
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-2">Workflow Steps:</p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li><strong>BVS (Business Value Summary):</strong> Capture natural language business description</li>
              <li><strong>DBS (Domain Business Summary):</strong> Complete structured business data form</li>
              <li><strong>L0 (Domain Study):</strong> Review and confirm domain analysis</li>
              <li><strong>L1 (Pillars):</strong> Review and confirm business pillars (3-6 sub-domains)</li>
              <li><strong>L2 (Capabilities):</strong> Review and confirm capability matrix (4-8 per pillar)</li>
              <li><strong>Blueprint:</strong> Generate final business blueprint document</li>
            </ol>
          </div>
        </div>
      </main>
    </div>
  );
}
