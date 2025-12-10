'use client';

import { useEffect, useState } from 'react';
import { CTAButton, PageCTAPlacement, CreatePlacementInput, PlacementSection, CTAVariant } from '@/lib/types/cta';

interface CTAPlacementsSectionProps {
  pageSettingsId: string;
}

/**
 * CTAPlacementsSection Component
 * Manage CTA button placements for a page in the page editor
 * Allows admins to add/remove CTAs from different sections
 */
// Type for RPC response format (has placement_id instead of id, and flattened button fields)
interface RPCPlacementResponse {
  id: string; // Added to match PageCTAPlacement interface
  placement_id: string;
  page_settings_id: string;
  cta_button_id: string;
  section: PlacementSection;
  sort_order: number;
  created_at: string;
  updated_at: string;
  // Flattened button fields from join
  label?: string;
  href?: string;
  variant?: CTAVariant;
  icon_name?: string;
  analytics_event?: string;
}

export function CTAPlacementsSection({ pageSettingsId }: CTAPlacementsSectionProps) {
  const [placements, setPlacements] = useState<(PageCTAPlacement | RPCPlacementResponse)[]>([]);
  const [availableCTAs, setAvailableCTAs] = useState<CTAButton[]>([]);
  const [selectedCTA, setSelectedCTA] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('hero');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch placements and available CTAs on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch app UUID (from applications table for VC_STUDIO)
        const appsRes = await fetch('/api/applications?app_code=VC_STUDIO');
        let appsData: any = null;
        if (appsRes.ok) {
          appsData = await appsRes.json();
        }

        // Fetch page placements
        const placementsRes = await fetch(
          `/api/page-settings/${pageSettingsId}/cta-placements`
        );
        const placementsData = await placementsRes.json();

        if (placementsData.success) {
          console.log('[CTA Placements] Loaded placements:', placementsData.data);
          setPlacements(placementsData.data || []);
        } else {
          setError(placementsData.error || 'Failed to load placements');
        }

        // Fetch available CTAs
        // First try to get app_uuid from applications
        const storedAppUuid = localStorage.getItem('app_uuid');
        const appUuidToUse = storedAppUuid || appsData?.data?.[0]?.id;

        if (appUuidToUse) {
          const ctasRes = await fetch(`/api/cta-buttons?app_uuid=${appUuidToUse}`);
          const ctasData = await ctasRes.json();

          if (ctasData.success) {
            setAvailableCTAs(ctasData.data || []);
          } else {
            setError(ctasData.error || 'Failed to load CTAs');
          }
        }
      } catch (err) {
        setError('Failed to load CTA data');
        console.error('[CTA Placements Fetch Error]:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [pageSettingsId]);

  // Add CTA placement
  const handleAddPlacement = async () => {
    if (!selectedCTA || !selectedSection) {
      setError('Please select a CTA and section');
      return;
    }

    try {
      console.log('[CTA Placements] Adding placement:', { selectedCTA, selectedSection, pageSettingsId });
      
      const maxSortOrder = placements
        .filter((p) => p.section === selectedSection)
        .reduce((max, p) => Math.max(max, p.sort_order), -1);

      const input: CreatePlacementInput = {
        cta_button_id: selectedCTA,
        section: selectedSection as any,
        sort_order: maxSortOrder + 1,
      };

      console.log('[CTA Placements] Request payload:', input);

      const res = await fetch(`/api/page-settings/${pageSettingsId}/cta-placements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      const data = await res.json();
      console.log('[CTA Placements] API Response:', data);

      if (data.success) {
        // Refetch placements to ensure we have the latest data with button details
        const refreshRes = await fetch(`/api/page-settings/${pageSettingsId}/cta-placements`);
        const refreshData = await refreshRes.json();
        
        if (refreshData.success) {
          setPlacements(refreshData.data || []);
        } else {
          // Fallback to adding the returned data
          setPlacements([...placements, data.data]);
        }
        
        setSelectedCTA('');
        setError(null);
      } else {
        setError(data.error || 'Failed to add placement');
        console.error('[CTA Placements] API Error:', data.error);
      }
    } catch (err) {
      setError('Failed to add placement');
      console.error('[Add Placement Error]:', err);
    }
  };

  // Remove CTA placement
  const handleRemovePlacement = async (placementId: string) => {
    if (!confirm('Remove this CTA from the page?')) return;

    try {
      console.log('[CTA Placements] Removing placement:', placementId);
      const res = await fetch(
        `/api/page-settings/${pageSettingsId}/cta-placements/${placementId}`,
        {
          method: 'DELETE',
        }
      );

      const data = await res.json();
      console.log('[CTA Placements] Remove API Response:', data);

      if (data.success) {
        // Refetch placements to ensure we have the latest data
        try {
          const refreshRes = await fetch(`/api/page-settings/${pageSettingsId}/cta-placements`);
          const refreshData = await refreshRes.json();
          console.log('[CTA Placements] Refetch after delete:', refreshData);
          
          if (refreshData.success) {
            setPlacements(refreshData.data || []);
            console.log('[CTA Placements] Updated placements count:', refreshData.data?.length || 0);
          } else {
            console.error('[CTA Placements] Refetch failed:', refreshData.error);
            // Fallback: filter using both id and placement_id
            setPlacements(placements.filter((p) => {
              const pId = p.id || (p as any).placement_id;
              return pId !== placementId;
            }));
          }
        } catch (refreshErr) {
          console.error('[CTA Placements] Refetch error:', refreshErr);
          // Fallback: filter using both id and placement_id
          setPlacements(placements.filter((p) => {
            const pId = p.id || (p as any).placement_id;
            return pId !== placementId;
          }));
        }
        setError(null);
      } else {
        setError(data.error || 'Failed to remove placement');
        console.error('[CTA Placements] Remove API Error:', data.error);
      }
    } catch (err) {
      setError('Failed to remove placement');
      console.error('[Remove Placement Error]:', err);
    }
  };

  if (loading) {
    return <div className="animate-pulse h-32 bg-gray-200 rounded" />;
  }

  return (
    <div className="mt-8 p-6 border rounded-lg bg-white shadow-sm">
      <h3 className="text-xl font-semibold mb-4">CTA Button Placements</h3>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded border border-red-300">
          {error}
        </div>
      )}

      {/* Add CTA Section */}
      <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded">
        <h4 className="font-medium mb-3">Add CTA Button to Page</h4>
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={selectedCTA}
            onChange={(e) => setSelectedCTA(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select CTA Button</option>
            {availableCTAs.map((cta) => (
              <option key={cta.id} value={cta.id}>
                {cta.label} ({cta.variant})
              </option>
            ))}
          </select>

          <select
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="hero">Hero</option>
            <option value="body">Body</option>
            <option value="footer">Footer</option>
            <option value="sidebar">Sidebar</option>
            <option value="custom">Custom</option>
          </select>

          <button
            onClick={handleAddPlacement}
            disabled={!selectedCTA}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Add to Page
          </button>
        </div>
      </div>

      {/* Placements List */}
      <div className="bg-white border border-gray-200 rounded overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h4 className="font-medium">Current Placements</h4>
        </div>
        {(() => {
          // Filter valid placements
          const validPlacements = placements.filter((p) => {
            const placementId = p?.id || (p as any)?.placement_id;
            if (!p || !placementId) {
              console.warn('[CTA Placements] Placement missing ID:', p);
              return false;
            }
            return true;
          });

          console.log('[CTA Placements] Render - Total placements:', placements.length, 'Valid placements:', validPlacements.length);
          console.log('[CTA Placements] Render - Placements data:', JSON.stringify(placements, null, 2));
          console.log('[CTA Placements] Render - Valid placements:', JSON.stringify(validPlacements, null, 2));
          console.log('[CTA Placements] Render - Available CTAs:', availableCTAs.length);

          if (validPlacements.length === 0) {
            return (
              <div className="p-6 text-center text-gray-500">
                No CTA buttons assigned to this page yet.
                <br />
                <span className="text-sm">
                  Add CTAs using the form above to display them on your page.
                </span>
              </div>
            );
          }

          return (
            <div className="divide-y divide-gray-200">
              {validPlacements.map((placement, index) => {
                try {
                  // Handle both 'id' and 'placement_id' field names
                  const placementId = placement.id || (placement as any).placement_id;
                  const cta = availableCTAs.find((c) => c.id === placement.cta_button_id);
                  
                  // Use label from RPC response if available (flattened structure)
                  const displayLabel = cta?.label || (placement as any).label || 'Unknown CTA';
                  const displayHref = cta?.href || (placement as any).href;
                  const section = placement.section || (placement as any).section || 'unknown';
                  const sortOrder = placement.sort_order ?? (placement as any).sort_order ?? 0;
                  
                  console.log(`[CTA Placements] Rendering placement ${index}:`, {
                    placementId,
                    section,
                    sortOrder,
                    displayLabel,
                    displayHref,
                    ctaFound: !!cta
                  });
                  
                  if (!placementId) {
                    console.error('[CTA Placements] Missing placementId in render:', placement);
                    return null;
                  }
                  
                  return (
                    <div key={placementId} className="p-4 flex justify-between items-center border-b border-gray-200">
                      <div>
                        <p className="font-medium text-gray-900">{displayLabel}</p>
                        <p className="text-sm text-gray-500">
                          Section: <span className="font-mono">{section}</span> • Sort
                          Order: {sortOrder}
                        </p>
                        {displayHref && (
                          <p className="text-xs text-gray-400 mt-1">
                            → {displayHref}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemovePlacement(placementId)}
                        className="px-3 py-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  );
                } catch (error) {
                  console.error(`[CTA Placements] Error rendering placement ${index}:`, error, placement);
                  return (
                    <div key={`error-${index}`} className="p-4 text-red-600 border-b border-gray-200">
                      Error rendering placement: {error instanceof Error ? error.message : String(error)}
                    </div>
                  );
                }
              })}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
