'use client';

import React, { useState, useEffect } from 'react';
import { Menu, X, ChevronRight, Zap } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';

interface BlogPost {
  id: string;
  title: string;
  excerpt: string | null;
  slug: string;
  featured_image_url: string | null;
  published_at: string;
}

interface EnquiryForm {
  name: string;
  email: string;
  subject: string;
  message: string;
}

type EnquiryStatus = 'idle' | 'loading' | 'success' | 'error';

export default function VCStudioLanding() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [enquiryForm, setEnquiryForm] = useState<EnquiryForm>({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [enquiryStatus, setEnquiryStatus] = useState<EnquiryStatus>('idle');
  const [blogsLoading, setBlogsLoading] = useState(true);

  // Fetch featured blog posts on mount
  useEffect(() => {
    fetchBlogs();
  }, []);

  const fetchBlogs = async () => {
    try {
      setBlogsLoading(true);
      const { data, error } = await supabase
        .from('blog_posts')
        .select('id, title, excerpt, slug, featured_image_url, published_at')
        .eq('status', 'published')
        .eq('is_featured', true)
        .order('published_at', { ascending: false })
        .limit(3);

      if (error) {
        console.error('Supabase error fetching blogs:', error);
        throw error;
      }
      setBlogs(data || []);
    } catch (err) {
      console.error('Error fetching blogs:', err);
      if (err instanceof Error) {
        console.error('Error details:', err.message);
      }
      setBlogs([]);
    } finally {
      setBlogsLoading(false);
    }
  };

  const handleEnquiryChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEnquiryForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEnquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!enquiryForm.name || !enquiryForm.email || !enquiryForm.subject || !enquiryForm.message) {
      alert('Please fill in all fields');
      return;
    }

    try {
      setEnquiryStatus('loading');
      const { error } = await supabase
        .from('enquiries')
        .insert([
          {
            name: enquiryForm.name,
            email: enquiryForm.email,
            subject: enquiryForm.subject,
            message: enquiryForm.message,
            enquiry_type: 'general',
            status: 'new',
            priority: 'medium'
          }
        ]);

      if (error) throw error;

      setEnquiryStatus('success');
      setEnquiryForm({ name: '', email: '', subject: '', message: '' });
      setTimeout(() => setEnquiryStatus('idle'), 5000);
    } catch (err) {
      console.error('Error submitting enquiry:', err);
      setEnquiryStatus('error');
      setTimeout(() => setEnquiryStatus('idle'), 5000);
    }
  };

  return (
    <div className="min-h-screen bg-brand-background text-brand-text">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-section-light border-b border-section-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex-shrink-0 flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-accent-primary to-accent-secondary rounded-lg flex items-center justify-center shadow-md">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-brand-text">VC Studio</span>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex gap-8 items-center">
              <a href="#hero" className="text-brand-text-light hover:text-accent-primary transition font-medium">Home</a>
              <a href="#info" className="text-brand-text-light hover:text-accent-primary transition font-medium">About</a>
              <a href="#blogs" className="text-brand-text-light hover:text-accent-primary transition font-medium">Resources</a>
              <a href="#enquiry" className="text-brand-text-light hover:text-accent-primary transition font-medium">Contact</a>
              <Link href="/auth/login" className="text-brand-text-light hover:text-accent-primary transition font-medium">Admin</Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-brand-text"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden pb-4 space-y-2">
              <a href="#hero" className="block px-2 py-2 hover:bg-section-subtle rounded text-brand-text-light">Home</a>
              <a href="#info" className="block px-2 py-2 hover:bg-section-subtle rounded text-brand-text-light">About</a>
              <a href="#blogs" className="block px-2 py-2 hover:bg-section-subtle rounded text-brand-text-light">Resources</a>
              <a href="#enquiry" className="block px-2 py-2 hover:bg-section-subtle rounded text-brand-text-light">Contact</a>
              <Link href="/auth/login" className="block px-2 py-2 hover:bg-section-subtle rounded text-brand-text-light">Admin</Link>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section id="hero" className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-section-emphasis via-section-subtle to-section-light">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-accent-primary via-accent-secondary to-accent-primary bg-clip-text text-transparent">
            Value Chain Studio
          </h1>
          <p className="text-xl sm:text-2xl text-brand-text mb-8 max-w-3xl mx-auto font-semibold">
            Systematic business transformation through Value Chain Excellence Framework
          </p>
          <p className="text-brand-text-muted mb-12 max-w-2xl mx-auto text-lg">
            Map your business value creation, connect stakeholders, and deploy AI-enabled operations with proven methodology
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-accent-primary hover:bg-accent-primary-hover text-white px-8 py-3 rounded-lg font-semibold transition shadow-md hover:shadow-lg flex items-center justify-center gap-2">
              Get Started <ChevronRight size={20} />
            </button>
            <button className="bg-section-light border-2 border-accent-primary text-accent-primary hover:bg-section-emphasis px-8 py-3 rounded-lg font-semibold transition">
              Learn More
            </button>
          </div>
        </div>
      </section>

      {/* Information Block */}
      <section id="info" className="py-16 px-4 sm:px-6 lg:px-8 bg-section-light border-t border-section-border">
        <div className="max-w-7xl mx-auto">
          <div className="bg-section-subtle rounded-xl p-8 sm:p-12 border border-section-border shadow-sm">
            <h2 className="text-3xl font-bold mb-6 text-brand-text">What is VC Studio?</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-semibold text-accent-primary mb-4">VCEF Methodology</h3>
                <p className="text-brand-text-light leading-relaxed">
                  Value Chain Evolution Framework provides a systematic L0-L6 mapping of your business.
                  Understand how value flows through your organisation from strategic vision to operational execution.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-accent-secondary mb-4">AI-Powered Intelligence</h3>
                <p className="text-brand-text-light leading-relaxed">
                  Knowledge Domain Architecture transforms business intelligence into actionable AI-enhanced operations.
                  Deploy agents where they create measurable value while preserving human expertise.
                </p>
              </div>
            </div>
            <div className="mt-8 p-6 bg-semantic-info-bg rounded-lg border border-accent-primary/30">
              <p className="text-brand-text">
                <span className="text-accent-primary font-semibold">Stage 1 Focus:</span> Build your Value Chain Model by mapping domains, sub-domains,
                and stakeholders within a unified knowledge infrastructure.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Blog Section */}
      <section id="blogs" className="py-16 px-4 sm:px-6 lg:px-8 bg-section-subtle border-t border-section-border">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12">
            <h2 className="text-3xl font-bold mb-2 text-brand-text">Latest Resources</h2>
            <p className="text-brand-text-muted">Featured articles and insights</p>
          </div>

          {blogsLoading ? (
            <div className="text-center py-12">
              <p className="text-brand-text-muted">Loading resources...</p>
            </div>
          ) : blogs.length > 0 ? (
            <div className="grid md:grid-cols-3 gap-6">
              {blogs.map((blog) => (
                <Link
                  key={blog.id}
                  href={`/blog/${blog.id}`}
                >
                  <article className="bg-section-light rounded-lg overflow-hidden border border-section-border hover:border-accent-primary transition-all duration-300 group cursor-pointer shadow-sm hover:shadow-md h-full">
                    {blog.featured_image_url && (
                      <div className="h-48 bg-gradient-to-br from-accent-primary to-accent-secondary overflow-hidden">
                        <img
                          src={blog.featured_image_url}
                          alt={blog.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}
                    <div className="p-6">
                      <h3 className="text-lg font-semibold mb-2 text-brand-text group-hover:text-accent-primary transition">
                        {blog.title}
                      </h3>
                      <p className="text-brand-text-muted text-sm mb-4 line-clamp-2">
                        {blog.excerpt || 'Read full article for details...'}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-brand-text-muted">
                          {new Date(blog.published_at).toLocaleDateString()}
                        </span>
                        <ChevronRight size={16} className="text-accent-primary group-hover:translate-x-1 transition" />
                      </div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-section-light rounded-lg border border-section-border">
              <p className="text-brand-text-muted">No featured resources available yet</p>
            </div>
          )}
        </div>
      </section>

      {/* Enquiry Section */}
      <section id="enquiry" className="py-16 px-4 sm:px-6 lg:px-8 bg-section-light border-t border-section-border">
        <div className="max-w-2xl mx-auto">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold mb-2 text-brand-text">Get in Touch</h2>
            <p className="text-brand-text-muted">Have questions? We&apos;d love to hear from you</p>
          </div>

          <form onSubmit={handleEnquirySubmit} className="bg-section-subtle rounded-xl p-8 border border-section-border shadow-sm">
            <div className="space-y-6">
              {/* Name Field */}
              <div>
                <label className="block text-sm font-semibold mb-2 text-brand-text">Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={enquiryForm.name}
                  onChange={handleEnquiryChange}
                  placeholder="Your name"
                  className="w-full px-4 py-3 bg-section-light border border-section-border rounded-lg focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 text-brand-text placeholder-brand-text-muted transition"
                />
              </div>

              {/* Email Field */}
              <div>
                <label className="block text-sm font-semibold mb-2 text-brand-text">Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={enquiryForm.email}
                  onChange={handleEnquiryChange}
                  placeholder="your@email.com"
                  className="w-full px-4 py-3 bg-section-light border border-section-border rounded-lg focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 text-brand-text placeholder-brand-text-muted transition"
                />
              </div>

              {/* Subject Field */}
              <div>
                <label className="block text-sm font-semibold mb-2 text-brand-text">Subject</label>
                <input
                  type="text"
                  name="subject"
                  value={enquiryForm.subject}
                  onChange={handleEnquiryChange}
                  placeholder="What is this about?"
                  className="w-full px-4 py-3 bg-section-light border border-section-border rounded-lg focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 text-brand-text placeholder-brand-text-muted transition"
                />
              </div>

              {/* Message Field */}
              <div>
                <label className="block text-sm font-semibold mb-2 text-brand-text">Message</label>
                <textarea
                  name="message"
                  value={enquiryForm.message}
                  onChange={handleEnquiryChange}
                  placeholder="Tell us more..."
                  rows={5}
                  className="w-full px-4 py-3 bg-section-light border border-section-border rounded-lg focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 text-brand-text placeholder-brand-text-muted transition resize-none"
                />
              </div>

              {/* Status Messages */}
              {enquiryStatus === 'success' && (
                <div className="bg-semantic-success-bg border border-semantic-success text-semantic-success px-4 py-3 rounded-lg">
                  Thank you! Your enquiry has been submitted successfully.
                </div>
              )}
              {enquiryStatus === 'error' && (
                <div className="bg-semantic-error-bg border border-semantic-error text-semantic-error px-4 py-3 rounded-lg">
                  Error submitting enquiry. Please try again.
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={enquiryStatus === 'loading'}
                className="w-full bg-accent-primary hover:bg-accent-primary-hover disabled:bg-neutral-400 text-white px-6 py-3 rounded-lg font-semibold transition shadow-md hover:shadow-lg"
              >
                {enquiryStatus === 'loading' ? 'Sending...' : 'Send Enquiry'}
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-section-emphasis border-t border-section-border py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="font-semibold mb-4 text-brand-text">VC Studio</h3>
              <p className="text-brand-text-muted text-sm">Systematic business transformation methodology</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-brand-text">Quick Links</h4>
              <ul className="space-y-2 text-brand-text-muted text-sm">
                <li><a href="#" className="hover:text-accent-primary transition">Documentation</a></li>
                <li><a href="#" className="hover:text-accent-primary transition">Pricing</a></li>
                <li><a href="#" className="hover:text-accent-primary transition">Support</a></li>
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
