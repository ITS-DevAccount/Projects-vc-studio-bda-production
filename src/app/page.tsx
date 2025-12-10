'use client';

import { useState, useEffect } from 'react';
import { Menu, X, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useAppUuid } from '@/contexts/AppContext';
import Link from 'next/link';
import VideoPlayer from '@/components/media/VideoPlayer';
import ImageGallery from '@/components/media/ImageGallery';
import Logo from '@/components/branding/Logo';

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

interface PageSettings {
  hero_video_url: string;
  hero_video_public_id: string;
  hero_title: string;
  hero_subtitle: string;
  hero_description: string;
  hero_cta_primary_text: string;
  hero_cta_secondary_text: string;
  info_section_title: string;
  info_block_1_title: string;
  info_block_1_content: string;
  info_block_2_title: string;
  info_block_2_content: string;
  info_highlight_text: string;
  gallery_section_title: string;
  gallery_section_subtitle: string;
}

interface PageImage {
  id: string;
  cloudinary_url: string;
  public_id: string;
  alt_text: string;
  title: string;
  caption: string;
  display_order: number;
  is_active: boolean;
}

type EnquiryStatus = 'idle' | 'loading' | 'success' | 'error';

/**
 * HeroButtons Component
 * Fetches and renders CTA buttons from page_cta_placements table
 * Uses the Page Editor system - no config files or env vars needed
 */
// Type for RPC response format (flattened structure)
interface RPCPlacement {
  placement_id: string;
  cta_button_id: string;
  section: string;
  sort_order: number;
  // Flattened button fields
  label?: string;
  href?: string;
  variant?: string;
  icon_name?: string;
  analytics_event?: string;
}

interface HeroButtonsProps {
  pageSettingsId?: string;
}

