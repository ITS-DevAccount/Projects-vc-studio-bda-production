// ============================================================================
// BuildBid: Metadata Editor Component
// Tabbed interface for managing campaign type metadata configuration
// ============================================================================

'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { calculateFactorTotal } from '@/lib/campaigns/campaign-types';
import type { CampaignTypeMetadata, CustomField, Role } from '@/lib/types/campaign-type';

interface MetadataEditorProps {
  metadata: CampaignTypeMetadata;
  onMetadataChange: (metadata: CampaignTypeMetadata) => void;
  roles: Role[];
  failStages: Array<{ name: string }>; // For auto-advance dropdown
}

const TABS = [
  { id: 'automation', label: 'Automation' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'defaults', label: 'Defaults' },
  { id: 'custom_fields', label: 'Custom Fields' },
  { id: 'integrations', label: 'Integrations' },
  { id: 'scoring', label: 'Scoring' },
  { id: 'validation', label: 'Validation' },
  { id: 'ui', label: 'UI Preferences' },
];

export function MetadataEditor({
  metadata,
  onMetadataChange,
  roles,
  failStages,
}: MetadataEditorProps) {
  const [activeTab, setActiveTab] = useState('automation');

  const updateNestedMetadata = (section: string, field: string, value: any) => {
    const newMetadata = { ...metadata };
    if (!newMetadata[section as keyof CampaignTypeMetadata]) {
      newMetadata[section as keyof CampaignTypeMetadata] = {} as any;
    }
    (newMetadata[section as keyof CampaignTypeMetadata] as any)[field] = value;
    onMetadataChange(newMetadata);
  };

  const addCustomField = () => {
    const newMetadata = { ...metadata };
    if (!newMetadata.custom_fields) {
      newMetadata.custom_fields = [];
    }
    newMetadata.custom_fields.push({
      name: '',
      label: '',
      type: 'text',
      required: false,
    });
    onMetadataChange(newMetadata);
  };

  const removeCustomField = (index: number) => {
    const newMetadata = { ...metadata };
    if (newMetadata.custom_fields) {
      newMetadata.custom_fields.splice(index, 1);
      onMetadataChange(newMetadata);
    }
  };

  const updateCustomField = (index: number, field: keyof CustomField, value: any) => {
    const newMetadata = { ...metadata };
    if (newMetadata.custom_fields && newMetadata.custom_fields[index]) {
      newMetadata.custom_fields[index] = {
        ...newMetadata.custom_fields[index],
        [field]: value,
      };
      onMetadataChange(newMetadata);
    }
  };

  const factorTotal = metadata.scoring
    ? calculateFactorTotal(metadata.scoring.factors)
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Metadata Configuration</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 mb-6 border-b">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="min-h-[400px]">
          {/* Automation Tab */}
          {activeTab === 'automation' && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="autoAdvanceEnabled"
                  checked={metadata.automation?.auto_advance_enabled || false}
                  onChange={(e) =>
                    updateNestedMetadata('automation', 'auto_advance_enabled', e.target.checked)
                  }
                  className="w-4 h-4 rounded border-gray-300"
                />
                <Label htmlFor="autoAdvanceEnabled" className="font-normal cursor-pointer">
                  Enable auto-advance after inactivity
                </Label>
              </div>

              {metadata.automation?.auto_advance_enabled && (
                <>
                  <div className="space-y-2">
                    <Label>Days before auto-advance</Label>
                    <Input
                      type="number"
                      min="1"
                      value={metadata.automation?.auto_advance_days || 14}
                      onChange={(e) =>
                        updateNestedMetadata(
                          'automation',
                          'auto_advance_days',
                          parseInt(e.target.value, 10)
                        )
                      }
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="notifyBeforeAdvance"
                      checked={metadata.automation?.notify_before_advance || false}
                      onChange={(e) =>
                        updateNestedMetadata('automation', 'notify_before_advance', e.target.checked)
                      }
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <Label htmlFor="notifyBeforeAdvance" className="font-normal cursor-pointer">
                      Send notification before auto-advance
                    </Label>
                  </div>

                  <div className="space-y-2">
                    <Label>Auto-advance to stage</Label>
                    <Select
                      value={metadata.automation?.advance_to_stage || ''}
                      onValueChange={(value) =>
                        updateNestedMetadata('automation', 'advance_to_stage', value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose stage..." />
                      </SelectTrigger>
                      <SelectContent>
                        {failStages.map((stage) => (
                          <SelectItem key={stage.name} value={stage.name}>
                            {stage.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Usually "Closed Lost" or similar fail stage
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="onNewOpportunity"
                  checked={metadata.notifications?.on_new_opportunity ?? true}
                  onChange={(e) =>
                    updateNestedMetadata('notifications', 'on_new_opportunity', e.target.checked)
                  }
                  className="w-4 h-4 rounded border-gray-300"
                />
                <Label htmlFor="onNewOpportunity" className="font-normal cursor-pointer">
                  Notify on new opportunity created
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="onStageChange"
                  checked={metadata.notifications?.on_stage_change ?? true}
                  onChange={(e) =>
                    updateNestedMetadata('notifications', 'on_stage_change', e.target.checked)
                  }
                  className="w-4 h-4 rounded border-gray-300"
                />
                <Label htmlFor="onStageChange" className="font-normal cursor-pointer">
                  Notify on stage change
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="onClosedWon"
                  checked={metadata.notifications?.on_closed_won ?? true}
                  onChange={(e) =>
                    updateNestedMetadata('notifications', 'on_closed_won', e.target.checked)
                  }
                  className="w-4 h-4 rounded border-gray-300"
                />
                <Label htmlFor="onClosedWon" className="font-normal cursor-pointer">
                  Notify on closed won
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="onClosedLost"
                  checked={metadata.notifications?.on_closed_lost || false}
                  onChange={(e) =>
                    updateNestedMetadata('notifications', 'on_closed_lost', e.target.checked)
                  }
                  className="w-4 h-4 rounded border-gray-300"
                />
                <Label htmlFor="onClosedLost" className="font-normal cursor-pointer">
                  Notify on closed lost
                </Label>
              </div>

              <div className="space-y-2">
                <Label>Notification recipients (by role)</Label>
                <div className="space-y-2 max-h-40 overflow-y-auto border rounded p-2">
                  {roles.map((role) => {
                    const isSelected =
                      metadata.notifications?.recipients?.includes(role.code) || false;
                    return (
                      <div key={role.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`role-${role.id}`}
                          checked={isSelected}
                          onChange={(e) => {
                            const recipients = metadata.notifications?.recipients || [];
                            const newRecipients = e.target.checked
                              ? [...recipients, role.code]
                              : recipients.filter((r) => r !== role.code);
                            updateNestedMetadata('notifications', 'recipients', newRecipients);
                          }}
                          className="w-4 h-4 rounded border-gray-300"
                        />
                        <Label
                          htmlFor={`role-${role.id}`}
                          className="font-normal cursor-pointer text-sm"
                        >
                          {role.label}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Email template ID (optional)</Label>
                <Input
                  type="text"
                  placeholder="e.g., template_123abc"
                  value={metadata.notifications?.email_template_id || ''}
                  onChange={(e) =>
                    updateNestedMetadata(
                      'notifications',
                      'email_template_id',
                      e.target.value || null
                    )
                  }
                />
              </div>
            </div>
          )}

          {/* Defaults Tab */}
          {activeTab === 'defaults' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Default engagement level</Label>
                <Select
                  value={metadata.defaults?.engagement_level || 'warm'}
                  onValueChange={(value) =>
                    updateNestedMetadata('defaults', 'engagement_level', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cold">Cold</SelectItem>
                    <SelectItem value="warm">Warm</SelectItem>
                    <SelectItem value="hot">Hot</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Initial interaction type</Label>
                <Select
                  value={metadata.defaults?.initial_interaction || 'email'}
                  onValueChange={(value) =>
                    updateNestedMetadata('defaults', 'initial_interaction', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="call">Phone Call</SelectItem>
                    <SelectItem value="message">Message</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Target response time (hours)</Label>
                <Input
                  type="number"
                  min="1"
                  value={metadata.defaults?.target_response_hours || 48}
                  onChange={(e) =>
                    updateNestedMetadata(
                      'defaults',
                      'target_response_hours',
                      parseInt(e.target.value, 10)
                    )
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Default owner role</Label>
                <Select
                  value={metadata.defaults?.default_owner_role || 'none'}
                  onValueChange={(value) =>
                    updateNestedMetadata('defaults', 'default_owner_role', value === 'none' ? '' : value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose role..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {roles.map((role) => (
                      <SelectItem key={role.code} value={role.code}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Opportunities will be assigned to stakeholders with this role by default
                </p>
              </div>
            </div>
          )}

          {/* Custom Fields Tab */}
          {activeTab === 'custom_fields' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Define additional fields specific to this campaign type. These will appear in
                opportunity forms.
              </p>

              <div className="space-y-4">
                {(metadata.custom_fields || []).map((field, index) => (
                  <Card key={index} className="border">
                    <CardContent className="pt-6 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Field name (code)</Label>
                          <Input
                            value={field.name}
                            onChange={(e) =>
                              updateCustomField(index, 'name', e.target.value)
                            }
                            placeholder="contract_value"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Field label</Label>
                          <Input
                            value={field.label}
                            onChange={(e) =>
                              updateCustomField(index, 'label', e.target.value)
                            }
                            placeholder="Contract Value"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Field type</Label>
                          <Select
                            value={field.type}
                            onValueChange={(value) =>
                              updateCustomField(index, 'type', value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">Text</SelectItem>
                              <SelectItem value="number">Number</SelectItem>
                              <SelectItem value="currency">Currency</SelectItem>
                              <SelectItem value="date">Date</SelectItem>
                              <SelectItem value="boolean">Yes/No</SelectItem>
                              <SelectItem value="select">Dropdown</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center space-x-2 pt-8">
                          <input
                            type="checkbox"
                            id={`required-${index}`}
                            checked={field.required}
                            onChange={(e) =>
                              updateCustomField(index, 'required', e.target.checked)
                            }
                            className="w-4 h-4 rounded border-gray-300"
                          />
                          <Label htmlFor={`required-${index}`} className="font-normal cursor-pointer">
                            Required
                          </Label>
                        </div>
                      </div>

                      {field.type === 'select' && (
                        <div className="space-y-2">
                          <Label>Dropdown options (comma-separated)</Label>
                          <Input
                            value={field.options?.join(', ') || ''}
                            onChange={(e) =>
                              updateCustomField(
                                index,
                                'options',
                                e.target.value.split(',').map((o) => o.trim())
                              )
                            }
                            placeholder="Option 1, Option 2, Option 3"
                          />
                        </div>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeCustomField(index)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove Field
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Button variant="outline" onClick={addCustomField}>
                <Plus className="h-4 w-4 mr-2" />
                Add Custom Field
              </Button>
            </div>
          )}

          {/* Integrations Tab */}
          {activeTab === 'integrations' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Webhook URL (on opportunity created)</Label>
                <Input
                  type="url"
                  placeholder="https://your-system.com/webhook"
                  value={metadata.integrations?.webhook_url || ''}
                  onChange={(e) =>
                    updateNestedMetadata('integrations', 'webhook_url', e.target.value || null)
                  }
                />
                <p className="text-xs text-muted-foreground">
                  POST request sent when new opportunity is created
                </p>
              </div>

              <div className="space-y-2">
                <Label>CRM sync endpoint</Label>
                <Input
                  type="url"
                  placeholder="https://your-crm.com/api/sync"
                  value={metadata.integrations?.crm_sync_url || ''}
                  onChange={(e) =>
                    updateNestedMetadata('integrations', 'crm_sync_url', e.target.value || null)
                  }
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="syncEnabled"
                  checked={metadata.integrations?.sync_enabled || false}
                  onChange={(e) =>
                    updateNestedMetadata('integrations', 'sync_enabled', e.target.checked)
                  }
                  className="w-4 h-4 rounded border-gray-300"
                />
                <Label htmlFor="syncEnabled" className="font-normal cursor-pointer">
                  Enable real-time CRM sync
                </Label>
              </div>

              {metadata.integrations?.sync_enabled && (
                <div className="space-y-2">
                  <Label>Sync fields (comma-separated)</Label>
                  <Input
                    type="text"
                    placeholder="name, email, status, stage"
                    value={metadata.integrations?.sync_fields?.join(', ') || ''}
                    onChange={(e) =>
                      updateNestedMetadata(
                        'integrations',
                        'sync_fields',
                        e.target.value.split(',').map((f) => f.trim())
                      )
                    }
                  />
                </div>
              )}
            </div>
          )}

          {/* Scoring Tab */}
          {activeTab === 'scoring' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Warm lead multiplier</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="1"
                  value={metadata.scoring?.warm_multiplier || 1.5}
                  onChange={(e) =>
                    updateNestedMetadata(
                      'scoring',
                      'warm_multiplier',
                      parseFloat(e.target.value)
                    )
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Score boost for warm leads (default: 1.5x)
                </p>
              </div>

              <div className="space-y-2">
                <Label>Hot lead multiplier</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="1"
                  value={metadata.scoring?.hot_multiplier || 2.0}
                  onChange={(e) =>
                    updateNestedMetadata('scoring', 'hot_multiplier', parseFloat(e.target.value))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Score boost for hot leads (default: 2.0x)
                </p>
              </div>

              <div className="space-y-2">
                <Label>Minimum qualification score</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={metadata.scoring?.min_qualification_score || 50}
                  onChange={(e) =>
                    updateNestedMetadata(
                      'scoring',
                      'min_qualification_score',
                      parseInt(e.target.value, 10)
                    )
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Opportunities below this score are considered unqualified
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="autoQualify"
                  checked={metadata.scoring?.auto_qualify_enabled || false}
                  onChange={(e) =>
                    updateNestedMetadata('scoring', 'auto_qualify_enabled', e.target.checked)
                  }
                  className="w-4 h-4 rounded border-gray-300"
                />
                <Label htmlFor="autoQualify" className="font-normal cursor-pointer">
                  Automatically mark high-scoring leads as qualified
                </Label>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <Label>Scoring factors (must total 1.0)</Label>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Contract value weight</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="1"
                      value={metadata.scoring?.factors?.contract_value_weight || 0.4}
                      onChange={(e) =>
                        updateNestedMetadata(
                          'scoring',
                          'factors',
                          {
                            ...metadata.scoring?.factors,
                            contract_value_weight: parseFloat(e.target.value),
                          }
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Response speed weight</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="1"
                      value={metadata.scoring?.factors?.response_speed_weight || 0.3}
                      onChange={(e) =>
                        updateNestedMetadata(
                          'scoring',
                          'factors',
                          {
                            ...metadata.scoring?.factors,
                            response_speed_weight: parseFloat(e.target.value),
                          }
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Engagement weight</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="1"
                      value={metadata.scoring?.factors?.engagement_weight || 0.3}
                      onChange={(e) =>
                        updateNestedMetadata(
                          'scoring',
                          'factors',
                          {
                            ...metadata.scoring?.factors,
                            engagement_weight: parseFloat(e.target.value),
                          }
                        )
                      }
                    />
                  </div>
                </div>
                <div className={`text-sm font-medium ${
                  Math.abs(factorTotal - 1.0) > 0.01 ? 'text-destructive' : 'text-green-600'
                }`}>
                  Total: {factorTotal.toFixed(2)}
                  {Math.abs(factorTotal - 1.0) > 0.01 && (
                    <span className="ml-2">Must equal 1.0</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Validation Tab */}
          {activeTab === 'validation' && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="requireNotes"
                  checked={metadata.validation?.require_notes_on_stage_change || false}
                  onChange={(e) =>
                    updateNestedMetadata('validation', 'require_notes_on_stage_change', e.target.checked)
                  }
                  className="w-4 h-4 rounded border-gray-300"
                />
                <Label htmlFor="requireNotes" className="font-normal cursor-pointer">
                  Require notes when changing stage
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="requireInteraction"
                  checked={metadata.validation?.require_interaction_before_advance || false}
                  onChange={(e) =>
                    updateNestedMetadata('validation', 'require_interaction_before_advance', e.target.checked)
                  }
                  className="w-4 h-4 rounded border-gray-300"
                />
                <Label htmlFor="requireInteraction" className="font-normal cursor-pointer">
                  Require at least one interaction before advancing
                </Label>
              </div>

              <div className="space-y-2">
                <Label>Minimum interactions before close</Label>
                <Input
                  type="number"
                  min="0"
                  value={metadata.validation?.min_interactions_before_close || 0}
                  onChange={(e) =>
                    updateNestedMetadata(
                      'validation',
                      'min_interactions_before_close',
                      parseInt(e.target.value, 10)
                    )
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Prevent closing opportunities without sufficient engagement
                </p>
              </div>
            </div>
          )}

          {/* UI Preferences Tab */}
          {activeTab === 'ui' && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="showValue"
                  checked={metadata.ui?.show_value_in_list ?? true}
                  onChange={(e) =>
                    updateNestedMetadata('ui', 'show_value_in_list', e.target.checked)
                  }
                  className="w-4 h-4 rounded border-gray-300"
                />
                <Label htmlFor="showValue" className="font-normal cursor-pointer">
                  Show opportunity value in list views
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="showDuration"
                  checked={metadata.ui?.show_duration_in_list ?? true}
                  onChange={(e) =>
                    updateNestedMetadata('ui', 'show_duration_in_list', e.target.checked)
                  }
                  className="w-4 h-4 rounded border-gray-300"
                />
                <Label htmlFor="showDuration" className="font-normal cursor-pointer">
                  Show time in current stage in list views
                </Label>
              </div>

              <div className="space-y-2">
                <Label>Default sort field</Label>
                <Select
                  value={metadata.ui?.default_sort || 'created_at'}
                  onValueChange={(value) => updateNestedMetadata('ui', 'default_sort', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="created_at">Created date</SelectItem>
                    <SelectItem value="updated_at">Updated date</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="score">Lead score</SelectItem>
                    <SelectItem value="value">Opportunity value</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Default sort order</Label>
                <Select
                  value={metadata.ui?.default_sort_order || 'desc'}
                  onValueChange={(value) => updateNestedMetadata('ui', 'default_sort_order', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">Ascending (oldest first)</SelectItem>
                    <SelectItem value="desc">Descending (newest first)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

