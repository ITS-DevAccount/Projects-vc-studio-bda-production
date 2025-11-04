'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { supabase } from '@/lib/supabase/client';
import { Plus, Trash2, Edit2, Mail, MessageSquare, LogOut, Loader, RefreshCw, FileEdit, Palette } from 'lucide-react';
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

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<'blogs' | 'enquiries' | 'pages'>('blogs');
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loadingBlogs, setLoadingBlogs] = useState(true);
  const [loadingEnquiries, setLoadingEnquiries] = useState(true);
  
  // Check authentication
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  // Fetch blogs
  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        const { data, error } = await supabase
          .from('blog_posts')
          .select('*')
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
  }, []);

  // Fetch enquiries
  useEffect(() => {
    const fetchEnquiries = async () => {
      try {
        const { data, error } = await supabase
          .from('enquiries')
          .select('*')
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
  }, []);

  const handleDeleteBlog = async (id: string) => {
    if (!confirm('Are you sure you want to delete this blog post?')) return;

    try {
      const { error } = await supabase.from('blog_posts').delete().eq('id', id);
      if (error) throw error;
      setBlogs(blogs.filter((b) => b.id !== id));
    } catch (err) {
      alert('Error deleting blog post');
    }
  };

  const handleDeleteEnquiry = async (id: string) => {
    if (!confirm('Are you sure you want to delete this enquiry?')) return;

    try {
      const { error } = await supabase.from('enquiries').delete().eq('id', id);
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
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
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
      </div>
    </div>
  );
}