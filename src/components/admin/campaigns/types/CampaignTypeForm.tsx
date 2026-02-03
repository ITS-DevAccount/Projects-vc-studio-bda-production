// ============================================================================
// BuildBid: Campaign Type Form Component
// Reusable form for creating and editing campaign types
// ============================================================================

'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CampaignTypeFormData, Role, Stakeholder } from '@/lib/types/campaign-type';

interface CampaignTypeFormProps {
  formData: CampaignTypeFormData;
  onFormDataChange: (data: CampaignTypeFormData) => void;
  roles: Role[];
  stakeholders: Stakeholder[];
  currentStakeholderId: string;
  errors?: Record<string, string>;
}

export function CampaignTypeForm({
  formData,
  onFormDataChange,
  roles,
  stakeholders,
  currentStakeholderId,
  errors = {},
}: CampaignTypeFormProps) {
  const updateField = (field: keyof CampaignTypeFormData, value: any) => {
    onFormDataChange({ ...formData, [field]: value });
  };

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              Campaign Type Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="e.g., Award Winners Campaign"
              className={errors.name ? 'border-destructive' : ''}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="code">
              Code <span className="text-destructive">*</span>
            </Label>
            <Input
              id="code"
              value={formData.code}
              onChange={(e) => updateField('code', e.target.value.toUpperCase().replace(/[^A-Z_]/g, ''))}
              placeholder="e.g., AWARD_WINNERS"
              className={errors.code ? 'border-destructive' : ''}
            />
            {errors.code && (
              <p className="text-sm text-destructive">{errors.code}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Uppercase letters and underscores only
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={3}
              value={formData.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Brief explanation of this campaign type's purpose"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="owner_id">Owner</Label>
            <Select
              value={formData.owner_id}
              onValueChange={(value) => updateField('owner_id', value)}
            >
              <SelectTrigger id="owner_id">
                <SelectValue placeholder="Select owner" />
              </SelectTrigger>
              <SelectContent>
                {stakeholders.map((stakeholder) => (
                  <SelectItem key={stakeholder.id} value={stakeholder.id}>
                    {stakeholder.name}
                    {stakeholder.id === currentStakeholderId && ' (You)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Role Restrictions */}
      <Card>
        <CardHeader>
          <CardTitle>Role Restrictions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isRoleSpecific"
              checked={formData.is_role_specific || false}
              onChange={(e) => {
                const newValue = e.target.checked;
                onFormDataChange({
                  ...formData,
                  is_role_specific: newValue,
                  role_uuid: newValue ? formData.role_uuid : null,
                });
              }}
              className="w-4 h-4 rounded border-gray-300 cursor-pointer"
            />
            <Label htmlFor="isRoleSpecific" className="font-normal cursor-pointer">
              Restrict to specific role
            </Label>
          </div>

          {formData.is_role_specific && (
            <div className="space-y-2">
              <Label htmlFor="role_uuid">
                Select Role <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.role_uuid || ''}
                onValueChange={(value) => updateField('role_uuid', value)}
              >
                <SelectTrigger id="role_uuid" className={errors.role_uuid ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Choose a role..." />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.role_uuid && (
                <p className="text-sm text-destructive">{errors.role_uuid}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Only stakeholders with this role can use this campaign type
              </p>
            </div>
          )}

          {!formData.is_role_specific && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                This campaign type will be available to all roles in the application.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

