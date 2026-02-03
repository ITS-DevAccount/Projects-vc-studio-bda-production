'use client';

import { useEffect, useState } from 'react';

export default function CollaborationPage() {
  const [ownedModels, setOwnedModels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCollaborationData();
  }, []);

  const fetchCollaborationData = async () => {
    try {
      setLoading(true);
      // Fetch VC Models for the current user
      const response = await fetch('/api/vc-models');
      if (response.ok) {
        const { data } = await response.json();
        
        setOwnedModels(data || []);
      }
    } catch (error) {
      console.error('Error fetching collaboration data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="h-32 bg-gray-200 rounded mb-4"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">VC Models</h1>
      
      <div className="grid grid-cols-1 gap-6 mb-8">
        <div className="border rounded-lg p-6 bg-white">
          <h2 className="text-lg font-semibold mb-4">My VC Models</h2>
          <p className="text-sm text-gray-600 mb-4">
            VC Models in your workspace ({ownedModels.length})
          </p>
          
          {ownedModels.length === 0 ? (
            <p className="text-gray-500 text-sm italic">No owned models yet</p>
          ) : (
            <div className="space-y-2">
              {ownedModels.map((model: any) => (
                <div key={model.id} className="border rounded p-3 hover:bg-gray-50">
                  <div className="font-medium">{model.model_name}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold mb-2">Sharing</h3>
        <p className="text-sm text-gray-700">
          Team collaboration is being redesigned. This area will be updated with the new workflow.
        </p>
      </div>
    </div>
  );
}
