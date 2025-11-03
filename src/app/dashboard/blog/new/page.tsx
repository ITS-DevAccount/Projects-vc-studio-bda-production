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
    <div className="min-h-screen bg-brand-background text-brand-text">
      {/* Header */}
      <header className="bg-section-light border-b border-section-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 h-16">
            <Link href="/dashboard" className="hover:text-accent-primary transition text-brand-text">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <h1 className="text-2xl font-bold text-brand-text">Create New Blog Post</h1>
          </div>
        </div>
      </header>

      {/* Form */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="bg-section-light rounded-xl p-8 border border-section-border shadow-sm space-y-6">
          {error && (
            <div className="bg-semantic-error-bg border border-semantic-error text-semantic-error px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-semibold mb-2 text-brand-text">Title *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Blog post title"
              className="w-full px-4 py-3 bg-section-subtle border border-section-border rounded-lg focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 text-brand-text placeholder-brand-text-muted transition"
            />
          </div>

          {/* Excerpt */}
          <div>
            <label className="block text-sm font-semibold mb-2 text-brand-text">Excerpt *</label>
            <textarea
              name="excerpt"
              value={formData.excerpt}
              onChange={handleChange}
              placeholder="Brief summary of the post"
              rows={3}
              className="w-full px-4 py-3 bg-section-subtle border border-section-border rounded-lg focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 text-brand-text placeholder-brand-text-muted transition resize-none"
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-semibold mb-2 text-brand-text">Content *</label>
            <textarea
              name="content"
              value={formData.content}
              onChange={handleChange}
              placeholder="Full blog post content"
              rows={8}
              className="w-full px-4 py-3 bg-section-subtle border border-section-border rounded-lg focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 text-brand-text placeholder-brand-text-muted transition resize-none"
            />
          </div>

          {/* Featured Image URL */}
          <div>
            <label className="block text-sm font-semibold mb-2 text-brand-text">Featured Image URL</label>
            <input
              type="url"
              name="featured_image_url"
              value={formData.featured_image_url}
              onChange={handleChange}
              placeholder="https://example.com/image.jpg"
              className="w-full px-4 py-3 bg-section-subtle border border-section-border rounded-lg focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 text-brand-text placeholder-brand-text-muted transition"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-semibold mb-2 text-brand-text">Status</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-section-subtle border border-section-border rounded-lg focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 text-brand-text transition"
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
              className="w-5 h-5 bg-section-subtle border border-section-border rounded cursor-pointer accent-accent-primary"
            />
            <label htmlFor="featured" className="text-sm font-semibold cursor-pointer text-brand-text">
              Featured post (display on homepage)
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-accent-primary hover:bg-accent-primary-hover disabled:bg-neutral-400 text-white px-6 py-3 rounded-lg font-semibold transition shadow-md hover:shadow-lg flex items-center justify-center gap-2"
            >
              {loading && <Loader className="w-5 h-5 animate-spin" />}
              {loading ? 'Creating...' : 'Create Post'}
            </button>
            <Link
              href="/dashboard"
              className="flex-1 bg-section-subtle hover:bg-section-emphasis text-brand-text px-6 py-3 rounded-lg font-semibold transition text-center border border-section-border"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}