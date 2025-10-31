'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { supabase } from '@/lib/supabase/client';
import { ArrowLeft, Loader } from 'lucide-react';
import Link from 'next/link';

export default function NewBlogPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    excerpt: '',
    content: '',
    featured_image_url: '',
    is_featured: false,
    status: 'draft',
  });

  if (!user) {
    return null;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!formData.title || !formData.excerpt || !formData.content) {
        throw new Error('Please fill in required fields');
      }

      const { error: insertError } = await supabase.from('blog_posts').insert([
        {
          title: formData.title,
          excerpt: formData.excerpt,
          content: formData.content,
          featured_image_url: formData.featured_image_url || null,
          is_featured: formData.is_featured,
          status: formData.status,
          published_at: formData.status === 'published' ? new Date().toISOString() : null,
          slug: formData.title.toLowerCase().replace(/\s+/g, '-'),
        },
      ]);

      if (insertError) throw insertError;
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creating blog post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 h-16">
            <Link href="/dashboard" className="hover:text-blue-400 transition">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <h1 className="text-2xl font-bold">Create New Blog Post</h1>
          </div>
        </div>
      </header>

      {/* Form */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="bg-gray-900 rounded-xl p-8 border border-gray-800 space-y-6">
          {error && (
            <div className="bg-red-900/20 border border-red-500 text-red-300 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-semibold mb-2">Title *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Blog post title"
              className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none text-white placeholder-gray-500 transition"
            />
          </div>

          {/* Excerpt */}
          <div>
            <label className="block text-sm font-semibold mb-2">Excerpt *</label>
            <textarea
              name="excerpt"
              value={formData.excerpt}
              onChange={handleChange}
              placeholder="Brief summary of the post"
              rows={3}
              className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none text-white placeholder-gray-500 transition resize-none"
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-semibold mb-2">Content *</label>
            <textarea
              name="content"
              value={formData.content}
              onChange={handleChange}
              placeholder="Full blog post content"
              rows={8}
              className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none text-white placeholder-gray-500 transition resize-none"
            />
          </div>

          {/* Featured Image URL */}
          <div>
            <label className="block text-sm font-semibold mb-2">Featured Image URL</label>
            <input
              type="url"
              name="featured_image_url"
              value={formData.featured_image_url}
              onChange={handleChange}
              placeholder="https://example.com/image.jpg"
              className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none text-white placeholder-gray-500 transition"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-semibold mb-2">Status</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none text-white transition"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>

          {/* Featured */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="featured"
              name="is_featured"
              checked={formData.is_featured}
              onChange={handleChange}
              className="w-5 h-5 bg-black border border-gray-700 rounded cursor-pointer"
            />
            <label htmlFor="featured" className="text-sm font-semibold cursor-pointer">
              Featured post (display on homepage)
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 px-6 py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2"
            >
              {loading && <Loader className="w-5 h-5 animate-spin" />}
              {loading ? 'Creating...' : 'Create Post'}
            </button>
            <Link
              href="/dashboard"
              className="flex-1 bg-gray-800 hover:bg-gray-700 px-6 py-3 rounded-lg font-semibold transition text-center"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}