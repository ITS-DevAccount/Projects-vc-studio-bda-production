'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { supabase } from '@/lib/supabase/client';
import { useAppUuid } from '@/contexts/AppContext';
import { Plus, Trash2, Edit2, Mail, MessageSquare, LogOut, Loader, RefreshCw, FileEdit, Palette, Users } from 'lucide-react';
import Link from 'next/link';

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  status: string;
  published_at: string;
  is_featured: boolean;
  created_at: string;
}

interface Enquiry {
  id: string;
  name: string;
  email: string;
  subject: string;
  status: string;
  created_at: string;
}

interface StakeholderRow {
  id: string;
  reference: string;
  name: string;
  stakeholder_type_id: string;
  email: string | null;
  status: string;
  is_verified: boolean;
  created_at: string;
}

interface ListResponse {
  data: StakeholderRow[];
  count: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading, signOut } = useAuth();
  const appUuid = useAppUuid();
  const [activeTab, setActiveTab] = useState<'blogs' | 'enquiries' | 'pages' | 'stakeholders'>(() => {
    const tab = searchParams?.get('tab');
    if (tab && ['blogs', 'enquiries', 'pages', 'stakeholders'].includes(tab)) {
      return tab as 'blogs' | 'enquiries' | 'pages' | 'stakeholders';
    }
    return 'blogs';
  });
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [stakeholders, setStakeholders] = useState<StakeholderRow[]>([]);
  const [stakeholderCount, setStakeholderCount] = useState(0);
  const [loadingBlogs, setLoadingBlogs] = useState(true);
  const [loadingEnquiries, setLoadingEnquiries] = useState(true);
  const [loadingStakeholders, setLoadingStakeholders] = useState(true);
  const [stakeholderSearch, setStakeholderSearch] = useState('');
  const [stakeholderStatusFilter, setStakeholderStatusFilter] = useState('');
  const [stakeholderVerifiedFilter, setStakeholderVerifiedFilter] = useState('');
  const [stakeholderPage, setStakeholderPage] = useState(1);
  
  // Check authentication and redirect stakeholders to their dashboard
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
      return;
    }
    
    // If authenticated, check if user is a stakeholder (not admin)
    if (user && !authLoading) {
      const checkUserType = async () => {
        try {
          // Check if user is in stakeholders table (not in users table)
          const { data: userRecord } = await supabase
            .from('users')
            .select('id')
            .eq('auth_user_id', user.id)
            .single();
          
          // If not in users table, check if they're a stakeholder
          if (!userRecord) {
            const { data: stakeholderRecord } = await supabase
              .from('stakeholders')
              .select('id')
              .eq('auth_user_id', user.id)
              .single();
            
            // If they're a stakeholder, redirect to stakeholder dashboard
            if (stakeholderRecord) {
              router.replace('/dashboard/stakeholder');
            }
          }
        } catch (err) {
          // Error checking - continue with admin dashboard
          console.error('Error checking user type:', err);
        }
      };
      
      checkUserType();
    }
  }, [user, authLoading, router]);

  // Fetch blogs
  useEffect(() => {
    if (!appUuid) return;

    const fetchBlogs = async () => {
      try {
        const { data, error } = await supabase
          .from('blog_posts')
          .select('*')
          .eq('app_uuid', appUuid)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setBlogs(data || []);
      } catch (err) {
        console.error('Error fetching blogs:', err);
      } finally {
        setLoadingBlogs(false);
      }
    };

    fetchBlogs();
  }, [appUuid]);

  // Fetch enquiries
  useEffect(() => {
    if (!appUuid) return;

    const fetchEnquiries = async () => {
      try {
        const { data, error } = await supabase
          .from('enquiries')
          .select('*')
          .eq('app_uuid', appUuid)
          .order('created_at', { ascending: false });

        console.log('Initial enquiries fetch:', { data, error, count: data?.length });

        if (error) {
          console.error('Supabase error:', error);
          throw error;
        }
        setEnquiries(data || []);
      } catch (err) {
        console.error('Error fetching enquiries:', err);
      } finally {
        setLoadingEnquiries(false);
      }
    };

    fetchEnquiries();
  }, [appUuid]);

  // Fetch stakeholders
  useEffect(() => {
    if (!appUuid) return;

    const fetchStakeholders = async () => {
      setLoadingStakeholders(true);
      try {
        // Get auth token
        const { data: { session } } = await supabase.auth.getSession();
        const accessToken = session?.access_token;

        const params = new URLSearchParams();
        if (stakeholderSearch) params.set('q', stakeholderSearch);
        if (stakeholderStatusFilter) params.set('status', stakeholderStatusFilter);
        if (stakeholderVerifiedFilter) params.set('verified', stakeholderVerifiedFilter);
        params.set('page', String(stakeholderPage));
        params.set('pageSize', '50');

        const res = await fetch(`/api/stakeholders?${params.toString()}`, {
          headers: {
            ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
          },
        });
        const json: ListResponse = await res.json();
        if (res.ok) {
          setStakeholders(json.data || []);
          setStakeholderCount(json.count || 0);
        } else {
          console.error('Error fetching stakeholders:', json);
        }
      } catch (err) {
        console.error('Error fetching stakeholders:', err);
      } finally {
        setLoadingStakeholders(false);
      }
    };

    fetchStakeholders();
  }, [appUuid, stakeholderSearch, stakeholderStatusFilter, stakeholderVerifiedFilter, stakeholderPage]);

  const handleDeleteBlog = async (id: string) => {
    if (!confirm('Are you sure you want to delete this blog post?')) return;

    try {
      const { error } = await supabase
        .from('blog_posts')
        .delete()
        .eq('id', id)
        .eq('app_uuid', appUuid); // SECURITY: Prevent cross-app deletion
      if (error) throw error;
      setBlogs(blogs.filter((b) => b.id !== id));
    } catch (err) {
      alert('Error deleting blog post');
    }
  };

  const handleDeleteEnquiry = async (id: string) => {
    if (!confirm('Are you sure you want to delete this enquiry?')) return;

    try {
      const { error } = await supabase
        .from('enquiries')
        .delete()
        .eq('id', id)
        .eq('app_uuid', appUuid); // SECURITY: Prevent cross-app deletion
      if (error) throw error;
      setEnquiries(enquiries.filter((e) => e.id !== id));
    } catch (err) {
      alert('Error deleting enquiry');
    }
  };

  const handleLogout = async () => {
    // Navigate first, then sign out to avoid redirect race condition
    router.replace('/');
    await signOut();
  };

  const refreshEnquiries = async () => {
    setLoadingEnquiries(true);
    try {
      const { data, error } = await supabase
        .from('enquiries')
        .select('*')
        .eq('app_uuid', appUuid)
        .order('created_at', { ascending: false });

      console.log('Enquiries fetch result:', { data, error, count: data?.length });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      setEnquiries(data || []);
    } catch (err) {
      console.error('Error fetching enquiries:', err);
    } finally {
      setLoadingEnquiries(false);
    }
  };

  const refreshBlogs = async () => {
    setLoadingBlogs(true);
    try {
      const { data, error} = await supabase
        .from('blog_posts')
        .select('*')
        .eq('app_uuid', appUuid)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBlogs(data || []);
    } catch (err) {
      console.error('Error fetching blogs:', err);
    } finally {
      setLoadingBlogs(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-brand-background text-brand-text flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-brand-background text-brand-text">
      {/* Header */}
      <header className="bg-section-light border-b border-section-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-2xl font-bold">VC Studio Admin</h1>
              <p className="text-brand-text-muted text-sm">{user.email}</p>
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
        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-section-border">
          <button
            onClick={() => setActiveTab('blogs')}
            className={`px-4 py-2 font-semibold transition ${
              activeTab === 'blogs'
                ? 'text-accent-primary border-b-2 border-blue-400'
                : 'text-brand-text-muted hover:text-brand-text'
            }`}
          >
            Blog Posts ({blogs.length})
          </button>
          <button
            onClick={() => setActiveTab('enquiries')}
            className={`px-4 py-2 font-semibold transition ${
              activeTab === 'enquiries'
                ? 'text-accent-primary border-b-2 border-blue-400'
                : 'text-brand-text-muted hover:text-brand-text'
            }`}
          >
            Enquiries ({enquiries.length})
          </button>
          <button
            onClick={() => setActiveTab('pages')}
            className={`px-4 py-2 font-semibold transition ${
              activeTab === 'pages'
                ? 'text-accent-primary border-b-2 border-blue-400'
                : 'text-brand-text-muted hover:text-brand-text'
            }`}
          >
            Pages
          </button>
          <button
            onClick={() => setActiveTab('stakeholders')}
            className={`px-4 py-2 font-semibold transition ${
              activeTab === 'stakeholders'
                ? 'text-accent-primary border-b-2 border-blue-400'
                : 'text-brand-text-muted hover:text-brand-text'
            }`}
          >
            Stakeholders ({stakeholderCount})
          </button>
        </div>

        {/* Blogs Tab */}
        {activeTab === 'blogs' && (
          <div>
            <div className="mb-6 flex justify-between items-center">
              <h2 className="text-xl font-bold">Manage Blog Posts</h2>
              <div className="flex gap-2">
                <button
                  onClick={refreshBlogs}
                  disabled={loadingBlogs}
                  className="flex items-center gap-2 bg-section-subtle hover:bg-section-emphasis disabled:bg-neutral-400 px-4 py-2 rounded-lg transition"
                >
                  <RefreshCw className={`w-5 h-5 ${loadingBlogs ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
                <Link
                  href="/dashboard/blog/new"
                  className="flex items-center gap-2 bg-accent-primary hover:bg-accent-primary-hover px-4 py-2 rounded-lg transition"
                >
                  <Plus className="w-5 h-5" />
                  New Post
                </Link>
              </div>
            </div>

            {loadingBlogs ? (
              <div className="text-center py-12 text-brand-text-muted">
                <Loader className="w-8 h-8 animate-spin mx-auto mb-4" />
                Loading blog posts...
              </div>
            ) : blogs.length > 0 ? (
              <div className="grid gap-4">
                {blogs.map((blog) => (
                  <div key={blog.id} className="bg-section-light rounded-lg p-6 border border-section-border hover:border-accent-primary transition">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold mb-2">{blog.title}</h3>
                        <p className="text-brand-text-muted text-sm mb-3 line-clamp-2">{blog.excerpt}</p>
                        <div className="flex gap-4 text-xs text-brand-text-muted">
                          <span>Status: {blog.status}</span>
                          <span>Featured: {blog.is_featured ? 'Yes' : 'No'}</span>
                          <span>{new Date(blog.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Link
                          href={`/dashboard/blog/${blog.id}`}
                          className="bg-section-subtle hover:bg-section-emphasis p-2 rounded-lg transition"
                        >
                          <Edit2 className="w-5 h-5" />
                        </Link>
                        <button
                          onClick={() => handleDeleteBlog(blog.id)}
                          className="bg-semantic-error-bg hover:bg-red-900/40 p-2 rounded-lg transition text-semantic-error"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-section-light rounded-lg border border-section-border">
                <p className="text-brand-text-muted mb-4">No blog posts yet</p>
                <Link
                  href="/dashboard/blog/new"
                  className="inline-flex items-center gap-2 bg-accent-primary hover:bg-accent-primary-hover px-4 py-2 rounded-lg transition"
                >
                  <Plus className="w-5 h-5" />
                  Create First Post
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Pages Tab */}
        {activeTab === 'pages' && (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-bold">Manage Pages & Settings</h2>
              <p className="text-sm text-brand-text-muted mt-1">Configure site branding and page content</p>
            </div>

            <div className="grid gap-4 max-w-2xl">
              <Link
                href="/dashboard/settings/branding"
                className="bg-section-light rounded-lg p-6 border border-section-border hover:border-accent-primary transition group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="bg-accent-secondary/10 p-3 rounded-lg group-hover:bg-accent-secondary/20 transition">
                      <Palette className="w-6 h-6 text-accent-secondary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-1">Branding & Theme Settings</h3>
                      <p className="text-sm text-brand-text-muted">
                        Configure site colors, logo, and global branding
                      </p>
                    </div>
                  </div>
                  <Edit2 className="w-5 h-5 text-brand-text-muted group-hover:text-accent-primary transition" />
                </div>
              </Link>

              <Link
                href="/dashboard/pages/editor"
                className="bg-section-light rounded-lg p-6 border border-section-border hover:border-accent-primary transition group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="bg-accent-primary/10 p-3 rounded-lg group-hover:bg-accent-primary/20 transition">
                      <FileEdit className="w-6 h-6 text-accent-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-1">Front Page Editor</h3>
                      <p className="text-sm text-brand-text-muted">
                        Edit hero video, content sections, and image gallery
                      </p>
                    </div>
                  </div>
                  <Edit2 className="w-5 h-5 text-brand-text-muted group-hover:text-accent-primary transition" />
                </div>
              </Link>

              <div className="bg-section-subtle rounded-lg p-6 border border-section-border opacity-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="bg-neutral-400/10 p-3 rounded-lg">
                      <FileEdit className="w-6 h-6 text-neutral-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-1 text-brand-text-muted">About Page Editor</h3>
                      <p className="text-sm text-brand-text-muted">Coming soon...</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-section-subtle rounded-lg p-6 border border-section-border opacity-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="bg-neutral-400/10 p-3 rounded-lg">
                      <FileEdit className="w-6 h-6 text-neutral-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-1 text-brand-text-muted">Contact Page Editor</h3>
                      <p className="text-sm text-brand-text-muted">Coming soon...</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Enquiries Tab */}
        {activeTab === 'enquiries' && (
          <div>
            <div className="mb-6 flex justify-between items-center">
              <h2 className="text-xl font-bold">Enquiries</h2>
              <button
                onClick={refreshEnquiries}
                disabled={loadingEnquiries}
                className="flex items-center gap-2 bg-section-subtle hover:bg-section-emphasis disabled:bg-neutral-400 px-4 py-2 rounded-lg transition"
              >
                <RefreshCw className={`w-5 h-5 ${loadingEnquiries ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            {loadingEnquiries ? (
              <div className="text-center py-12 text-brand-text-muted">
                <Loader className="w-8 h-8 animate-spin mx-auto mb-4" />
                Loading enquiries...
              </div>
            ) : enquiries.length > 0 ? (
              <div className="grid gap-4">
                {enquiries.map((enquiry) => (
                  <div key={enquiry.id} className="bg-section-light rounded-lg p-6 border border-section-border hover:border-accent-primary transition">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold mb-2">{enquiry.subject}</h3>
                        <div className="space-y-2 text-sm text-brand-text-muted mb-3">
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4" />
                            {enquiry.email}
                          </div>
                          <div>From: {enquiry.name}</div>
                          <div className="text-xs text-brand-text-muted">{new Date(enquiry.created_at).toLocaleString()}</div>
                        </div>
                        <div className="inline-block px-3 py-1 bg-section-subtle rounded text-xs">
                          {enquiry.status}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteEnquiry(enquiry.id)}
                        className="bg-semantic-error-bg hover:bg-red-900/40 p-2 rounded-lg transition text-semantic-error"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-section-light rounded-lg border border-section-border">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 text-brand-text-muted" />
                <p className="text-brand-text-muted">No enquiries yet</p>
              </div>
            )}
          </div>
        )}

        {/* Stakeholders Tab */}
        {activeTab === 'stakeholders' && (
          <div>
            <div className="mb-6 flex justify-between items-center">
              <h2 className="text-xl font-bold">Stakeholder Registry</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setStakeholderPage(1);
                    setLoadingStakeholders(true);
                    const params = new URLSearchParams();
                    if (stakeholderSearch) params.set('q', stakeholderSearch);
                    if (stakeholderStatusFilter) params.set('status', stakeholderStatusFilter);
                    if (stakeholderVerifiedFilter) params.set('verified', stakeholderVerifiedFilter);
                    params.set('page', '1');
                    params.set('pageSize', '50');
                    fetch(`/api/stakeholders?${params.toString()}`)
                      .then(res => res.json())
                      .then((json: ListResponse) => {
                        setStakeholders(json.data || []);
                        setStakeholderCount(json.count || 0);
                        setLoadingStakeholders(false);
                      })
                      .catch(err => {
                        console.error('Error refreshing stakeholders:', err);
                        setLoadingStakeholders(false);
                      });
                  }}
                  disabled={loadingStakeholders}
                  className="flex items-center gap-2 bg-section-subtle hover:bg-section-emphasis disabled:bg-neutral-400 px-4 py-2 rounded-lg transition"
                >
                  <RefreshCw className={`w-5 h-5 ${loadingStakeholders ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
                <Link
                  href="/dashboard/admin/stakeholders/create"
                  className="flex items-center gap-2 bg-accent-primary hover:bg-accent-primary-hover px-4 py-2 rounded-lg transition"
                >
                  <Plus className="w-5 h-5" />
                  New Stakeholder
                </Link>
              </div>
            </div>

            {/* Filters */}
            <div className="grid gap-3 mb-4 md:grid-cols-3">
              <input
                className="px-3 py-2 bg-section-subtle border border-section-border rounded"
                placeholder="Search name or email"
                value={stakeholderSearch}
                onChange={(e) => { setStakeholderSearch(e.target.value); setStakeholderPage(1); }}
              />
              <select
                className="px-3 py-2 bg-section-subtle border border-section-border rounded"
                value={stakeholderStatusFilter}
                onChange={(e) => { setStakeholderStatusFilter(e.target.value); setStakeholderPage(1); }}
              >
                <option value="">All statuses</option>
                <option value="active">active</option>
                <option value="pending">pending</option>
                <option value="inactive">inactive</option>
                <option value="suspended">suspended</option>
              </select>
              <select
                className="px-3 py-2 bg-section-subtle border border-section-border rounded"
                value={stakeholderVerifiedFilter}
                onChange={(e) => { setStakeholderVerifiedFilter(e.target.value); setStakeholderPage(1); }}
              >
                <option value="">Verified: any</option>
                <option value="true">Verified</option>
                <option value="false">Unverified</option>
              </select>
            </div>

            {loadingStakeholders ? (
              <div className="text-center py-12 text-brand-text-muted">
                <Loader className="w-8 h-8 animate-spin mx-auto mb-4" />
                Loading stakeholders...
              </div>
            ) : stakeholders.length > 0 ? (
              <div className="bg-section-light border border-section-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-section-subtle">
                    <tr>
                      <th className="text-left p-3 border-b border-section-border">Reference</th>
                      <th className="text-left p-3 border-b border-section-border">Name</th>
                      <th className="text-left p-3 border-b border-section-border">Email</th>
                      <th className="text-left p-3 border-b border-section-border">Status</th>
                      <th className="text-left p-3 border-b border-section-border">Verified</th>
                      <th className="text-left p-3 border-b border-section-border">Created</th>
                      <th className="text-left p-3 border-b border-section-border">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stakeholders.map((s) => (
                      <tr key={s.id} className="hover:bg-section-subtle/50">
                        <td className="p-3 border-b border-section-border">{s.reference}</td>
                        <td className="p-3 border-b border-section-border">{s.name}</td>
                        <td className="p-3 border-b border-section-border">{s.email || '-'}</td>
                        <td className="p-3 border-b border-section-border">{s.status}</td>
                        <td className="p-3 border-b border-section-border">{s.is_verified ? 'Yes' : 'No'}</td>
                        <td className="p-3 border-b border-section-border">{new Date(s.created_at).toLocaleDateString()}</td>
                        <td className="p-3 border-b border-section-border">
                          <div className="flex gap-2">
                            <Link
                              className="px-2 py-1 bg-section-subtle border border-section-border rounded hover:bg-section-emphasis transition"
                              href={`/dashboard/admin/stakeholders/${s.id}/view`}
                            >
                              View
                            </Link>
                            <Link
                              className="px-2 py-1 bg-section-subtle border border-section-border rounded hover:bg-section-emphasis transition"
                              href={`/dashboard/admin/stakeholders/${s.id}/edit`}
                            >
                              Edit
                            </Link>
                            <Link
                              className="px-2 py-1 bg-section-subtle border border-section-border rounded hover:bg-section-emphasis transition"
                              href={`/dashboard/admin/stakeholders/${s.id}/roles`}
                            >
                              Roles
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 bg-section-light rounded-lg border border-section-border">
                <Users className="w-12 h-12 mx-auto mb-4 text-brand-text-muted" />
                <p className="text-brand-text-muted mb-4">No stakeholders found</p>
                <Link
                  href="/dashboard/admin/stakeholders/create"
                  className="inline-flex items-center gap-2 bg-accent-primary hover:bg-accent-primary-hover px-4 py-2 rounded-lg transition"
                >
                  <Plus className="w-5 h-5" />
                  Create First Stakeholder
                </Link>
              </div>
            )}

            {/* Pagination */}
            {stakeholders.length > 0 && (
              <div className="flex items-center justify-between mt-4 text-sm">
                <div>
                  Showing {(stakeholderPage - 1) * 50 + 1}–{(stakeholderPage - 1) * 50 + stakeholders.length} of {stakeholderCount}
                </div>
                <div className="flex gap-2">
                  <button
                    disabled={stakeholderPage <= 1}
                    onClick={() => setStakeholderPage((p) => p - 1)}
                    className="px-3 py-1 bg-section-subtle border border-section-border rounded disabled:opacity-50"
                  >
                    Prev
                  </button>
                  <span className="px-2 py-1">
                    Page {stakeholderPage} / {Math.max(1, Math.ceil(stakeholderCount / 50))}
                  </span>
                  <button
                    disabled={stakeholderPage >= Math.ceil(stakeholderCount / 50)}
                    onClick={() => setStakeholderPage((p) => p + 1)}
                    className="px-3 py-1 bg-section-subtle border border-section-border rounded disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}