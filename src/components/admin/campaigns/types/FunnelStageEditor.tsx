// ============================================================================
// BuildBid: Funnel Stage Editor Component
// Add, edit, delete, and reorder funnel stages
// ============================================================================

'use client';

import { useState } from 'react';
import { Plus, Edit2, Trash2, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { validateFunnelStages } from '@/lib/campaigns/campaign-types';
import type { FunnelStage } from '@/lib/types/campaign-type';

interface FunnelStageEditorProps {
  stages: FunnelStage[];
  onStagesChange: (stages: FunnelStage[]) => void;
  campaignTypeId?: string; // For checking if stages have active opportunities
  appUuid?: string; // For checking opportunities
}

export function FunnelStageEditor({
  stages,
  onStagesChange,
  campaignTypeId,
  appUuid,
}: FunnelStageEditorProps) {
  const { toast } = useToast();
  const [editingStage, setEditingStage] = useState<FunnelStage | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const addNewStage = () => {
    const newStage: FunnelStage = {
      id: crypto.randomUUID(),
      name: '',
      order: stages.length + 1,
      description: '',
      expected_duration_days: undefined,
      is_success: null,
      color: '#902ed1',
    };
    setEditingStage(newStage);
    setIsAdding(true);
  };

  const editStage = (stage: FunnelStage) => {
    setEditingStage({ ...stage });
    setIsAdding(false);
  };

  const cancelEdit = () => {
    setEditingStage(null);
    setIsAdding(false);
  };

  const saveStage = () => {
    if (!editingStage) return;

    if (!editingStage.name || editingStage.name.trim() === '') {
      toast({
        title: 'Validation Error',
        description: 'Stage name is required',
        variant: 'destructive',
      });
      return;
    }

    // Validate unique name
    const existingStage = stages.find(
      (s) => s.name.toLowerCase() === editingStage.name.toLowerCase() && 
      (!editingStage.id || s.id !== editingStage.id)
    );
    if (existingStage) {
      toast({
        title: 'Validation Error',
        description: 'Stage name must be unique',
        variant: 'destructive',
      });
      return;
    }

    let updatedStages: FunnelStage[];

    if (isAdding) {
      updatedStages = [...stages, editingStage];
    } else {
      updatedStages = stages.map((s) =>
        s.id === editingStage.id ? editingStage : s
      );
    }

    // Reorder stages: in-progress first, then success (won), then fail (lost)
    // Sort: in-progress (null) -> success (true) -> fail (false)
    updatedStages.sort((a, b) => {
      // First, sort by stage type: in-progress < success < fail
      const aType = a.is_success === null ? 0 : a.is_success === true ? 1 : 2;
      const bType = b.is_success === null ? 0 : b.is_success === true ? 1 : 2;
      if (aType !== bType) return aType - bType;
      
      // Within same type, maintain existing order
      return a.order - b.order;
    });

    // Assign sequential order numbers
    updatedStages = updatedStages.map((s, index) => ({
      ...s,
      order: index + 1,
    }));

    onStagesChange(updatedStages);
    setEditingStage(null);
    setIsAdding(false);
  };

  const deleteStage = async (stage: FunnelStage) => {
    // Prevent deleting if it's the only success or fail stage
    const successStages = stages.filter((s) => s.is_success === true);
    const failStages = stages.filter((s) => s.is_success === false);

    if (stage.is_success === true && successStages.length === 1) {
      toast({
        title: 'Cannot Delete',
        description: 'Cannot delete the only success stage',
        variant: 'destructive',
      });
      return;
    }

    if (stage.is_success === false && failStages.length === 1) {
      toast({
        title: 'Cannot Delete',
        description: 'Cannot delete the only fail stage',
        variant: 'destructive',
      });
      return;
    }

    // For existing campaign types, check if stage has opportunities
    if (campaignTypeId && appUuid) {
      try {
        const { supabase } = await import('@/lib/supabase/client');
        const { count } = await supabase
          .from('campaign_opportunities')
          .select('campaigns!inner(campaign_type_id, app_uuid)', { count: 'exact', head: true })
          .eq('campaigns.campaign_type_id', campaignTypeId)
          .eq('campaigns.app_uuid', appUuid)
          .eq('current_stage_name', stage.name);

        if (count && count > 0) {
          toast({
            title: 'Cannot Delete',
            description: `Cannot delete: ${count} opportunity(ies) are in this stage`,
            variant: 'destructive',
          });
          return;
        }
      } catch (err) {
        console.error('Error checking stage opportunities:', err);
      }
    }

    if (!confirm(`Delete stage "${stage.name}"?`)) return;

    // Remove the stage and reorder
    let updatedStages = stages.filter((s) => s.id !== stage.id);
    
    // Sort: in-progress (null) -> success (true) -> fail (false)
    updatedStages.sort((a, b) => {
      const aType = a.is_success === null ? 0 : a.is_success === true ? 1 : 2;
      const bType = b.is_success === null ? 0 : b.is_success === true ? 1 : 2;
      if (aType !== bType) return aType - bType;
      return a.order - b.order;
    });
    
    // Assign sequential order numbers
    updatedStages = updatedStages.map((s, index) => ({ ...s, order: index + 1 }));

    onStagesChange(updatedStages);
  };

  const moveStage = (index: number, direction: 'up' | 'down') => {
    const sortedStages = [...stages].sort((a, b) => a.order - b.order);
    
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === sortedStages.length - 1)
    ) {
      return;
    }

    // Prevent moving end stages (won/lost) before in-progress stages
    const currentStage = sortedStages[index];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const targetStage = sortedStages[targetIndex];
    
    // Don't allow moving in-progress stages after end stages
    if (currentStage.is_success === null && targetStage.is_success !== null) {
      if (direction === 'down') return; // Can't move in-progress down past end stages
    }
    
    // Don't allow moving end stages before in-progress stages
    if (currentStage.is_success !== null && targetStage.is_success === null) {
      if (direction === 'up') return; // Can't move end stages up past in-progress
    }

    const newStages = [...sortedStages];
    [newStages[index], newStages[targetIndex]] = [
      newStages[targetIndex],
      newStages[index],
    ];

    // Re-sort to maintain proper order: in-progress -> success -> fail
    newStages.sort((a, b) => {
      const aType = a.is_success === null ? 0 : a.is_success === true ? 1 : 2;
      const bType = b.is_success === null ? 0 : b.is_success === true ? 1 : 2;
      if (aType !== bType) return aType - bType;
      return a.order - b.order;
    });

    const reordered = newStages.map((s, i) => ({ ...s, order: i + 1 }));
    onStagesChange(reordered);
  };

  const getStageTypeLabel = (isSuccess: boolean | null) => {
    if (isSuccess === true) return 'Success (Closed Won)';
    if (isSuccess === false) return 'Fail (Closed Lost)';
    return 'In Progress';
  };

  const getBadgeClass = (isSuccess: boolean | null) => {
    if (isSuccess === true) return 'bg-green-100 text-green-800 border-green-200';
    if (isSuccess === false) return 'bg-red-100 text-red-800 border-red-200';
    return 'bg-purple-100 text-purple-800 border-purple-200';
  };

  // Validate stages
  const validationErrors = validateFunnelStages(stages);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Funnel Stages</CardTitle>
          {!isAdding && !editingStage && (
            <Button onClick={addNewStage} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Stage
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm font-semibold text-yellow-800 mb-1">Validation Issues:</p>
            <ul className="text-sm text-yellow-700 list-disc list-inside">
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Add/Edit Stage Form */}
        {editingStage && (
          <Card className="border-2 border-primary">
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label>Stage Name *</Label>
                <Input
                  value={editingStage.name}
                  onChange={(e) =>
                    setEditingStage({ ...editingStage, name: e.target.value })
                  }
                  placeholder="e.g., Initial Contact"
                />
              </div>

              <div className="space-y-2">
                <Label>Stage Type *</Label>
                <Select
                  value={
                    editingStage.is_success === null
                      ? 'null'
                      : editingStage.is_success
                      ? 'true'
                      : 'false'
                  }
                  onValueChange={(value) =>
                    setEditingStage({
                      ...editingStage,
                      is_success: value === 'null' ? null : value === 'true',
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select stage type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="null">In Progress</SelectItem>
                    <SelectItem value="true">Success (Closed Won)</SelectItem>
                    <SelectItem value="false">Fail (Closed Lost)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={editingStage.description || ''}
                  onChange={(e) =>
                    setEditingStage({ ...editingStage, description: e.target.value })
                  }
                  placeholder="Brief description of this stage"
                />
              </div>

              <div className="space-y-2">
                <Label>Expected Duration (days)</Label>
                <Input
                  type="number"
                  min="1"
                  value={editingStage.expected_duration_days || ''}
                  onChange={(e) =>
                    setEditingStage({
                      ...editingStage,
                      expected_duration_days: e.target.value
                        ? parseInt(e.target.value, 10)
                        : undefined,
                    })
                  }
                  placeholder="e.g., 7"
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={saveStage} size="sm">
                  <Check className="h-4 w-4 mr-2" />
                  Save Stage
                </Button>
                <Button onClick={cancelEdit} variant="outline" size="sm">
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stage List */}
        {stages.length === 0 && !editingStage && (
          <div className="text-center py-8 text-gray-500">
            <p>No stages added yet. Click "Add Stage" to get started.</p>
          </div>
        )}

        <div className="space-y-2">
          {stages
            .sort((a, b) => a.order - b.order)
            .map((stage, index) => (
              <div
                key={stage.id || index}
                className="flex items-center gap-3 p-3 border rounded-lg bg-white"
              >
                <div className="flex items-center gap-2 flex-1">
                  <div className="text-sm font-medium text-gray-500 w-8">
                    {stage.order}.
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{stage.name}</div>
                    {stage.description && (
                      <div className="text-sm text-gray-500">{stage.description}</div>
                    )}
                  </div>
                  <Badge className={getBadgeClass(stage.is_success)} variant="outline">
                    {getStageTypeLabel(stage.is_success)}
                  </Badge>
                  {stage.expected_duration_days && (
                    <span className="text-sm text-gray-500">
                      ~{stage.expected_duration_days}d
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {index > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => moveStage(index, 'up')}
                    >
                      ↑
                    </Button>
                  )}
                  {index < stages.length - 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => moveStage(index, 'down')}
                    >
                      ↓
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editStage(stage)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteStage(stage)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
        </div>
      </CardContent>
    </Card>
  );
}