function HeroButtons({ pageSettingsId }: HeroButtonsProps) {
  const [placements, setPlacements] = useState<RPCPlacement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchPlacements = async () => {
      try {
        // Use pageSettingsId prop (from page settings already fetched)
        if (!pageSettingsId) {
          // No page ID available - silently skip (no buttons will show)
          if (isMounted) setLoading(false);
          return;
        }

        console.log('[HeroButtons] Fetching placements for page:', pageSettingsId);
        const res = await fetch(`/api/page-settings/${pageSettingsId}/cta-placements`);
        const data = await res.json();

        console.log('[HeroButtons] API Response:', data);

        if (isMounted && data.success) {
          // Filter for hero section and sort by sort_order
          // Handle RPC response format (flattened structure with placement_id)
          const heroPlacements = (data.data || [])
            .filter((p: any) => (p.section || (p as any).section) === 'hero')
            .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
          
          console.log('[HeroButtons] Filtered hero placements:', heroPlacements);
          setPlacements(heroPlacements);
        }
      } catch (err) {
        console.error('[HeroButtons Error]:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchPlacements();

    return () => {
      isMounted = false;
    };
  }, [pageSettingsId]);

  // Always return a stable container to prevent layout shifts
  return (
    <div className="flex flex-col sm:flex-row gap-4 justify-center">
      {loading ? (
        <>
          <div className="h-12 w-32 bg-white/20 rounded-lg animate-pulse" />
          <div className="h-12 w-32 bg-white/20 rounded-lg animate-pulse" />
        </>
      ) : placements && placements.length > 0 ? (
        placements.map((placement) => {
          // Handle RPC response format (flattened structure)
          const placementId = (placement as any).placement_id || (placement as any).id;
          const label = placement.label || 'Button';
          const href = placement.href || '#';
          const variant = placement.variant || 'primary';
          const iconName = placement.icon_name;
          const analyticsEvent = placement.analytics_event;
          const isPrimary = variant === 'primary';

          // Check if link is external (starts with http:// or https:// and is not same domain)
          const isExternal = href.startsWith('http://') || href.startsWith('https://');
          const isSameDomain = isExternal && typeof window !== 'undefined' 
            ? new URL(href, window.location.origin).hostname === window.location.hostname
            : false;
          const shouldOpenNewTab = isExternal && !isSameDomain;

          console.log('[HeroButtons] Rendering button:', { placementId, label, href, variant, isExternal, shouldOpenNewTab });

          return (
            <a
              key={placementId || `hero-cta-${placement.sort_order}`}
              href={href}
              {...(shouldOpenNewTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              onClick={() => {
                if (analyticsEvent) {
                  console.log('[Analytics]:', analyticsEvent);
                  // Send to analytics service here
                }
              }}
              className={
                isPrimary
                  ? 'bg-accent-primary hover:bg-accent-primary-hover text-white px-8 py-3 rounded-lg font-bold transition shadow-lg hover:shadow-xl flex items-center justify-center gap-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]'
                  : 'bg-white/20 backdrop-blur-sm border-2 border-white text-white hover:bg-white/30 px-8 py-3 rounded-lg font-bold transition drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]'
              }
            >
              {label}
              {isPrimary && !iconName && <ChevronRight size={20} />}
              {iconName && <span>{iconName}</span>}
            </a>
          );
        })
      ) : null}
    </div>
  );
}

export default function VCStudioLanding() {
  const appUuid = useAppUuid();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [pageSettings, setPageSettings] = useState<PageSettings | null>(null);
  const [galleryImages, setGalleryImages] = useState<PageImage[]>([]);
  const [enquiryForm, setEnquiryForm] = useState<EnquiryForm>({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [enquiryStatus, setEnquiryStatus] = useState<EnquiryStatus>('idle');
  const [blogsLoading, setBlogsLoading] = useState(true);

  // Fetch page settings and data on mount
  useEffect(() => {
    // Fetch blogs even if appUuid is not available (has fallback logic)
    fetchBlogs();
    
    // Fetch page settings (will try with appUuid if available, fallback if not)
    fetchPageSettings();
  }, [appUuid]); // Still depend on appUuid to refetch when it becomes available

  const fetchPageSettings = async () => {
    try {
      console.log('🔍 Fetching page settings for: home');

      // Fetch page settings for current app
      let settingsData = null;
      let settingsError = null;

      if (appUuid) {
        const result = await supabase
          .from('page_settings')
          .select('*')
          .eq('page_name', 'home')
          .eq('app_uuid', appUuid)
          .eq('is_published', true)
          .single();
        settingsData = result.data;
        settingsError = result.error;
      } else {
        // No appUuid, try without filter
        const result = await supabase
          .from('page_settings')
          .select('*')
          .eq('page_name', 'home')
          .eq('is_published', true)
          .single();
        settingsData = result.data;
        settingsError = result.error;
      }

      // Safely log fetch result
      try {
        const safeErrorCode = settingsError ? ((settingsError as any)?.code || 'unknown') : null;
        const safeErrorMessage = settingsError ? ((settingsError as any)?.message || String(settingsError)) : null;
        
        console.log('📊 Page Settings Fetch Result:', {
          hasData: !!settingsData,
          hasError: !!settingsError,
          errorCode: safeErrorCode,
          errorMessage: safeErrorMessage,
          hero_video_url: settingsData?.hero_video_url,
          hero_video_public_id: settingsData?.hero_video_public_id,
        });
      } catch (logError) {
        // If logging fails, just continue silently
      }

      if (settingsError) {
        // Safely extract error information
        try {
          const errorCode = (settingsError as any)?.code || 'unknown';
          const errorMessage = (settingsError as any)?.message || String(settingsError);
          
          // If error is about app_uuid column missing, try without that filter
          if (errorCode === '42703' || errorMessage?.includes('app_uuid')) {
            const { data: fallbackData, error: fallbackError } = await supabase
              .from('page_settings')
              .select('*')
              .eq('page_name', 'home')
              .eq('is_published', true)
              .single();
            
            if (!fallbackError && fallbackData) {
              // Use fallback data
              settingsData = fallbackData;
              settingsError = null;
              
              // Set page settings
              setPageSettings(fallbackData);
              
              // Fetch gallery images for fallback
              const { data: imagesData } = await supabase
                .from('page_images')
                .select('*')
                .eq('page_settings_id', fallbackData.id)
                .eq('is_active', true)
                .order('display_order', { ascending: true });
              
              setGalleryImages(imagesData || []);
              return; // Exit early - we've handled everything
            }
            // If fallback also failed, continue to normal error handling
            return;
          }
          
          // Other errors - only log if not a missing column error
          if (errorCode !== '42703' && !errorMessage?.includes('app_uuid')) {
            // Safely build error object for logging
            try {
              const errorDetails = (settingsError as any)?.details || null;
              const errorHint = (settingsError as any)?.hint || null;
              
              // Only log if we can safely construct the object
              const errorLog: any = {
                code: errorCode,
                message: errorMessage
              };
              
              if (errorDetails) errorLog.details = errorDetails;
              if (errorHint) errorLog.hint = errorHint;
              
              console.error('❌ Error fetching page settings:', errorLog);
            } catch (logErr) {
              // If logging fails, just log the message string
              console.error('❌ Error fetching page settings:', errorMessage || 'Unknown error');
            }
          }
        } catch (logError) {
          // If even error extraction fails, silently continue
        }
      }

      if (settingsData) {
        console.log('✅ Setting page settings state with data:', settingsData);
        setPageSettings(settingsData);

        // Fetch gallery images
        const { data: imagesData, error: imagesError } = await supabase
          .from('page_images')
          .select('*')
          .eq('page_settings_id', settingsData.id)
          .eq('is_active', true)
          .order('display_order', { ascending: true });

        if (imagesError) {
          // Safely handle images error - check if it's about app_uuid column
          try {
            const errorCode = (imagesError as any)?.code || 'unknown';
            const errorMessage = (imagesError as any)?.message || String(imagesError);
            
            // If error is about app_uuid column missing, try without that filter
            if (errorCode === '42703' || errorMessage?.includes('app_uuid')) {
              const { data: fallbackImages } = await supabase
                .from('page_images')
                .select('*')
                .eq('page_settings_id', settingsData.id)
                .eq('is_active', true)
                .order('display_order', { ascending: true });
              
              setGalleryImages(fallbackImages || []);
              return;
            }
            
            // Other errors - log safely
            if (process.env.NODE_ENV === 'development') {
              console.warn('Error fetching gallery images:', errorMessage);
            }
          } catch (err) {
            // If error handling fails, just continue
          }
        }

        setGalleryImages(imagesData || []);
      }
    } catch (err) {
      console.error('Error loading page settings:', err);
    }
  };

  const fetchBlogs = async () => {
    try {
      setBlogsLoading(true);
      console.log('🔍 Fetching blog posts...', { appUuid });
      
      let blogsData = null;
      let blogsError = null;

      // Try fetching with app_uuid filter if available
      if (appUuid) {
        const result = await supabase
          .from('blog_posts')
          .select('id, title, excerpt, slug, featured_image_url, published_at, status, is_featured')
          .eq('app_uuid', appUuid)
          .eq('status', 'published')
          .eq('is_featured', true)
          .order('published_at', { ascending: false })
          .limit(3);
        
        blogsData = result.data;
        blogsError = result.error;
        console.log('📊 Blog query result (with app_uuid):', { 
          count: blogsData?.length || 0, 
          error: blogsError ? (blogsError as any)?.message : null 
        });
      } else {
        // No appUuid, try without filter
        const result = await supabase
          .from('blog_posts')
          .select('id, title, excerpt, slug, featured_image_url, published_at, status, is_featured')
          .eq('status', 'published')
          .eq('is_featured', true)
          .order('published_at', { ascending: false })
          .limit(3);
        
        blogsData = result.data;
        blogsError = result.error;
        console.log('📊 Blog query result (no app_uuid):', { 
          count: blogsData?.length || 0, 
          error: blogsError ? (blogsError as any)?.message : null 
        });
      }

      // If error is about app_uuid column, try without that filter
      if (blogsError) {
        try {
          const errorCode = (blogsError as any)?.code || 'unknown';
          const errorMessage = (blogsError as any)?.message || String(blogsError);
          
          console.warn('⚠️ Blog query error:', { errorCode, errorMessage });
          
          if (errorCode === '42703' || errorMessage?.includes('app_uuid')) {
            // Try fetching without app_uuid filter
            console.log('🔄 Trying fallback query without app_uuid filter...');
            const { data: fallbackData, error: fallbackError } = await supabase
              .from('blog_posts')
              .select('id, title, excerpt, slug, featured_image_url, published_at, status, is_featured')
              .eq('status', 'published')
              .eq('is_featured', true)
              .order('published_at', { ascending: false })
              .limit(3);
            
            console.log('📊 Fallback query result:', { 
              count: fallbackData?.length || 0, 
              error: fallbackError ? (fallbackError as any)?.message : null 
            });
            
            if (!fallbackError && fallbackData) {
              console.log(`✅ Loaded ${fallbackData.length} blog posts (fallback)`);
              setBlogs(fallbackData);
              return;
            }
          }
        } catch (fallbackErr) {
          console.error('❌ Fallback query failed:', fallbackErr);
        }
        
        // If we get here, there was an error we couldn't handle
        console.warn('⚠️ Could not fetch blogs:', (blogsError as any)?.message || 'Unknown error');
        setBlogs([]);
        return;
      }

      // Success - set the blogs
      console.log(`✅ Loaded ${blogsData?.length || 0} blog posts`);
      if (blogsData && blogsData.length === 0) {
        console.warn('⚠️ No blogs found. Checking if blogs exist without filters...');
        // Debug: Check if any blogs exist at all
        const { data: allBlogs } = await supabase
          .from('blog_posts')
          .select('id, title, status, is_featured, app_uuid')
          .limit(5);
        console.log('📊 All blogs in database (first 5):', allBlogs);
      }
      setBlogs(blogsData || []);
    } catch (err) {
      console.error('❌ Error fetching blogs:', err);
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

    if (!appUuid) {
      console.error('App UUID is not available. Cannot submit enquiry.');
      setEnquiryStatus('error');
      setTimeout(() => setEnquiryStatus('idle'), 5000);
      return;
    }

    // Commented out Supabase submission - can be re-enabled later
    // try {
    //   setEnquiryStatus('loading');
    //   const { error } = await supabase
    //     .from('enquiries')
    //     .insert([
    //       {
    //         app_uuid: appUuid, // Required: Links enquiry to the current app
    //         name: enquiryForm.name,
    //         email: enquiryForm.email,
    //         subject: enquiryForm.subject,
    //         message: enquiryForm.message,
    //         enquiry_type: 'general',
    //         status: 'new',
    //         priority: 'medium'
    //       }
    //     ]);

    //   if (error) {
    //     console.error('Error submitting enquiry:', {
    //       message: (error as any).message || 'Unknown error',
    //       details: (error as any).details || null,
    //       hint: (error as any).hint || null,
    //       code: (error as any).code || null
    //     });
    //     throw error;
    //   }

    //   setEnquiryStatus('success');
    //   setEnquiryForm({ name: '', email: '', subject: '', message: '' });
    //   setTimeout(() => setEnquiryStatus('idle'), 5000);
    // } catch (err: any) {
    //   console.error('Error submitting enquiry:', err);
    //   setEnquiryStatus('error');
    //   setTimeout(() => setEnquiryStatus('idle'), 5000);
    // }

    setEnquiryStatus('success');
    setEnquiryForm({ name: '', email: '', subject: '', message: '' });
    setTimeout(() => {
      setEnquiryStatus('idle');
      window.location.href = '#contact';
    }, 10000);
  };

  return (
    <div className="min-h-screen bg-brand-background text-brand-text">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-section-light border-b border-section-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Logo variant="compact" linkTo="/" />

            {/* Desktop Menu */}
            <div className="hidden md:flex gap-8 items-center">
              <a href="#hero" className="text-brand-text-light hover:text-accent-primary transition font-medium">Home</a>
              <a href="#info" className="text-brand-text-light hover:text-accent-primary transition font-medium">About</a>
              <a href="#blogs" className="text-brand-text-light hover:text-accent-primary transition font-medium">Resources</a>
              <a href="#contact" className="text-brand-text-light hover:text-accent-primary transition font-medium">Contact</a>
              <Link href="/auth/login" className="text-brand-text-light hover:text-accent-primary transition font-medium">Sign In</Link>
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
              <a href="#contact" className="block px-2 py-2 hover:bg-section-subtle rounded text-brand-text-light">Contact</a>
              <Link href="/auth/login" className="block px-2 py-2 hover:bg-section-subtle rounded text-brand-text-light">Sign In</Link>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section with Video Background */}
      <section id="hero" className="relative px-4 sm:px-6 lg:px-8 min-h-screen flex items-center justify-center">
        {/* Video Background Container */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <VideoPlayer
            cloudinaryUrl={pageSettings?.hero_video_url || ""}
            publicId={pageSettings?.hero_video_public_id || "dog"}
            autoplay={true}
            loop={true}
            muted={true}
            controls={false}
            className="!rounded-none !border-0 !shadow-none !bg-transparent"
            aspectRatio="16:9"
          />
        </div>

        {/* Content - now on top of video */}
        <div className="relative z-20 max-w-7xl mx-auto text-center py-20 px-4 mt-[300px]">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold mb-6 text-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]">
            {pageSettings?.hero_title || 'Value Chain Studio'}
          </h1>
          <p className="text-xl sm:text-2xl text-white mb-8 max-w-3xl mx-auto font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,0.7)]">
            {pageSettings?.hero_subtitle || 'Systematic business transformation through Value Chain Excellence Framework'}
          </p>
          {pageSettings?.hero_description && (
            <p className="text-white mb-12 max-w-2xl mx-auto text-lg font-semibold drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
              {pageSettings.hero_description}
            </p>
          )}
          {/* CTA Buttons - Database-driven via Page Editor */}
          <HeroButtons pageSettingsId={pageSettings?.id} />
        </div>
      </section>

      {/* Information Block */}
      <section id="info" className="py-16 px-4 sm:px-6 lg:px-8 bg-section-light border-t border-section-border">
        <div className="max-w-7xl mx-auto">
          <div className="bg-section-subtle rounded-xl p-8 sm:p-12 border border-section-border shadow-sm">
            <h2 className="text-3xl font-bold mb-6 text-brand-text text-center">
              {pageSettings?.info_section_title || 'What is VC Studio?'}
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-semibold text-accent-primary mb-4">
                  {pageSettings?.info_block_1_title || 'VCEF Methodology'}
                </h3>
                <p className="text-brand-text-light leading-relaxed">
                  {pageSettings?.info_block_1_content || 'Value Chain Evolution Framework provides a systematic L0-L6 mapping of your business. Understand how value flows through your organisation from strategic vision to operational execution.'}
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-accent-secondary mb-4">
                  {pageSettings?.info_block_2_title || 'AI-Powered Intelligence'}
                </h3>
                <p className="text-brand-text-light leading-relaxed">
                  {pageSettings?.info_block_2_content || 'Knowledge Domain Architecture transforms business intelligence into actionable AI-enhanced operations. Deploy agents where they create measurable value while preserving human expertise.'}
                </p>
              </div>
            </div>
            {pageSettings?.info_highlight_text && (
              <div className="mt-8 p-6 bg-semantic-info-bg rounded-lg border border-accent-primary/30">
                <p className="text-brand-text">
                  <span className="text-accent-primary font-semibold">Stage 1 Focus:</span> {pageSettings.info_highlight_text}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Image Gallery Section */}
      <section id="gallery" className="py-16 px-4 sm:px-6 lg:px-8 bg-section-subtle border-t border-section-border">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold mb-2 text-brand-text">
              {pageSettings?.gallery_section_title || 'Our Work in Action'}
            </h2>
            <p className="text-brand-text-muted">
              {pageSettings?.gallery_section_subtitle || 'Showcasing value chain transformations and implementations'}
            </p>
          </div>

          {galleryImages.length > 0 ? (
            <ImageGallery
              cloudinaryUrl={
                // Extract base URL from cloudinary_url (handles both base URL and full URL formats)
                galleryImages[0]?.cloudinary_url?.includes('/upload')
                  ? galleryImages[0].cloudinary_url.split('/upload')[0] + '/upload'
                  : galleryImages[0]?.cloudinary_url || "https://res.cloudinary.com/demo/image/upload"
              }
              images={galleryImages.map(img => ({
                // If public_id contains a full URL, use it; otherwise construct from cloudinary_url + public_id
                publicId: img.public_id.startsWith('http') ? img.public_id : img.public_id,
                alt: img.alt_text,
                title: img.title,
                caption: img.caption,
              }))}
              columns={3}
              aspectRatio="square"
              gap="md"
              showCaptions={true}
            />
          ) : (
            <div className="text-center py-12 text-brand-text-muted">
              No gallery images available yet
            </div>
          )}
        </div>
      </section>

      {/* Blog Section */}
      <section id="blogs" className="py-16 px-4 sm:px-6 lg:px-8 bg-section-light border-t border-section-border">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold mb-2 text-brand-text">Latest Resources</h2>
            <p className="text-brand-text-muted">Featured articles and insights</p>
          </div>

          {blogsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 justify-items-center">
              {[1, 2, 3].map((i) => (
                <div key={i} className="w-full max-w-sm bg-section-light rounded-lg overflow-hidden border border-section-border shadow-sm animate-pulse">
                  <div className="aspect-[16/9] bg-section-subtle" />
                  <div className="p-6 space-y-3">
                    <div className="h-4 bg-section-subtle rounded w-3/4 mx-auto" />
                    <div className="h-3 bg-section-subtle rounded w-full" />
                    <div className="h-3 bg-section-subtle rounded w-5/6 mx-auto" />
                  </div>
                </div>
              ))}
            </div>
          ) : blogs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 justify-items-center">
              {blogs.map((blog) => (
                <Link
                  key={blog.id}
                  href={`/blog/${blog.id}`}
                  className="w-full max-w-sm h-full"
                >
                  <article className="bg-section-light rounded-lg overflow-hidden border border-section-border hover:border-accent-primary transition-all duration-300 group cursor-pointer shadow-sm hover:shadow-md h-full flex flex-col">
                    {blog.featured_image_url ? (
                      <div className="w-full aspect-video bg-gradient-to-br from-accent-primary to-accent-secondary overflow-hidden flex items-center justify-center">
                        <img 
                          src={blog.featured_image_url} 
                          alt={blog.title}
                          className="w-full h-full object-contain group-hover:scale-105 transition"
                          loading="lazy"
                        />
                      </div>
                    ) : (
                      <div className="aspect-video bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center">
                        <ChevronRight className="w-12 h-12 text-white opacity-50" />
                      </div>
                    )}
                    <div className="p-6 flex-1 flex flex-col text-center">
                      <h3 className="text-lg font-semibold mb-2 text-brand-text group-hover:text-accent-primary transition">
                        {blog.title}
                      </h3>
                      <p className="text-brand-text-muted text-sm mb-4 line-clamp-2 flex-1">
                        {blog.excerpt || 'Read full article for details...'}
                      </p>
                      <div className="flex items-center justify-between mt-auto">
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
      <section id="contact" className="py-16 px-4 sm:px-6 lg:px-8 bg-section-light border-t border-section-border">
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
                  For new user signup please use contact form and the team will respond
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
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <h3 className="font-bold text-xl mb-4 text-white">VC Studio</h3>
              <p className="text-white text-sm">Systematic business transformation methodology</p>
            </div>
            <div>
              <h4 className="font-bold text-lg mb-4 text-white">Company</h4>
              <ul className="space-y-2 text-white text-sm">
                <li><a href="#info" className="hover:text-accent-primary transition">About</a></li>
                <li><Link href="/blog" className="hover:text-accent-primary transition">Blog</Link></li>
                <li><a href="#contact" className="hover:text-accent-primary transition">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-lg mb-4 text-white">Legal</h4>
              <ul className="space-y-2 text-white text-sm">
                <li><Link href="/privacy-policy" className="hover:text-accent-primary transition">Privacy Policy</Link></li>
                <li><Link href="/terms-of-service" className="hover:text-accent-primary transition">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-section-border pt-8 text-center text-white text-sm">
            <p>&copy; 2025 VC Studio. Powered by ITS Group. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
