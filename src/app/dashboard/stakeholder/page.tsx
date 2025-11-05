'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { supabase } from '@/lib/supabase/client';
import { LogOut, User, Shield, Users, Loader } from 'lucide-react';

interface Stakeholder {
  id: string;
  reference: string;
  name: string;
  email: string | null;
  status: string;
  is_verified: boolean;
}

interface StakeholderRole {
  id: string;
  role_type: string;
}

const BDA_ROLES: Record<string, string> = {
  individual: 'Individual',
  investor: 'Investor',
  producer: 'Producer/Service Provider',
  administrator: 'Administrator',
};

export default function StakeholderDashboardPage() {
  const router = useRouter();
  const { user: authUser, loading: authLoading, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stakeholder, setStakeholder] = useState<Stakeholder | null>(null);
  const [roles, setRoles] = useState<StakeholderRole[]>([]);
  const [relationships, setRelationships] = useState<any[]>([]);

  useEffect(() => {
    if (!authLoading && !authUser) {
      router.push('/auth/login');
      return;
    }
    
    // Check if user is actually an admin (should redirect to admin dashboard)
    if (authUser && !authLoading) {
      const checkIfAdmin = async () => {
        try {
          const { data: userRecord } = await supabase
            .from('users')
            .select('id')
            .eq('auth_user_id', authUser.id)
            .single();
          
          // If they're in users table (admin), redirect to admin dashboard
          if (userRecord) {
            router.replace('/dashboard');
            return;
          }
          
          // Otherwise, load stakeholder data
          loadStakeholderData();
        } catch (err) {
          // If error checking users table, assume stakeholder and load data
          loadStakeholderData();
        }
      };
      
      checkIfAdmin();
    }
  }, [authUser, authLoading]);

  async function loadStakeholderData() {
    if (!authUser) return;
    setLoading(true);

    try {
      // Find stakeholder by auth_user_id
      const { data: stakeholderData, error: stakeholderError } = await supabase
        .from('stakeholders')
        .select('*')
        .eq('auth_user_id', authUser.id)
        .single();

      if (stakeholderError) {
        if (stakeholderError.code === 'PGRST116') {
          // No stakeholder record found - this user is not a stakeholder
          console.log('User is not a stakeholder');
          router.push('/dashboard'); // Redirect to admin dashboard
          return;
        }
        throw stakeholderError;
      }

      setStakeholder(stakeholderData);

      // Load roles
      const { data: rolesData } = await supabase
        .from('stakeholder_roles')
        .select('*')
        .eq('stakeholder_id', stakeholderData.id);
      setRoles(rolesData || []);

      // Load relationships
      const { data: relsData } = await supabase
        .from('relationships')
        .select(`
          *,
          from_stakeholder:from_stakeholder_id(name),
          to_stakeholder:to_stakeholder_id(name),
          relationship_type:relationship_type_id(label)
        `)
        .or(`from_stakeholder_id.eq.${stakeholderData.id},to_stakeholder_id.eq.${stakeholderData.id}`);
      setRelationships(relsData || []);
    } catch (err) {
      console.error('Error loading stakeholder data:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleLogout = async () => {
    router.replace('/');
    await signOut();
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-brand-background text-brand-text flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!stakeholder) {
    return null;
  }

  return (
    <div className="min-h-screen bg-brand-background text-brand-text">
      {/* Header */}
      <header className="bg-section-light border-b border-section-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-2xl font-bold">Stakeholder Portal</h1>
              <p className="text-brand-text-muted text-sm">{stakeholder.name}</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-section-subtle hover:bg-section-emphasis px-4 py-2 rounded-lg transition"
            >
              <LogOut className="w-5 h-5" />
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="bg-section-light border border-section-border rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-2">Welcome, {stakeholder.name}!</h2>
          <p className="text-brand-text-muted">Reference: {stakeholder.reference}</p>
          <div className="flex gap-4 mt-4">
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded text-sm ${
                stakeholder.status === 'active' ? 'bg-green-100 text-green-800' :
                stakeholder.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {stakeholder.status}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-brand-text-muted">
                Verified: {stakeholder.is_verified ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-section-light border border-section-border rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-brand-text-muted text-sm">Roles</p>
                <p className="text-3xl font-bold mt-2">{roles.length}</p>
              </div>
              <Shield className="w-10 h-10 text-accent-primary" />
            </div>
          </div>

          <div className="bg-section-light border border-section-border rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-brand-text-muted text-sm">Relationships</p>
                <p className="text-3xl font-bold mt-2">{relationships.length}</p>
              </div>
              <Users className="w-10 h-10 text-accent-primary" />
            </div>
          </div>

          <div className="bg-section-light border border-section-border rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-brand-text-muted text-sm">Profile</p>
                <p className="text-lg font-bold mt-2">Active</p>
              </div>
              <User className="w-10 h-10 text-accent-primary" />
            </div>
          </div>
        </div>

        {/* Roles Section */}
        <div className="bg-section-light border border-section-border rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5" /> My Roles
          </h3>
          {roles.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {roles.map((role) => (
                <span
                  key={role.id}
                  className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                >
                  {BDA_ROLES[role.role_type] || role.role_type}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-brand-text-muted">No roles assigned</p>
          )}
        </div>

        {/* Relationships Section */}
        <div className="bg-section-light border border-section-border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" /> My Relationships
          </h3>
          {relationships.length > 0 ? (
            <div className="space-y-2">
              {relationships.slice(0, 10).map((rel) => {
                const isFrom = rel.from_stakeholder_id === stakeholder.id;
                const otherStakeholder = isFrom ? rel.to_stakeholder : rel.from_stakeholder;
                
                return (
                  <div key={rel.id} className="flex items-center gap-2 text-sm p-2 bg-section-subtle rounded">
                    <span className="text-brand-text">
                      {isFrom ? '→' : '←'} {otherStakeholder?.name || 'Unknown'}
                    </span>
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                      {rel.relationship_type?.label || 'Unknown'}
                    </span>
                  </div>
                );
              })}
              {relationships.length > 10 && (
                <p className="text-sm text-brand-text-muted mt-2">
                  + {relationships.length - 10} more relationship{relationships.length - 10 !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          ) : (
            <p className="text-brand-text-muted">No relationships found</p>
          )}
        </div>
      </div>
    </div>
  );
}

