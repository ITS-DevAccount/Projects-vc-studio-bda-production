'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { supabase } from '@/lib/supabase/client';
import { LogOut, Loader } from 'lucide-react';
import { DashboardRenderer } from '@/components/dashboard/DashboardRenderer';

interface Stakeholder {
  id: string;
  reference: string;
  name: string;
  email: string | null;
  status: string;
  is_verified: boolean;
  core_config?: any;
  stakeholder_type?: string;
  phone?: string;
  country?: string;
  city?: string;
}

export default function StakeholderDashboardPage() {
  const router = useRouter();
  const { user: authUser, loading: authLoading, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stakeholder, setStakeholder] = useState<Stakeholder | null>(null);

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
      // Find stakeholder by auth_user_id - include core_config
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

      // Format stakeholder data
      const formattedStakeholder = {
        ...stakeholderData,
        stakeholder_type: 'Stakeholder' // Simple fallback for now
      };

      setStakeholder(formattedStakeholder);
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Stakeholder Portal</h1>
              <p className="text-gray-600 text-sm">{stakeholder.name}</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg transition text-gray-900"
            >
              <LogOut className="w-5 h-5" />
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content - Use DashboardRenderer */}
      <div className="max-w-7xl mx-auto">
        <DashboardRenderer stakeholder={stakeholder} />
      </div>
    </div>
  );
}

