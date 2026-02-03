// ============================================================================
// BuildBid: Create Campaign Type Page
// Admin-only page for creating new campaign types
// ============================================================================

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { supabase } from '@/lib/supabase/client';
import { getCurrentAppUuid } from '@/lib/supabase/app-helpers';
import { validateFunnelStages, getDefaultMetadata, calculateFactorTotal } from '@/lib/campaigns/campaign-types';
import Link from 'next/link';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { CampaignTypeForm } from '@/components/admin/campaigns/types/CampaignTypeForm';
import { FunnelStageEditor } from '@/components/admin/campaigns/types/FunnelStageEditor';
import { StageVisualizer } from '@/components/admin/campaigns/types/StageVisualizer';
import { MetadataEditor } from '@/components/admin/campaigns/types/MetadataEditor';
import type { CampaignTypeFormData, FunnelStage, CampaignTypeMetadata, Role, Stakeholder } from '@/lib/types/campaign-type';

export default function CreateCampaignTypePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [appUuid, setAppUuid] = useState<string | null>(null);
  const [currentStakeholderId, setCurrentStakeholderId] = useState<string>('');
  const [roles, setRoles] = useState<Role[]>([]);
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<CampaignTypeFormData>({
    name: '',
    code: '',
    description: '',
    owner_id: '',
    is_role_specific: false,
    role_uuid: null,
  });

  const [stages, setStages] = useState<FunnelStage[]>([]);
  const [metadata, setMetadata] = useState<CampaignTypeMetadata>(getDefaultMetadata());

  useEffect(() => {
    const checkAccessAndLoadData = async () => {
      if (authLoading || !user) return;

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
          toast({
            title: 'Access Denied',
            description: 'You do not have permission to create campaign types',
            variant: 'destructive',
          });
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
          toast({
            title: 'Access Denied',
            description: 'You do not have permission to create campaign types',
            variant: 'destructive',
          });
          router.push('/dashboard');
          return;
        }

        setHasPermission(true);
        setCurrentStakeholderId(stakeholder.id);

        // Set default owner to current user immediately
        setFormData((prev) => ({ ...prev, owner_id: stakeholder.id }));

        // Load roles (server-side) with app_uuid filtering
        const { data: rolesData, error: rolesError } = await supabase
          .from('roles')
          .select('id, code, label, description')
          .eq('app_uuid', currentAppUuid)
          .eq('is_active', true)
          .order('label');

        if (rolesError) {
          console.error('Error loading roles:', rolesError);
          toast({
            title: 'Warning',
            description: 'Failed to load roles: ' + rolesError.message,
            variant: 'destructive',
          });
        }

        setRoles(rolesData || []);

        // Load stakeholders (server-side)
        // Note: stakeholders table is global, doesn't have app_uuid
        // Filter by app through stakeholder_roles join if needed, but for now show all
        const { data: stakeholdersData, error: stakeholdersError } = await supabase
          .from('stakeholders')
          .select('id, name, email')
          .order('name');

        if (stakeholdersError) {
          console.error('Error loading stakeholders:', stakeholdersError);
          toast({
            title: 'Warning',
            description: 'Failed to load stakeholders: ' + stakeholdersError.message,
            variant: 'destructive',
          });
        }

        setStakeholders(stakeholdersData || []);
      } catch (err: any) {
        console.error('Error loading data:', err);
        toast({
          title: 'Error',
          description: 'Failed to load required data',
          variant: 'destructive',
        });
      } finally {
        setLoadingData(false);
      }
    };

    checkAccessAndLoadData();
  }, [authLoading, user, router, toast]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/auth/login');
    }
  }, [authLoading, user, router]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Campaign type name is required';
    }

    if (!formData.code.trim()) {
      errors.code = 'Code is required';
    } else if (!/^[A-Z_]+$/.test(formData.code)) {
      errors.code = 'Code must be uppercase letters and underscores only';
    }

    if (formData.is_role_specific && !formData.role_uuid) {
      errors.role_uuid = 'Please select a role or uncheck role-specific option';
    }

    setFormErrors(errors);

    // Validate funnel stages
    const stageErrors = validateFunnelStages(stages);
    if (stageErrors.length > 0) {
      toast({
        title: 'Validation Error',
        description: `Funnel stage errors: ${stageErrors.join(', ')}`,
        variant: 'destructive',
      });
      return false;
    }

    // Validate scoring factors
    if (metadata.scoring) {
      const factorTotal = calculateFactorTotal(metadata.scoring.factors);
      if (Math.abs(factorTotal - 1.0) > 0.01) {
        toast({
          title: 'Validation Error',
          description: 'Scoring factors must total 1.0',
          variant: 'destructive',
        });
        return false;
      }
    }

    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!validateForm()) {
      setLoading(false);
      return;
    }

    if (!appUuid) {
      toast({
        title: 'Error',
        description: 'Unable to determine app context',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    try {
      const campaignType = {
        code: formData.code.toUpperCase(),
        name: formData.name.trim(),
        description: formData.description?.trim() || null,
        app_uuid: appUuid,
        role_uuid: formData.is_role_specific ? formData.role_uuid : null,
        is_role_specific: formData.is_role_specific,
        funnel_stages: { stages },
        auto_advance_enabled: metadata.automation?.auto_advance_enabled || false,
        auto_advance_days: metadata.automation?.auto_advance_days || null,
        metadata: metadata,
        is_active: true,
        owner_id: formData.owner_id || currentStakeholderId,
      };

      const { error } = await supabase
        .from('campaign_types')
        .insert([campaignType])
        .select()
        .single();

      if (error) {
        throw error;
      }

      toast({
        title: 'Success',
        description: 'Campaign type created successfully',
      });

      router.push('/dashboard/admin/campaigns/types');
    } catch (err: any) {
      console.error('Error creating campaign type:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to create campaign type',
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

  if (hasPermission === false) {
    return null; // Will redirect
  }

  const failStages = stages.filter((s) => s.is_success === false);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 h-16">
            <Link
              href="/dashboard/admin/campaigns/types"
              className="hover:text-primary transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Create Campaign Type</h1>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Core Settings + Funnel Stages */}
            <div className="lg:col-span-2 space-y-6">
              <CampaignTypeForm
                formData={formData}
                onFormDataChange={setFormData}
                roles={roles}
                stakeholders={stakeholders}
                currentStakeholderId={currentStakeholderId}
                errors={formErrors}
              />

              <FunnelStageEditor
                stages={stages}
                onStagesChange={setStages}
                appUuid={appUuid || undefined}
              />

              <StageVisualizer stages={stages} />
            </div>

            {/* Right Column: Metadata Configuration */}
            <div className="lg:col-span-1">
              <MetadataEditor
                metadata={metadata}
                onMetadataChange={setMetadata}
                roles={roles}
                failStages={failStages}
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-4 mt-8 pt-6 border-t">
            <Link href="/dashboard/admin/campaigns/types">
              <Button type="button" variant="outline" disabled={loading}>
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Create Campaign Type
                </>
              )}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
