// ============================================================================
// BuildBid: Clone Campaign Type Page
// Admin-only page for cloning campaign types with role assignment
// ============================================================================

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { supabase } from '@/lib/supabase/client';
import { getCurrentAppUuid } from '@/lib/supabase/app-helpers';
import { getCampaignTypeById } from '@/lib/campaigns/campaign-types';
import Link from 'next/link';
import { ArrowLeft, Loader2, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { CampaignType, Role } from '@/lib/types/campaign-type';

interface CloneSettings {
  funnel_stages: boolean;
  metadata: boolean;
  auto_advance: boolean;
}

export default function CloneCampaignTypePage() {
  const router = useRouter();
  const params = useParams();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [appUuid, setAppUuid] = useState<string | null>(null);
  const [currentStakeholderId, setCurrentStakeholderId] = useState<string>('');
  const [sourceCampaignType, setSourceCampaignType] = useState<CampaignType | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);

  const campaignTypeId = params?.id as string;

  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [makeRoleSpecific, setMakeRoleSpecific] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [cloneSettings, setCloneSettings] = useState<CloneSettings>({
    funnel_stages: true,
    metadata: true,
    auto_advance: true,
  });

  useEffect(() => {
    const checkAccessAndLoadData = async () => {
      if (authLoading || !user || !campaignTypeId) return;

      try {
        const currentAppUuid = await getCurrentAppUuid();
        if (!currentAppUuid) {
          setLoadingData(false);
          return;
        }
        setAppUuid(currentAppUuid);

        // Check admin permission
        const { data: stakeholder } = await supabase
          .from('stakeholders')
          .select(`
            id,
            stakeholder_roles!inner(
              roles:role_id(code)
            )
          `)
          .eq('auth_user_id', user.id)
          .single();

        if (!stakeholder) {
          setHasPermission(false);
          router.push('/dashboard');
          return;
        }

        const hasAdminRole = stakeholder.stakeholder_roles?.some(
          (sr: any) => {
            const roleCode = sr.roles?.code?.toLowerCase();
            return roleCode === 'administrator' || roleCode === 'admin' || roleCode === 'campaign_admin';
          }
        );

        if (!hasAdminRole) {
          setHasPermission(false);
          router.push('/dashboard');
          return;
        }

        setHasPermission(true);
        setCurrentStakeholderId(stakeholder.id);

        // Load roles (server-side) with app_uuid filtering
        const { data: rolesData } = await supabase
          .from('roles')
          .select('id, code, label, description')
          .eq('app_uuid', currentAppUuid)
          .eq('is_active', true)
          .order('label');

        setRoles(rolesData || []);

        // Load source campaign type
        const type = await getCampaignTypeById(campaignTypeId, currentAppUuid);
        setSourceCampaignType(type);

        // Set default values
        setNewName(`${type.name} (Copy)`);
        setNewCode(`${type.code}_COPY`);
      } catch (err: any) {
        console.error('Error loading data:', err);
        toast({
          title: 'Error',
          description: err.message || 'Failed to load campaign type',
          variant: 'destructive',
        });
        router.push('/dashboard/admin/campaigns/types');
      } finally {
        setLoadingData(false);
      }
    };

    checkAccessAndLoadData();
  }, [authLoading, user, campaignTypeId, router, toast]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/auth/login');
    }
  }, [authLoading, user, router]);

  const performClone = async () => {
    if (!newName || !newCode) {
      toast({
        title: 'Validation Error',
        description: 'Name and code are required',
        variant: 'destructive',
      });
      return;
    }

    if (makeRoleSpecific && !selectedRole) {
      toast({
        title: 'Validation Error',
        description: 'Please select a role',
        variant: 'destructive',
      });
      return;
    }

    if (!appUuid || !sourceCampaignType) {
      toast({
        title: 'Error',
        description: 'Missing required data',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const clonedType = {
        code: newCode.toUpperCase(),
        name: newName.trim(),
        description: sourceCampaignType.description,
        app_uuid: appUuid,
        role_uuid: makeRoleSpecific ? selectedRole : null,
        is_role_specific: makeRoleSpecific,
        funnel_stages: cloneSettings.funnel_stages
          ? sourceCampaignType.funnel_stages
          : { stages: [] },
        auto_advance_enabled: cloneSettings.auto_advance
          ? sourceCampaignType.auto_advance_enabled
          : false,
        auto_advance_days: cloneSettings.auto_advance
          ? sourceCampaignType.auto_advance_days
          : null,
        metadata: cloneSettings.metadata ? sourceCampaignType.metadata : {},
        is_active: true,
        cloned_from_id: sourceCampaignType.id,
        owner_id: currentStakeholderId,
      };

      const { data, error } = await supabase
        .from('campaign_types')
        .insert([clonedType])
        .select()
        .single();

      if (error) {
        throw error;
      }

      toast({
        title: 'Success',
        description: `Campaign type "${newName}" created successfully`,
      });

      router.push(`/dashboard/admin/campaigns/types/${data.id}/edit`);
    } catch (err: any) {
      console.error('Error cloning campaign type:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to clone campaign type',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loadingData || hasPermission === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (hasPermission === false || !sourceCampaignType) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 h-16">
            <Link
              href="/dashboard/admin/campaigns/types"
              className="hover:text-primary transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Clone Campaign Type</h1>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Clone Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Source Info */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <Label className="text-sm font-semibold text-purple-900">Cloning from:</Label>
              <div className="mt-2">
                <p className="font-medium text-purple-900">{sourceCampaignType.name}</p>
                <p className="text-sm text-purple-700">
                  {sourceCampaignType.is_role_specific && sourceCampaignType.role
                    ? `Role-Specific (${sourceCampaignType.role.label})`
                    : 'General'}
                </p>
              </div>
            </div>

            {/* New Campaign Type Info */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newName">
                  New Campaign Type Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="newName"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder={`${sourceCampaignType.name} (Copy)`}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newCode">
                  New Code <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="newCode"
                  value={newCode}
                  onChange={(e) =>
                    setNewCode(e.target.value.toUpperCase().replace(/[^A-Z_]/g, ''))
                  }
                  placeholder={`${sourceCampaignType.code}_COPY`}
                />
                <p className="text-xs text-muted-foreground">
                  Uppercase letters and underscores only
                </p>
              </div>
            </div>

            {/* Role Selection */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="makeRoleSpecific"
                  checked={makeRoleSpecific}
                  onChange={(e) => {
                    setMakeRoleSpecific(e.target.checked);
                    if (!e.target.checked) {
                      setSelectedRole('');
                    }
                  }}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <Label htmlFor="makeRoleSpecific" className="font-normal cursor-pointer">
                  Restrict to specific role
                </Label>
              </div>

              {makeRoleSpecific && (
                <div className="space-y-2">
                  <Label htmlFor="selectedRole">
                    Select Role <span className="text-destructive">*</span>
                  </Label>
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger id="selectedRole">
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
                </div>
              )}
            </div>

            {/* Clone Options */}
            <div className="space-y-4 pt-4 border-t">
              <Label className="text-sm font-semibold">Clone Settings</Label>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="cloneFunnelStages"
                    checked={cloneSettings.funnel_stages}
                    onChange={(e) =>
                      setCloneSettings({ ...cloneSettings, funnel_stages: e.target.checked })
                    }
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <Label htmlFor="cloneFunnelStages" className="font-normal cursor-pointer">
                    Copy funnel stages
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="cloneMetadata"
                    checked={cloneSettings.metadata}
                    onChange={(e) =>
                      setCloneSettings({ ...cloneSettings, metadata: e.target.checked })
                    }
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <Label htmlFor="cloneMetadata" className="font-normal cursor-pointer">
                    Copy metadata configuration
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="cloneAutoAdvance"
                    checked={cloneSettings.auto_advance}
                    onChange={(e) =>
                      setCloneSettings({ ...cloneSettings, auto_advance: e.target.checked })
                    }
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <Label htmlFor="cloneAutoAdvance" className="font-normal cursor-pointer">
                    Copy auto-advance settings
                  </Label>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-4 pt-4 border-t">
              <Link href="/dashboard/admin/campaigns/types">
                <Button type="button" variant="outline" disabled={loading}>
                  Cancel
                </Button>
              </Link>
              <Button onClick={performClone} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Cloning...
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Clone Campaign Type
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

