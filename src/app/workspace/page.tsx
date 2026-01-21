'use client';

import { useState } from 'react';
import { WorkspaceList } from '@/components/workspace/WorkspaceList';
import { WorkspaceCreationWizard } from '@/components/workspace/WorkspaceCreationWizard';
import { WorkspaceProvider } from '@/contexts/WorkspaceContext';

export default function WorkspacePage() {
  const [showCreateWizard, setShowCreateWizard] = useState(false);

  function handleWorkspaceCreated(workspaceId: string) {
    // Navigate to the newly created workspace
    window.location.href = `/workspace/${workspaceId}`;
  }

  return (
    <WorkspaceProvider>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <WorkspaceList
            onCreateClick={() => setShowCreateWizard(true)}
            onWorkspaceClick={(id) => (window.location.href = `/workspace/${id}`)}
          />

          <WorkspaceCreationWizard
            open={showCreateWizard}
            onClose={() => setShowCreateWizard(false)}
            onSuccess={handleWorkspaceCreated}
          />
        </div>
      </div>
    </WorkspaceProvider>
  );
}
