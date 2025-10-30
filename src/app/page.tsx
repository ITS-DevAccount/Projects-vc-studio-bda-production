'use client';

import React, { useState, useEffect } from 'react';
import { Menu, X, ChevronRight, Zap } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

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

      if (error) throw error;
      setBlogs(data || []);
    } catch (err) {
      console.error('Error fetching blogs:', err);
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
    <div className="min-h-screen bg-black text-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-black border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex-shrink-0 flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5" />
              </div>
              <span className="text-xl font-bold">VC Studio</span>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex gap-8 items-center">
              <a href="#hero" className="hover:text-blue-400 transition">Home</a>
              <a href="#info" className="hover:text-blue-400 transition">About</a>
              <a href="#blogs" className="hover:text-blue-400 transition">Resources</a>
              <a href="#enquiry" className="hover:text-blue-400 transition">Contact</a>
            </div>

            {/* Mobile Menu Button */}
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden pb-4 space-y-2">
              <a href="#hero" className="block px-2 py-2 hover:bg-gray-900 rounded">Home</a>
              <a href="#info" className="block px-2 py-2 hover:bg-gray-900 rounded">About</a>
              <a href="#blogs" className="block px-2 py-2 hover:bg-gray-900 rounded">Resources</a>
              <a href="#enquiry" className="block px-2 py-2 hover:bg-gray-900 rounded">Contact</a>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section id="hero" className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-gray-900 via-black to-gray-900">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
            Value Chain Studio
          </h1>
          <p className="text-xl sm:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto">
            Systematic business transformation through Value Chain Excellence Framework
          </p>
          <p className="text-gray-400 mb-12 max-w-2xl mx-auto">
            Map your business value creation, connect stakeholders, and deploy AI-enabled operations with proven methodology
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-blue-600 hover:bg-blue-700 px-8 py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2">
              Get Started <ChevronRight size={20} />
            </button>
            <button className="bg-gray-800 hover:bg-gray-700 px-8 py-3 rounded-lg font-semibold transition">
              Learn More
            </button>
          </div>
        </div>
      </section>

      {/* Information Block */}
      <section id="info" className="py-16 px-4 sm:px-6 lg:px-8 bg-black border-t border-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="bg-gradient-to-br from-gray-900 to-black rounded-xl p-8 sm:p-12 border border-gray-800">
            <h2 className="text-3xl font-bold mb-6">What is VC Studio?</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-semibold text-blue-400 mb-4">VCEF Methodology</h3>
                <p className="text-gray-300 leading-relaxed">
                  Value Chain Evolution Framework provides a systematic L0-L6 mapping of your business. 
                  Understand how value flows through your organisation from strategic vision to operational execution.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-purple-400 mb-4">AI-Powered Intelligence</h3>
                <p className="text-gray-300 leading-relaxed">
                  Knowledge Domain Architecture transforms business intelligence into actionable AI-enhanced operations. 
                  Deploy agents where they create measurable value while preserving human expertise.
                </p>
              </div>
            </div>
            <div className="mt-8 p-6 bg-black rounded-lg border border-blue-900/50">
              <p className="text-gray-300">
                <span className="text-blue-400 font-semibold">Stage 1 Focus:</span> Build your Value Chain Model by mapping domains, sub-domains, 
                and stakeholders within a unified knowledge infrastructure.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Blog Section */}
      <section id="blogs" className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-900/50 border-t border-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12">
            <h2 className="text-3xl font-bold mb-2">Latest Resources</h2>
            <p className="text-gray-400">Featured articles and insights</p>
          </div>

          {blogsLoading ? (
            <div className="text-center py-12">
              <p className="text-gray-400">Loading resources...</p>
            </div>
          ) : blogs.length > 0 ? (
            <div className="grid md:grid-cols-3 gap-6">
              {blogs.map((blog) => (
                <article 
                  key={blog.id} 
                  className="bg-black rounded-lg overflow-hidden border border-gray-800 hover:border-blue-500 transition group cursor-pointer"
                >
                  {blog.featured_image_url && (
                    <div className="h-48 bg-gradient-to-br from-blue-900 to-purple-900 overflow-hidden">
                      <img 
                        src={blog.featured_image_url} 
                        alt={blog.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition"
                      />
                    </div>
                  )}
                  <div className="p-6">
                    <h3 className="text-lg font-semibold mb-2 group-hover:text-blue-400 transition">
                      {blog.title}
                    </h3>
                    <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                      {blog.excerpt || 'Read full article for details...'}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        {new Date(blog.published_at).toLocaleDateString()}
                      </span>
                      <ChevronRight size={16} className="group-hover:translate-x-1 transition" />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-black rounded-lg border border-gray-800">
              <p className="text-gray-400">No featured resources available yet</p>
            </div>
          )}
        </div>
      </section>

      {/* Enquiry Section */}
      <section id="enquiry" className="py-16 px-4 sm:px-6 lg:px-8 bg-black border-t border-gray-800">
        <div className="max-w-2xl mx-auto">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold mb-2">Get in Touch</h2>
            <p className="text-gray-400">Have questions? We&apos;d love to hear from you</p>
          </div>

          <form onSubmit={handleEnquirySubmit} className="bg-gradient-to-br from-gray-900 to-black rounded-xl p-8 border border-gray-800">
            <div className="space-y-6">
              {/* Name Field */}
              <div>
                <label className="block text-sm font-semibold mb-2">Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={enquiryForm.name}
                  onChange={handleEnquiryChange}
                  placeholder="Your name"
                  className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none text-white placeholder-gray-500 transition"
                />
              </div>

              {/* Email Field */}
              <div>
                <label className="block text-sm font-semibold mb-2">Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={enquiryForm.email}
                  onChange={handleEnquiryChange}
                  placeholder="your@email.com"
                  className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none text-white placeholder-gray-500 transition"
                />
              </div>

              {/* Subject Field */}
              <div>
                <label className="block text-sm font-semibold mb-2">Subject</label>
                <input
                  type="text"
                  name="subject"
                  value={enquiryForm.subject}
                  onChange={handleEnquiryChange}
                  placeholder="What is this about?"
                  className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none text-white placeholder-gray-500 transition"
                />
              </div>

              {/* Message Field */}
              <div>
                <label className="block text-sm font-semibold mb-2">Message</label>
                <textarea
                  name="message"
                  value={enquiryForm.message}
                  onChange={handleEnquiryChange}
                  placeholder="Tell us more..."
                  rows={5}
                  className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none text-white placeholder-gray-500 transition resize-none"
                />
              </div>

              {/* Status Messages */}
              {enquiryStatus === 'success' && (
                <div className="bg-green-900/20 border border-green-500 text-green-300 px-4 py-3 rounded-lg">
                  Thank you! Your enquiry has been submitted successfully.
                </div>
              )}
              {enquiryStatus === 'error' && (
                <div className="bg-red-900/20 border border-red-500 text-red-300 px-4 py-3 rounded-lg">
                  Error submitting enquiry. Please try again.
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={enquiryStatus === 'loading'}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 px-6 py-3 rounded-lg font-semibold transition"
              >
                {enquiryStatus === 'loading' ? 'Sending...' : 'Send Enquiry'}
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black border-t border-gray-800 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="font-semibold mb-4">VC Studio</h3>
              <p className="text-gray-400 text-sm">Systematic business transformation methodology</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="#" className="hover:text-blue-400">Documentation</a></li>
                <li><a href="#" className="hover:text-blue-400">Pricing</a></li>
                <li><a href="#" className="hover:text-blue-400">Support</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="#" className="hover:text-blue-400">About</a></li>
                <li><a href="#" className="hover:text-blue-400">Blog</a></li>
                <li><a href="#" className="hover:text-blue-400">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="#" className="hover:text-blue-400">Privacy</a></li>
                <li><a href="#" className="hover:text-blue-400">Terms</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-gray-400 text-sm">
            <p>&copy; 2025 VC Studio. Powered by ITS Group. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}