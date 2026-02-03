// ============================================================================
// BuildBid: OCDS Processing Queue Component
// Displays opportunities in responsive grid with Quick Insert functionality
// ============================================================================

'use client';

import { useState, useMemo, useEffect } from 'react';
import { X, CheckCircle2, XCircle, Clock, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { getCurrentAppUuid } from '@/lib/supabase/app-helpers';
import {
  checkDuplicateOpportunity,
  checkDuplicateStakeholder,
  createOrganizationStakeholder,
  createCampaignOpportunity,
  validateCampaignForOpportunities,
} from '@/lib/campaigns/ocds-processing';
import type { OCDSOpportunity } from '@/lib/types/ocds';

interface OCDSProcessingQueueProps {
  opportunities: OCDSOpportunity[];
  setOpportunities: React.Dispatch<React.SetStateAction<OCDSOpportunity[]>>;
  campaignId: string;
  onClose?: () => void;
  onClear?: () => void;
}

export function OCDSProcessingQueue({
  opportunities,
  setOpportunities,
  campaignId,
  onClear,
}: OCDSProcessingQueueProps) {
  const [appUuid, setAppUuid] = useState<string | null>(null);
  const { toast } = useToast();

  // Load app UUID
  useEffect(() => {
    const loadAppUuid = async () => {
      const uuid = await getCurrentAppUuid();
      setAppUuid(uuid);
    };
    loadAppUuid();
  }, []);

  // Computed values
  const selectedCount = useMemo(
    () => opportunities.filter((opp) => opp.selected).length,
    [opportunities]
  );
  const allSelected = useMemo(
    () => opportunities.length > 0 && opportunities.every((opp) => opp.selected),
    [opportunities]
  );

  const successCount = useMemo(
    () => opportunities.filter((opp) => opp.status === 'success').length,
    [opportunities]
  );
  const failedCount = useMemo(
    () => opportunities.filter((opp) => opp.status === 'failed').length,
    [opportunities]
  );
  const skippedCount = useMemo(
    () => opportunities.filter((opp) => opp.status === 'skipped').length,
    [opportunities]
  );
  const hasProcessed = successCount > 0 || failedCount > 0 || skippedCount > 0;

  // Helper functions
  const formatCurrency = (value: number | null): string => {
    if (!value) return 'N/A';
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'processing':
        return <Clock className="w-4 h-4 text-blue-600 animate-spin" />;
      case 'skipped':
        return <SkipForward className="w-4 h-4 text-gray-500" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status?: string): string => {
    const labels: Record<string, string> = {
      pending: 'Pending',
      processing: 'Processing...',
      success: 'Success',
      failed: 'Failed',
      skipped: 'Skipped',
    };
    return status ? (labels[status] || status) : 'Pending';
  };

  // Update opportunity status
  const updateStatus = (
    index: number,
    status: 'pending' | 'processing' | 'success' | 'failed' | 'skipped',
    error?: string
  ) => {
    setOpportunities((prev) =>
      prev.map((opp, i) => (i === index ? { ...opp, status, error: error || null } : opp))
    );
  };

  // Toggle select all
  const toggleSelectAll = () => {
    const newSelected = !allSelected;
    setOpportunities((prev) => prev.map((opp) => ({ ...opp, selected: newSelected })));
  };

  // Toggle individual selection
  const toggleSelect = (index: number) => {
    setOpportunities((prev) =>
      prev.map((opp, i) => (i === index ? { ...opp, selected: !opp.selected } : opp))
    );
  };

  // Quick Insert handler
  const handleQuickInsert = async (index: number) => {
    if (!appUuid) {
      toast({
        title: 'Error',
        description: 'Application UUID not loaded. Please refresh the page.',
        variant: 'destructive',
      });
      return;
    }

    const opp = opportunities[index];
    if (!opp) return;

    // Update status to processing
    updateStatus(index, 'processing');

    try {
      // Validation: Email required
      if (!opp.contact_email) {
        updateStatus(index, 'failed', 'Contact email is required');
        return;
      }

      // Validation: Campaign must be active and have funnel stages
      const validation = await validateCampaignForOpportunities(campaignId, appUuid);
      if (!validation.valid) {
        updateStatus(index, 'failed', validation.error || 'Campaign validation failed');
        return;
      }

      // Check for duplicate opportunity (by OCID)
      const duplicateOpp = await checkDuplicateOpportunity(campaignId, opp.ocid, appUuid);
      if (duplicateOpp) {
        updateStatus(index, 'failed', 'Opportunity with this OCID already exists');
        return;
      }

      // Check for duplicate stakeholder (by email)
      let stakeholderId: string | null = null;
      const existingStakeholder = await checkDuplicateStakeholder(opp.contact_email);
      if (existingStakeholder) {
        stakeholderId = existingStakeholder.id;
      } else {
        // Create new organization stakeholder
        stakeholderId = await createOrganizationStakeholder(opp, campaignId, appUuid);
        if (!stakeholderId) {
          updateStatus(index, 'failed', 'Failed to create stakeholder');
          return;
        }
      }

      // Create campaign opportunity
      const opportunityId = await createCampaignOpportunity(opp, campaignId, stakeholderId, appUuid);
      if (!opportunityId) {
        updateStatus(index, 'failed', 'Failed to create opportunity');
        return;
      }

      // Success
      updateStatus(index, 'success');
      toast({
        title: 'Success',
        description: `Opportunity created for ${opp.company_name}`,
      });
    } catch (error: any) {
      console.error('Quick Insert error:', error);
      updateStatus(index, 'failed', error.message || 'Failed to create opportunity');
      toast({
        title: 'Error',
        description: error.message || 'Failed to create opportunity',
        variant: 'destructive',
      });
    }
  };

  const handleBulkQuickInsert = async () => {
    if (!appUuid) {
      toast({
        title: 'Error',
        description: 'Application UUID not loaded. Please refresh the page.',
        variant: 'destructive',
      });
      return;
    }

    const selectedIndices = opportunities
      .map((opp, index) => (opp.selected && opp.status === 'pending' ? index : -1))
      .filter((idx) => idx >= 0);

    if (selectedIndices.length === 0) {
      toast({
        title: 'No Selection',
        description: 'Please select pending opportunities to process.',
        variant: 'destructive',
      });
      return;
    }

    // Process sequentially
    for (const index of selectedIndices) {
      await handleQuickInsert(index);
      // Small delay between operations to avoid overwhelming the server
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  };

  const handleRetryFailed = async () => {
    const failedIndices = opportunities
      .map((opp, index) => (opp.status === 'failed' ? index : -1))
      .filter((idx) => idx >= 0);

    if (failedIndices.length === 0) {
      toast({
        title: 'No Failed Items',
        description: 'There are no failed opportunities to retry.',
      });
      return;
    }

    // Reset failed items to pending
    setOpportunities((prev) =>
      prev.map((opp, i) =>
        failedIndices.includes(i) ? { ...opp, status: 'pending' as const, error: null } : opp
      )
    );

    // Process sequentially
    for (const index of failedIndices) {
      await handleQuickInsert(index);
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  };

  return (
    <div className="ocds-processing-queue w-full">
      <Card className="bg-white border border-gray-200 shadow-sm">
        <CardContent className="pt-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">
              OCDS Queue <span className="text-sm text-muted-foreground">({opportunities.length})</span>
            </h3>
            {onClear && (
              <Button variant="ghost" size="sm" onClick={onClear}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Bulk Actions Bar */}
          {opportunities.length > 0 && (
            <div className="space-y-3 mb-4 pb-4 border-b">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded border-primary"
                />
                <span className="text-sm">Select All</span>
              </label>

              <Button
                size="sm"
                variant="default"
                onClick={handleBulkQuickInsert}
                disabled={selectedCount === 0}
                className="w-full min-h-[44px]"
              >
                Quick Insert ({selectedCount})
              </Button>
            </div>
          )}

          {/* Opportunities Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto">
            {opportunities.map((opp, index) => (
              <Card
                key={index}
                className={`opportunity-card bg-white border border-gray-200 shadow-sm ${
                  opp.status === 'processing' ? 'opacity-75' : ''
                }`}
              >
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {/* Checkbox and Company Name */}
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={opp.selected || false}
                        onChange={() => toggleSelect(index)}
                        disabled={opp.status === 'processing'}
                        className="h-4 w-4 rounded border-primary mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{opp.company_name}</div>
                      </div>
                    </div>

                    {/* Contract Meta */}
                    <div className="text-xs text-muted-foreground">
                      {formatCurrency(opp.contract_value)} •{' '}
                      {(opp.company_size || 'Unknown').toUpperCase()}
                    </div>

                    {/* Tender Title */}
                    <div className="text-xs text-muted-foreground line-clamp-2">
                      {opp.tender_title}
                    </div>

                    {/* Contact Email */}
                    <div className="text-xs text-muted-foreground truncate">
                      {opp.contact_email || 'No email'}
                    </div>

                    {/* Action Button */}
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleQuickInsert(index)}
                      disabled={opp.status === 'processing'}
                      className="w-full min-h-[44px]"
                    >
                      Quick Insert
                    </Button>

                    {/* Status Badge */}
                    {opp.status !== 'pending' && (
                      <div className="flex items-center gap-1 text-xs pt-1">
                        {getStatusIcon(opp.status)}
                        <span>{getStatusLabel(opp.status)}</span>
                      </div>
                    )}

                    {/* Error Message */}
                    {opp.status === 'failed' && opp.error && (
                      <div className="text-xs text-red-600 mt-1">{opp.error}</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Results Summary */}
          {hasProcessed && (
            <div className="mt-4 pt-4 border-t space-y-2">
              <h4 className="text-sm font-semibold">Results</h4>
              <div className="text-xs space-y-1 text-muted-foreground">
                <div>Success: {successCount}</div>
                <div>Failed: {failedCount}</div>
                <div>Skipped: {skippedCount}</div>
              </div>

              {failedCount > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRetryFailed}
                  className="w-full mt-2 min-h-[44px]"
                >
                  Retry Failed ({failedCount})
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

