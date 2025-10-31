'use client';

import { useEffect, useState} from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { supabase } from '@/lib/supabase/client';
import { Plus, Trash2, Edit2, Mail, MessageSquare, LogOut, Loader } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'blogs' | 'enquiries'>('blogs');
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

        if (error) throw error;
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
    await signOut();
    router.push('/');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-2xl font-bold">VC Studio Admin</h1>
              <p className="text-gray-400 text-sm">{user.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg transition"
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
        <div className="flex gap-4 mb-8 border-b border-gray-800">
          <button
            onClick={() => setActiveTab('blogs')}
            className={`px-4 py-2 font-semibold transition ${
              activeTab === 'blogs'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Blog Posts ({blogs.length})
          </button>
          <button
            onClick={() => setActiveTab('enquiries')}
            className={`px-4 py-2 font-semibold transition ${
              activeTab === 'enquiries'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Enquiries ({enquiries.length})
          </button>
        </div>

        {/* Blogs Tab */}
        {activeTab === 'blogs' && (
          <div>
            <div className="mb-6 flex justify-between items-center">
              <h2 className="text-xl font-bold">Manage Blog Posts</h2>
              <Link
                href="/dashboard/blog/new"
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition"
              >
                <Plus className="w-5 h-5" />
                New Post
              </Link>
            </div>

            {loadingBlogs ? (
              <div className="text-center py-12 text-gray-400">
                <Loader className="w-8 h-8 animate-spin mx-auto mb-4" />
                Loading blog posts...
              </div>
            ) : blogs.length > 0 ? (
              <div className="grid gap-4">
                {blogs.map((blog) => (
                  <div key={blog.id} className="bg-gray-900 rounded-lg p-6 border border-gray-800 hover:border-blue-500 transition">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold mb-2">{blog.title}</h3>
                        <p className="text-gray-400 text-sm mb-3 line-clamp-2">{blog.excerpt}</p>
                        <div className="flex gap-4 text-xs text-gray-500">
                          <span>Status: {blog.status}</span>
                          <span>Featured: {blog.is_featured ? 'Yes' : 'No'}</span>
                          <span>{new Date(blog.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Link
                          href={`/dashboard/blog/${blog.id}`}
                          className="bg-gray-800 hover:bg-gray-700 p-2 rounded-lg transition"
                        >
                          <Edit2 className="w-5 h-5" />
                        </Link>
                        <button
                          onClick={() => handleDeleteBlog(blog.id)}
                          className="bg-red-900/20 hover:bg-red-900/40 p-2 rounded-lg transition text-red-400"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-900 rounded-lg border border-gray-800">
                <p className="text-gray-400 mb-4">No blog posts yet</p>
                <Link
                  href="/dashboard/blog/new"
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition"
                >
                  <Plus className="w-5 h-5" />
                  Create First Post
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Enquiries Tab */}
        {activeTab === 'enquiries' && (
          <div>
            <h2 className="text-xl font-bold mb-6">Enquiries</h2>

            {loadingEnquiries ? (
              <div className="text-center py-12 text-gray-400">
                <Loader className="w-8 h-8 animate-spin mx-auto mb-4" />
                Loading enquiries...
              </div>
            ) : enquiries.length > 0 ? (
              <div className="grid gap-4">
                {enquiries.map((enquiry) => (
                  <div key={enquiry.id} className="bg-gray-900 rounded-lg p-6 border border-gray-800 hover:border-blue-500 transition">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold mb-2">{enquiry.subject}</h3>
                        <div className="space-y-2 text-sm text-gray-400 mb-3">
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4" />
                            {enquiry.email}
                          </div>
                          <div>From: {enquiry.name}</div>
                          <div className="text-xs text-gray-500">{new Date(enquiry.created_at).toLocaleString()}</div>
                        </div>
                        <div className="inline-block px-3 py-1 bg-gray-800 rounded text-xs">
                          {enquiry.status}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteEnquiry(enquiry.id)}
                        className="bg-red-900/20 hover:bg-red-900/40 p-2 rounded-lg transition text-red-400"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-900 rounded-lg border border-gray-800">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-500" />
                <p className="text-gray-400">No enquiries yet</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}