'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { ChevronRight, Calendar, User, ArrowLeft, Home } from 'lucide-react';
import Link from 'next/link';

interface BlogPost {
  id: string;
  title: string;
  content: string;
  excerpt: string | null;
  slug: string;
  featured_image_url: string | null;
  published_at: string;
  status: string;
  author_id: string | null;
  created_at: string;
  updated_at: string;
}

export default function BlogDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [blog, setBlog] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (params.id) {
      fetchBlogPost(params.id as string);
    }
  }, [params.id]);

  const fetchBlogPost = async (id: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      if (!data) {
        setError('Blog post not found');
        return;
      }

      setBlog(data);
    } catch (err) {
      console.error('Error fetching blog post:', err);
      setError('Failed to load blog post');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-background text-brand-text flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-accent-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-brand-text-muted">Loading article...</p>
        </div>
      </div>
    );
  }

  if (error || !blog) {
    return (
      <div className="min-h-screen bg-brand-background text-brand-text flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-semantic-error-bg rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl text-semantic-error">!</span>
          </div>
          <h1 className="text-2xl font-bold mb-2 text-brand-text">Article Not Found</h1>
          <p className="text-brand-text-muted mb-6">{error || 'The article you are looking for does not exist.'}</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-accent-primary hover:bg-accent-primary-hover text-white px-6 py-3 rounded-lg font-semibold transition shadow-md hover:shadow-lg"
          >
            <Home className="w-5 h-5" />
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-background text-brand-text">
      {/* Navigation Bar */}
      <nav className="sticky top-0 z-50 bg-section-light border-b border-section-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-accent-primary to-accent-secondary rounded-lg flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-sm">VC</span>
              </div>
              <span className="text-xl font-bold text-brand-text">VC Studio</span>
            </Link>
            <Link
              href="/"
              className="text-brand-text-light hover:text-accent-primary transition font-medium flex items-center gap-2"
            >
              <Home className="w-4 h-4" />
              Home
            </Link>
          </div>
        </div>
      </nav>

      {/* Breadcrumbs */}
      <div className="bg-section-subtle border-b border-section-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <nav className="flex items-center gap-2 text-sm">
            <Link href="/" className="text-brand-text-muted hover:text-accent-primary transition font-medium">
              Home
            </Link>
            <ChevronRight className="w-4 h-4 text-brand-text-muted" />
            <Link href="/#blogs" className="text-brand-text-muted hover:text-accent-primary transition font-medium">
              Resources
            </Link>
            <ChevronRight className="w-4 h-4 text-brand-text-muted" />
            <span className="text-brand-text font-medium truncate max-w-md">{blog.title}</span>
          </nav>
        </div>
      </div>

      {/* Back Link */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-brand-text-muted hover:text-accent-primary transition font-medium group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition" />
          Back to Resources
        </button>
      </div>

      {/* Article Content */}
      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Featured Image */}
        {blog.featured_image_url && (
          <div className="mb-8 rounded-xl overflow-hidden shadow-md border border-section-border">
            <img
              src={blog.featured_image_url}
              alt={blog.title}
              className="w-full h-96 object-cover"
            />
          </div>
        )}

        {/* Article Header */}
        <header className="mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4 text-brand-text leading-tight">
            {blog.title}
          </h1>

          {blog.excerpt && (
            <p className="text-xl text-brand-text-light mb-6 leading-relaxed">
              {blog.excerpt}
            </p>
          )}

          {/* Meta Information */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-brand-text-muted border-t border-b border-section-border py-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <time dateTime={blog.published_at}>
                {new Date(blog.published_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </time>
            </div>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span>VC Studio Team</span>
            </div>
            <div className="ml-auto">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                blog.status === 'published'
                  ? 'bg-semantic-success-bg text-semantic-success'
                  : 'bg-neutral-100 text-neutral-600'
              }`}>
                {blog.status}
              </span>
            </div>
          </div>
        </header>

        {/* Article Body */}
        <div className="prose prose-lg max-w-none">
          <div
            className="text-brand-text leading-relaxed space-y-6"
            style={{
              fontSize: '1.125rem',
              lineHeight: '1.75rem'
            }}
          >
            {/* Rich text content - preserving line breaks and paragraphs */}
            {blog.content.split('\n\n').map((paragraph, index) => (
              <p key={index} className="mb-4 text-brand-text-light">
                {paragraph}
              </p>
            ))}
          </div>
        </div>

        {/* Article Footer */}
        <footer className="mt-12 pt-8 border-t border-section-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-brand-text-muted">
                Last updated: {new Date(blog.updated_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
            <Link
              href="/#blogs"
              className="inline-flex items-center gap-2 text-accent-primary hover:text-accent-primary-hover font-medium transition"
            >
              More Articles
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </footer>
      </article>

      {/* Call to Action */}
      <section className="bg-section-emphasis border-t border-section-border mt-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-gradient-to-br from-accent-primary to-accent-secondary rounded-xl p-8 sm:p-12 text-center text-white shadow-lg">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">
              Ready to Transform Your Business?
            </h2>
            <p className="text-lg mb-6 text-white/90 max-w-2xl mx-auto">
              Discover how Value Chain Studio can help you map, optimize, and deploy AI-enabled operations.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/#enquiry"
                className="inline-flex items-center justify-center gap-2 bg-white text-accent-primary hover:bg-gray-50 px-8 py-3 rounded-lg font-semibold transition shadow-md hover:shadow-lg"
              >
                Get in Touch
                <ChevronRight className="w-5 h-5" />
              </Link>
              <Link
                href="/#info"
                className="inline-flex items-center justify-center gap-2 bg-transparent border-2 border-white text-white hover:bg-white/10 px-8 py-3 rounded-lg font-semibold transition"
              >
                Learn More
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-section-light border-t border-section-border py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="font-semibold mb-4 text-brand-text">VC Studio</h3>
              <p className="text-brand-text-muted text-sm">Systematic business transformation methodology</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-brand-text">Quick Links</h4>
              <ul className="space-y-2 text-brand-text-muted text-sm">
                <li><Link href="/#info" className="hover:text-accent-primary transition">About</Link></li>
                <li><Link href="/#blogs" className="hover:text-accent-primary transition">Resources</Link></li>
                <li><Link href="/#enquiry" className="hover:text-accent-primary transition">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-brand-text">Company</h4>
              <ul className="space-y-2 text-brand-text-muted text-sm">
                <li><a href="#" className="hover:text-accent-primary transition">About</a></li>
                <li><a href="#" className="hover:text-accent-primary transition">Blog</a></li>
                <li><a href="#" className="hover:text-accent-primary transition">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-brand-text">Legal</h4>
              <ul className="space-y-2 text-brand-text-muted text-sm">
                <li><a href="#" className="hover:text-accent-primary transition">Privacy</a></li>
                <li><a href="#" className="hover:text-accent-primary transition">Terms</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-section-border pt-8 text-center text-brand-text-muted text-sm">
            <p>&copy; 2025 VC Studio. Powered by ITS Group. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
