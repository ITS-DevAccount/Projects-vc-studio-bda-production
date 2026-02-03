// ============================================================================
// BuildBid: Campaign Creator Page
// Admin-only page for creating new marketing campaigns
// ============================================================================

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { supabase } from '@/lib/supabase/client';
import { getCurrentAppUuid } from '@/lib/supabase/app-helpers';
import Link from 'next/link';
import { ArrowLeft, Loader2, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import FunnelStageDisplay from '@/lib/campaigns/components/FunnelStageDisplay';
import { useToast } from '@/hooks/use-toast';
import type { CampaignType, CampaignFormData, Stakeholder } from '@/lib/types/campaign';

interface FormErrors {
  name?: string;
  campaign_type_id?: string;
  owner_id?: string;
  end_date?: string;
  target_count?: string;
  description?: string;
}

export default function CreateCampaignPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState('');
  const [campaignTypes, setCampaignTypes] = useState<CampaignType[]>([]);
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [selectedCampaignType, setSelectedCampaignType] = useState<CampaignType | null>(null);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [appUuid, setAppUuid] = useState<string | null>(null);
  const [teamMemberSelectOpen, setTeamMemberSelectOpen] = useState(false);

  const [formData, setFormData] = useState<CampaignFormData>({
    name: '',
    campaign_type_id: '',
    description: '',
    owner_id: '',
    team_members: [],
    launch_date: '',
    end_date: '',
    target_count: undefined,
  });

  // Check admin access and load data
  useEffect(() => {
    const checkAccessAndLoadData = async () => {
      if (authLoading || !user) return;

      try {
        // Get app_uuid for server-side filtering
        const currentAppUuid = await getCurrentAppUuid();
        if (!currentAppUuid) {
          setError('Unable to determine app context');
          setLoadingData(false);
          return;
        }
        setAppUuid(currentAppUuid);

        // Check admin role via stakeholders table
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
            description: 'You do not have permission to create campaigns',
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
            description: 'You do not have permission to create campaigns',
            variant: 'destructive',
          });
          router.push('/dashboard');
          return;
        }

        setHasPermission(true);

        // Load campaign types with server-side filtering and ordering
        const { data: typesData, error: typesError } = await supabase
          .from('campaign_types')
          .select('id, code, name, description, funnel_stages, auto_advance_enabled, auto_advance_days, metadata, created_at')
          .order('name');

        if (typesError) {
          console.error('Error loading campaign types:', typesError);
          setError('Failed to load campaign types');
        } else {
          setCampaignTypes(typesData || []);
        }

        // Load stakeholders with ordering (stakeholders are global, no app_uuid filter)
        const { data: stakeholdersData, error: stakeholdersError } = await supabase
          .from('stakeholders')
          .select('id, name, email')
          .order('name');

        if (stakeholdersError) {
          console.error('Error loading stakeholders:', stakeholdersError);
          setError('Failed to load stakeholders');
        } else {
          setStakeholders(stakeholdersData || []);
        }

        // Get current user's stakeholder
        const { data: currentUserStakeholder } = await supabase
          .from('stakeholders')
          .select('id, name, email')
          .eq('auth_user_id', user.id)
          .single();

        if (currentUserStakeholder) {
          setFormData((prev) => ({ ...prev, owner_id: currentUserStakeholder.id }));
        }
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Failed to load data');
        toast({
          title: 'Error',
          description: 'Failed to load required data. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setLoadingData(false);
      }
    };

    checkAccessAndLoadData();
  }, [authLoading, user, router, toast]);

  // Update selected campaign type when form data changes
  useEffect(() => {
    if (formData.campaign_type_id) {
      const type = campaignTypes.find((t) => t.id === formData.campaign_type_id);
      setSelectedCampaignType(type || null);
    } else {
      setSelectedCampaignType(null);
    }
  }, [formData.campaign_type_id, campaignTypes]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/auth/login');
    }
  }, [authLoading, user, router]);

  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    if (!formData.name.trim()) {
      errors.name = 'Campaign name is required';
    } else if (formData.name.length > 255) {
      errors.name = 'Campaign name must be 255 characters or less';
    }

    if (!formData.campaign_type_id) {
      errors.campaign_type_id = 'Please select a campaign type';
    }

    if (!formData.owner_id) {
      errors.owner_id = 'Campaign owner is required';
    }

    if (formData.launch_date && formData.end_date) {
      const launchDate = new Date(formData.launch_date);
      const endDate = new Date(formData.end_date);
      if (endDate <= launchDate) {
        errors.end_date = 'End date must be after launch date';
      }
    }

    if (formData.target_count !== undefined && formData.target_count !== null) {
      if (formData.target_count < 1) {
        errors.target_count = 'Target count must be at least 1';
      }
      if (!Number.isInteger(formData.target_count)) {
        errors.target_count = 'Target count must be a whole number';
      }
    }

    if (formData.description && formData.description.length > 1000) {
      errors.description = 'Description must be 1000 characters or less';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!validateForm()) {
      setLoading(false);
      return;
    }

    if (!appUuid) {
      setError('Unable to determine app context');
      toast({
        title: 'Error',
        description: 'Unable to determine app context. Please refresh the page.',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    try {
      // Get current user
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        throw new Error('Not authenticated');
      }

      // Prepare campaign data
      const campaignData: any = {
        name: formData.name.trim(),
        campaign_type_id: formData.campaign_type_id,
        description: formData.description?.trim() || null,
        owner_id: formData.owner_id,
        team_members: formData.team_members || [],
        launch_date: formData.launch_date || null,
        end_date: formData.end_date || null,
        target_count: formData.target_count || null,
        status: 'planning' as const,
        app_uuid: appUuid,
        created_by: authUser.id,
      };

      // Insert campaign directly using Supabase
      const { data: createdCampaign, error: insertError } = await supabase
        .from('campaigns')
        .insert([campaignData])
        .select()
        .single();

      if (insertError) {
        console.error('Error creating campaign:', insertError);
        throw new Error(insertError.message || 'Failed to create campaign');
      }

      // Show success toast
      toast({
        title: 'Campaign Created',
        description: `Campaign created successfully - Reference: ${createdCampaign.reference}`,
      });

      // Redirect to campaign detail page
      router.push(`/dashboard/admin/campaigns/${createdCampaign.id}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create campaign';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Get selected team members with full details
  const selectedTeamMembers = stakeholders.filter((s) =>
    formData.team_members?.includes(s.id)
  );

  // Get available stakeholders for team selection (exclude owner and already selected)
  const availableTeamMembers = stakeholders.filter(
    (s) => s.id !== formData.owner_id && !formData.team_members?.includes(s.id)
  );

  const addTeamMember = (stakeholderId: string) => {
    setFormData((prev) => ({
      ...prev,
      team_members: [...(prev.team_members || []), stakeholderId],
    }));
    setTeamMemberSelectOpen(false);
  };

  const removeTeamMember = (stakeholderId: string) => {
    setFormData((prev) => ({
      ...prev,
      team_members: (prev.team_members || []).filter((id) => id !== stakeholderId),
    }));
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 h-16">
            <Link
              href="/dashboard/admin/campaigns"
              className="hover:text-primary transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <h1 className="text-2xl font-bold text-foreground">Create New Campaign</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Campaign Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Error Message */}
              {error && (
                <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md text-sm">
                  {error}
                </div>
              )}

              {/* Campaign Name */}
              <div className="space-y-2">
                <Label htmlFor="name">
                  Campaign Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Portsmouth Construction Winners Dec 2025"
                  className={formErrors.name ? 'border-destructive' : ''}
                />
                {formErrors.name && (
                  <p className="text-sm text-destructive">{formErrors.name}</p>
                )}
              </div>

              {/* Campaign Type */}
              <div className="space-y-2">
                <Label htmlFor="campaign_type_id">
                  Campaign Type <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.campaign_type_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, campaign_type_id: value })
                  }
                >
                  <SelectTrigger
                    id="campaign_type_id"
                    className={formErrors.campaign_type_id ? 'border-destructive' : ''}
                  >
                    <SelectValue placeholder="Select a campaign type" />
                  </SelectTrigger>
                  <SelectContent>
                    {campaignTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        <div>
                          <div className="font-medium">{type.name}</div>
                          {type.description && (
                            <div className="text-xs text-muted-foreground">
                              {type.description}
                            </div>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.campaign_type_id && (
                  <p className="text-sm text-destructive">{formErrors.campaign_type_id}</p>
                )}

                {/* Funnel Stages Display */}
                {selectedCampaignType && (
                  <FunnelStageDisplay
                    stages={selectedCampaignType.funnel_stages?.stages || []}
                    mode="overview"
                    autoAdvanceEnabled={selectedCampaignType.auto_advance_enabled}
                    autoAdvanceDays={selectedCampaignType.auto_advance_days}
                  />
                )}
              </div>

              {/* Campaign Owner */}
              <div className="space-y-2">
                <Label htmlFor="owner_id">
                  Campaign Owner <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.owner_id}
                  onValueChange={(value) => setFormData({ ...formData, owner_id: value })}
                >
                  <SelectTrigger
                    id="owner_id"
                    className={formErrors.owner_id ? 'border-destructive' : ''}
                  >
                    <SelectValue placeholder="Select campaign owner" />
                  </SelectTrigger>
                  <SelectContent>
                    {stakeholders.map((stakeholder) => (
                      <SelectItem key={stakeholder.id} value={stakeholder.id}>
                        {stakeholder.name}
                        {stakeholder.email && ` (${stakeholder.email})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.owner_id && (
                  <p className="text-sm text-destructive">{formErrors.owner_id}</p>
                )}
              </div>

              {/* Team Members */}
              <div className="space-y-2">
                <Label>Team Members (optional)</Label>
                <div className="space-y-3">
                  {/* Selected Team Members */}
                  {selectedTeamMembers.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedTeamMembers.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-md text-sm"
                        >
                          <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-xs text-primary">
                              {member.name.slice(0, 2).toUpperCase()}
                            </span>
                          </div>
                          <span>
                            {member.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeTeamMember(member.id)}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Team Member Select */}
                  <Select
                    open={teamMemberSelectOpen}
                    onOpenChange={setTeamMemberSelectOpen}
                    value=""
                    onValueChange={addTeamMember}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="+ Add team member" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTeamMembers.length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          No available stakeholders
                        </div>
                      ) : (
                        availableTeamMembers.map((stakeholder) => (
                          <SelectItem key={stakeholder.id} value={stakeholder.id}>
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-xs text-primary">
                                  {stakeholder.name.slice(0, 2).toUpperCase()}
                                </span>
                              </div>
                              <span>
                                {stakeholder.name}
                                {stakeholder.email && ` (${stakeholder.email})`}
                              </span>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Add team members who will work on this campaign. The owner is automatically included.
                  </p>
                </div>
              </div>

              {/* Launch Date */}
              <div className="space-y-2">
                <Label htmlFor="launch_date">Launch Date</Label>
                <Input
                  id="launch_date"
                  type="date"
                  value={formData.launch_date}
                  onChange={(e) => setFormData({ ...formData, launch_date: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Campaign starts in 'planning' status if no launch date is set
                </p>
              </div>

              {/* End Date */}
              <div className="space-y-2">
                <Label htmlFor="end_date">End Date (optional)</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className={formErrors.end_date ? 'border-destructive' : ''}
                />
                {formErrors.end_date && (
                  <p className="text-sm text-destructive">{formErrors.end_date}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Leave empty for ongoing campaigns
                </p>
              </div>

              {/* Target Count */}
              <div className="space-y-2">
                <Label htmlFor="target_count">Target Count (optional)</Label>
                <Input
                  id="target_count"
                  type="number"
                  min="1"
                  step="1"
                  value={formData.target_count || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      target_count: e.target.value ? parseInt(e.target.value, 10) : undefined,
                    })
                  }
                  className={formErrors.target_count ? 'border-destructive' : ''}
                />
                {formErrors.target_count && (
                  <p className="text-sm text-destructive">{formErrors.target_count}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Expected number of opportunities in this campaign
                </p>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of this campaign's goals and target audience"
                  className={formErrors.description ? 'border-destructive' : ''}
                  maxLength={1000}
                />
                {formErrors.description && (
                  <p className="text-sm text-destructive">{formErrors.description}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {formData.description?.length || 0}/1000 characters
                </p>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-4 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/dashboard/admin/campaigns')}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Creating...
                    </>
                  ) : (
                    'Create Campaign'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

