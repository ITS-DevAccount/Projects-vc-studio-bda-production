// ============================================================================
// BuildBid: Campaign Types List Page
// Admin view of all campaign types with filtering, sorting, and management
// ============================================================================

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { supabase } from '@/lib/supabase/client';
import { getCurrentAppUuid } from '@/lib/supabase/app-helpers';
import { getCampaignTypes, getCampaignTypeUsageCount } from '@/lib/campaigns/campaign-types';
import Link from 'next/link';
import { 
  Plus, 
  Loader2, 
  Search, 
  Settings, 
  Edit, 
  Copy, 
  Archive,
  ArchiveRestore,
  Filter,
  ArrowLeft
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminMenu from '@/components/admin/AdminMenu';
import type { CampaignType, Role } from '@/lib/types/campaign-type';

export default function CampaignTypesListPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [campaignTypes, setCampaignTypes] = useState<CampaignType[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [appUuid, setAppUuid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('active');
  const [sortBy, setSortBy] = useState<'name' | 'created_at' | 'updated_at'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    const checkAccessAndLoadData = async () => {
      if (authLoading || !user) return;

      try {
        // Get app_uuid
        const currentAppUuid = await getCurrentAppUuid();
        if (!currentAppUuid) {
          setError('Unable to determine app context');
          setLoading(false);
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
            description: 'You do not have permission to manage campaign types',
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
            description: 'You do not have permission to manage campaign types',
            variant: 'destructive',
          });
          router.push('/dashboard');
          return;
        }

        setHasPermission(true);

        // Load roles for filter (server-side) with app_uuid filtering
        const { data: rolesData } = await supabase
          .from('roles')
          .select('id, code, label, description')
          .eq('app_uuid', currentAppUuid)
          .eq('is_active', true)
          .order('label');

        setRoles(rolesData || []);

        // Load campaign types
        await loadCampaignTypes(currentAppUuid);
      } catch (err: any) {
        console.error('Error loading data:', err);
        setError(err.message || 'Failed to load data');
        toast({
          title: 'Error',
          description: 'Failed to load campaign types',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    checkAccessAndLoadData();
  }, [authLoading, user, router, toast]);

  const loadCampaignTypes = async (appUuid: string) => {
    try {
      const filters: any = {
        isActive: statusFilter === 'all' ? undefined : statusFilter === 'active',
        roleUuid: roleFilter === 'all' ? undefined : roleFilter,
        search: searchTerm || undefined,
      };

      const types = await getCampaignTypes(appUuid, filters);

      // Load usage counts for each type
      const typesWithUsage = await Promise.all(
        types.map(async (type) => {
          const usageCount = await getCampaignTypeUsageCount(type.id, appUuid);
          return { ...type, campaigns_count: usageCount };
        })
      );

      // Sort client-side (after server-side filtering)
      typesWithUsage.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (sortBy) {
          case 'name':
            aValue = a.name.toLowerCase();
            bValue = b.name.toLowerCase();
            break;
          case 'created_at':
            aValue = new Date(a.created_at).getTime();
            bValue = new Date(b.created_at).getTime();
            break;
          case 'updated_at':
            aValue = new Date(a.updated_at || a.created_at).getTime();
            bValue = new Date(b.updated_at || b.created_at).getTime();
            break;
          default:
            aValue = a.name.toLowerCase();
            bValue = b.name.toLowerCase();
        }

        if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });

      setCampaignTypes(typesWithUsage);
    } catch (err: any) {
      console.error('Error loading campaign types:', err);
      setError(err.message || 'Failed to load campaign types');
    }
  };

  useEffect(() => {
    if (appUuid && hasPermission) {
      loadCampaignTypes(appUuid);
    }
  }, [searchTerm, roleFilter, statusFilter, sortBy, sortOrder, appUuid, hasPermission]);

  const handleArchive = async (type: CampaignType) => {
    if (!appUuid) return;

    // Check if type is in use
    const usageCount = await getCampaignTypeUsageCount(type.id, appUuid);
    if (usageCount > 0) {
      toast({
        title: 'Cannot Archive',
        description: `This campaign type is used by ${usageCount} active campaign(s). Please archive or complete those campaigns first.`,
        variant: 'destructive',
      });
      return;
    }

    if (!confirm(`Archive campaign type "${type.name}"?`)) return;

    const { error } = await supabase
      .from('campaign_types')
      .update({ is_active: false })
      .eq('id', type.id)
      .eq('app_uuid', appUuid);

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Archived',
        description: `Campaign type "${type.name}" has been archived`,
      });
      loadCampaignTypes(appUuid);
    }
  };

  const handleRestore = async (type: CampaignType) => {
    if (!appUuid) return;

    const { error } = await supabase
      .from('campaign_types')
      .update({ is_active: true })
      .eq('id', type.id)
      .eq('app_uuid', appUuid);

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Restored',
        description: `Campaign type "${type.name}" has been restored`,
      });
      loadCampaignTypes(appUuid);
    }
  };

  if (authLoading || loading || hasPermission === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (hasPermission === false) {
    return null; // Will redirect
  }

  const getStageCount = (type: CampaignType) => {
    return type.funnel_stages?.stages?.length || 0;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      <AdminMenu />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/admin/campaigns"
              className="hover:text-primary transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Campaign Types</h1>
              <p className="text-gray-600 text-sm mt-1">
                Define funnel stages and configure campaign templates
              </p>
            </div>
          </div>
          <Link href="/dashboard/admin/campaigns/types/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Campaign Type
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search types..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="general">General (All Roles)</SelectItem>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="created_at">Created Date</SelectItem>
                  <SelectItem value="updated_at">Last Updated</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                {sortOrder === 'asc' ? '↑ Asc' : '↓ Desc'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Error Message */}
        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <p className="text-red-800">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Campaign Types List */}
        {campaignTypes.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">
                  {searchTerm || roleFilter !== 'all' || statusFilter !== 'active'
                    ? 'No campaign types match your filters.'
                    : 'No campaign types found. Create your first campaign type to get started.'}
                </p>
                {!searchTerm && roleFilter === 'all' && statusFilter === 'active' && (
                  <Link href="/dashboard/admin/campaigns/types/new">
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Campaign Type
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {campaignTypes.map((type) => (
              <Card key={type.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-semibold text-gray-900">{type.name}</h3>
                        <Badge variant={type.is_active ? 'default' : 'secondary'}>
                          {type.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        {type.is_role_specific && type.role && (
                          <Badge variant="outline">{type.role.label}</Badge>
                        )}
                        {!type.is_role_specific && (
                          <Badge variant="outline">General</Badge>
                        )}
                      </div>

                      {type.description && (
                        <p className="text-gray-600 mb-4">{type.description}</p>
                      )}

                      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Filter className="h-4 w-4" />
                          <span>{getStageCount(type)} stages</span>
                        </div>
                        {type.auto_advance_enabled && type.auto_advance_days && (
                          <div>
                            <span>Auto-advance: {type.auto_advance_days} days</span>
                          </div>
                        )}
                        {!type.auto_advance_enabled && (
                          <div>
                            <span>Auto-advance: Off</span>
                          </div>
                        )}
                        <div>
                          <span>Used in {type.campaigns_count || 0} campaign(s)</span>
                        </div>
                      </div>
                    </div>

                    <div className="ml-4 flex flex-col gap-2">
                      <Link href={`/dashboard/admin/campaigns/types/${type.id}/edit`}>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                      </Link>
                      <Link href={`/dashboard/admin/campaigns/types/${type.id}/clone`}>
                        <Button variant="outline" size="sm">
                          <Copy className="h-4 w-4 mr-2" />
                          Clone
                        </Button>
                      </Link>
                      {type.is_active ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleArchive(type)}
                        >
                          <Archive className="h-4 w-4 mr-2" />
                          Archive
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRestore(type)}
                        >
                          <ArchiveRestore className="h-4 w-4 mr-2" />
                          Restore
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

