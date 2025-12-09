'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAppUuid } from '@/contexts/AppContext';
import {
  Save,
  Eye,
  Plus,
  GripVertical,
  Trash2,
  AlertCircle,
  CheckCircle,
  Video,
  Image as ImageIcon,
  ArrowLeft
} from 'lucide-react';
import Link from 'next/link';

interface PageSettings {
  id?: string;
  page_name: string;
  hero_video_url: string;
  hero_video_public_id: string;
  hero_title: string;
  hero_subtitle: string;
  hero_description: string;
  hero_cta_primary_text: string;
  hero_cta_secondary_text: string;
  info_section_title: string;
  info_section_subtitle: string;
  info_block_1_title: string;
  info_block_1_content: string;
  info_block_2_title: string;
  info_block_2_content: string;
  info_highlight_text: string;
  gallery_section_title: string;
  gallery_section_subtitle: string;
  is_published: boolean;
}

interface PageImage {
  id?: string;
  cloudinary_url: string;
  public_id: string;
  alt_text: string;
  title: string;
  caption: string;
  display_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  page_settings_id?: string;
}

type SaveStatus = 'idle' | 'saving' | 'success' | 'error';

export default function PageEditor() {
  const appUuid = useAppUuid();
  const [settings, setSettings] = useState<PageSettings>({
    page_name: 'home',
    hero_video_url: 'https://res.cloudinary.com/demo/video/upload',
    hero_video_public_id: 'dog',
    hero_title: 'Value Chain Studio',
    hero_subtitle: 'Systematic business transformation through Value Chain Excellence Framework',
    hero_description: 'Map your business value creation, connect stakeholders, and deploy AI-enabled operations with proven methodology',
    hero_cta_primary_text: 'Get Started',
    hero_cta_secondary_text: 'Learn More',
    info_section_title: 'What is VC Studio?',
    info_section_subtitle: '',
    info_block_1_title: 'VCEF Methodology',
    info_block_1_content: 'Value Chain Evolution Framework provides a systematic L0-L6 mapping of your business.',
    info_block_2_title: 'AI-Powered Intelligence',
    info_block_2_content: 'Knowledge Domain Architecture transforms business intelligence into actionable AI-enhanced operations.',
    info_highlight_text: 'Stage 1 Focus: Build your Value Chain Model',
    gallery_section_title: 'Our Work in Action',
    gallery_section_subtitle: 'Showcasing value chain transformations and implementations',
    is_published: false
  });

  const [images, setImages] = useState<PageImage[]>([]);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!appUuid) return;
    loadPageSettings();
  }, [appUuid]);

  const loadPageSettings = async () => {
    try {
      setLoading(true);

      // Load page settings for current app
      const { data: pageData, error: pageError } = await supabase
        .from('page_settings')
        .select('*')
        .eq('page_name', 'home')
        .eq('app_uuid', appUuid)
        .single();

      if (pageError && pageError.code !== 'PGRST116') {
        throw pageError;
      }

      if (pageData) {
        setSettings(pageData);

        // Load images for this page
        const { data: imagesData, error: imagesError } = await supabase
          .from('page_images')
          .select('*')
          .eq('page_settings_id', pageData.id)
          .eq('app_uuid', appUuid)
          .order('display_order', { ascending: true });

        if (imagesError) throw imagesError;
        setImages(imagesData || []);
      }
    } catch (err) {
      console.error('Error loading page settings:', err);
      setErrorMessage('Failed to load page settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (field: keyof PageSettings, value: string | boolean) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleImageChange = (index: number, field: keyof PageImage, value: string | number | boolean) => {
    const updatedImages = [...images];
    updatedImages[index] = {
      ...updatedImages[index],
      [field]: value
    };
    setImages(updatedImages);
  };

  const addImage = () => {
    const newImage: PageImage = {
      cloudinary_url: '', // Leave empty, can paste full URL in public_id
      public_id: '', // Paste full Cloudinary URL here
      alt_text: 'New image',
      title: 'Image Title',
      caption: 'Image caption',
      display_order: images.length + 1,
      is_active: true
    };
    setImages([...images, newImage]);
  };

  const removeImage = (index: number) => {
    const updatedImages = images.filter((_, i) => i !== index);
    // Reorder remaining images
    updatedImages.forEach((img, i) => {
      img.display_order = i + 1;
    });
    setImages(updatedImages);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const updatedImages = [...images];
    const draggedImage = updatedImages[draggedIndex];
    updatedImages.splice(draggedIndex, 1);
    updatedImages.splice(index, 0, draggedImage);

    // Update display order
    updatedImages.forEach((img, i) => {
      img.display_order = i + 1;
    });

    setImages(updatedImages);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleSave = async () => {
    try {
      setSaveStatus('saving');
      setErrorMessage('');

      // Check authentication first
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('Not authenticated. Please log in first.');
      }
      console.log('Authenticated user:', user.email);

      // Save or update page settings
      let pageSettingsId = settings.id;

      if (pageSettingsId) {
        // Update existing
        console.log('Updating page settings:', pageSettingsId);
        const { data: updateData, error: updateError } = await supabase
          .from('page_settings')
          .update({
            ...settings,
            updated_at: new Date().toISOString()
          })
          .eq('id', pageSettingsId)
          .eq('app_uuid', appUuid) // SECURITY: Prevent cross-app updates
          .select();

        console.log('Update result:', { updateData, updateError });
        if (updateError) {
          console.error('Update error details:', {
            message: updateError.message,
            details: updateError.details,
            hint: updateError.hint,
            code: updateError.code
          });
          throw updateError;
        }
      } else {
        // Insert new
        console.log('Inserting new page settings');
        const { data: insertData, error: insertError } = await supabase
          .from('page_settings')
          .insert([{
            ...settings,
            app_uuid: appUuid // Include app_uuid on insert
          }])
          .select()
          .single();

        console.log('Insert result:', { insertData, insertError });
        if (insertError) {
          console.error('Insert error details:', {
            message: insertError.message,
            details: insertError.details,
            hint: insertError.hint,
            code: insertError.code
          });
          throw insertError;
        }
        pageSettingsId = insertData.id;
        setSettings(insertData);
      }

      // Delete all existing images for this page
      if (pageSettingsId) {
        console.log('Deleting existing images for page:', pageSettingsId);
        const { error: deleteError } = await supabase
          .from('page_images')
          .delete()
          .eq('page_settings_id', pageSettingsId)
          .eq('app_uuid', appUuid); // SECURITY: Prevent cross-app deletion

        console.log('Delete result:', { deleteError });
        if (deleteError) {
          console.error('Delete error details:', {
            message: deleteError.message,
            details: deleteError.details,
            hint: deleteError.hint,
            code: deleteError.code
          });
          throw deleteError;
        }

        // Insert all images
        if (images.length > 0) {
          console.log('Inserting images:', images.length);
          const imagesWithPageId = images.map(img => {
            // Destructure to remove id and other meta fields
            const { id, created_at, updated_at, created_by, ...imageData } = img;
            return {
              ...imageData,
              page_settings_id: pageSettingsId
            };
          });

          const { data: imagesData, error: imagesError } = await supabase
            .from('page_images')
            .insert(imagesWithPageId)
            .select();

          console.log('Images insert result:', { imagesData, imagesError });
          if (imagesError) {
            console.error('Images insert error details:', {
              message: imagesError.message,
              details: imagesError.details,
              hint: imagesError.hint,
              code: imagesError.code
            });
            throw imagesError;
          }
        }
      }

      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);

      // Reload to get fresh data with IDs
      await loadPageSettings();
    } catch (err) {
      console.error('Error saving page settings:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Failed to save settings');
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 5000);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center">
          <p className="text-brand-text-muted">Loading page editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-section-light border-b border-section-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 text-sm text-brand-text-muted hover:text-accent-primary transition mb-2"
              >
                <ArrowLeft size={16} />
                Back to Dashboard
              </Link>
              <h1 className="text-2xl font-bold text-brand-text">Front Page Editor</h1>
              <p className="text-sm text-brand-text-muted">Manage hero section, content blocks, and gallery</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="flex items-center gap-2 px-4 py-2 bg-section-subtle border border-section-border text-brand-text rounded-lg hover:bg-section-light transition"
              >
                <Eye size={18} />
                {showPreview ? 'Hide Preview' : 'Show Preview'}
              </button>
              <button
                onClick={handleSave}
                disabled={saveStatus === 'saving'}
                className="flex items-center gap-2 px-6 py-2 bg-accent-primary hover:bg-accent-primary-hover disabled:bg-neutral-400 text-white rounded-lg font-semibold transition shadow-md"
              >
                {saveStatus === 'saving' ? (
                  <>Saving...</>
                ) : (
                  <>
                    <Save size={18} />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Status Messages */}
          {saveStatus === 'success' && (
            <div className="mt-4 bg-semantic-success-bg border border-semantic-success text-semantic-success px-4 py-3 rounded-lg flex items-center gap-2">
              <CheckCircle size={18} />
              Page settings saved successfully!
            </div>
          )}
          {saveStatus === 'error' && (
            <div className="mt-4 bg-semantic-error-bg border border-semantic-error text-semantic-error px-4 py-3 rounded-lg flex items-center gap-2">
              <AlertCircle size={18} />
              {errorMessage || 'Failed to save settings'}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className={`grid ${showPreview ? 'grid-cols-2' : 'grid-cols-1'} gap-8`}>
          {/* Editor Form */}
          <div className="space-y-8">
            {/* Hero Section */}
            <section className="bg-section-light rounded-xl p-6 border border-section-border shadow-sm">
              <h2 className="text-xl font-bold text-brand-text mb-6 flex items-center gap-2">
                <Video size={20} className="text-accent-primary" />
                Hero Section
              </h2>

              <div className="space-y-4">
                {/* Video Settings */}
                <div className="p-4 bg-section-subtle rounded-lg border border-section-border">
                  <h3 className="text-sm font-semibold text-brand-text mb-3">Video Background</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-brand-text-muted mb-1">
                        Cloudinary Base URL
                      </label>
                      <input
                        type="text"
                        value={settings.hero_video_url}
                        onChange={(e) => handleSettingChange('hero_video_url', e.target.value)}
                        placeholder="https://res.cloudinary.com/your-cloud/video/upload"
                        className="w-full px-3 py-2 text-sm bg-section-light border border-section-border rounded-lg focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 text-brand-text"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-brand-text-muted mb-1">
                        Video Public ID
                      </label>
                      <input
                        type="text"
                        value={settings.hero_video_public_id}
                        onChange={(e) => handleSettingChange('hero_video_public_id', e.target.value)}
                        placeholder="your-video-id"
                        className="w-full px-3 py-2 text-sm bg-section-light border border-section-border rounded-lg focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 text-brand-text"
                      />
                    </div>
                  </div>
                </div>

                {/* Hero Text */}
                <div>
                  <label className="block text-sm font-medium text-brand-text mb-2">Hero Title</label>
                  <input
                    type="text"
                    value={settings.hero_title}
                    onChange={(e) => handleSettingChange('hero_title', e.target.value)}
                    className="w-full px-4 py-3 bg-section-subtle border border-section-border rounded-lg focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 text-brand-text"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-brand-text mb-2">Hero Subtitle</label>
                  <input
                    type="text"
                    value={settings.hero_subtitle}
                    onChange={(e) => handleSettingChange('hero_subtitle', e.target.value)}
                    className="w-full px-4 py-3 bg-section-subtle border border-section-border rounded-lg focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 text-brand-text"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-brand-text mb-2">Hero Description</label>
                  <textarea
                    value={settings.hero_description}
                    onChange={(e) => handleSettingChange('hero_description', e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 bg-section-subtle border border-section-border rounded-lg focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 text-brand-text resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-brand-text mb-2">Primary CTA</label>
                    <input
                      type="text"
                      value={settings.hero_cta_primary_text}
                      onChange={(e) => handleSettingChange('hero_cta_primary_text', e.target.value)}
                      className="w-full px-4 py-2 bg-section-subtle border border-section-border rounded-lg focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 text-brand-text"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brand-text mb-2">Secondary CTA</label>
                    <input
                      type="text"
                      value={settings.hero_cta_secondary_text}
                      onChange={(e) => handleSettingChange('hero_cta_secondary_text', e.target.value)}
                      className="w-full px-4 py-2 bg-section-subtle border border-section-border rounded-lg focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 text-brand-text"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Info Section */}
            <section className="bg-section-light rounded-xl p-6 border border-section-border shadow-sm">
              <h2 className="text-xl font-bold text-brand-text mb-6">Information Section</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-brand-text mb-2">Section Title</label>
                  <input
                    type="text"
                    value={settings.info_section_title}
                    onChange={(e) => handleSettingChange('info_section_title', e.target.value)}
                    className="w-full px-4 py-3 bg-section-subtle border border-section-border rounded-lg focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 text-brand-text"
                  />
                </div>

                {/* Info Block 1 */}
                <div className="p-4 bg-section-subtle rounded-lg border border-section-border">
                  <h3 className="text-sm font-semibold text-brand-text mb-3">Info Block 1</h3>
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={settings.info_block_1_title}
                      onChange={(e) => handleSettingChange('info_block_1_title', e.target.value)}
                      placeholder="Block title"
                      className="w-full px-4 py-2 bg-section-light border border-section-border rounded-lg focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 text-brand-text"
                    />
                    <textarea
                      value={settings.info_block_1_content}
                      onChange={(e) => handleSettingChange('info_block_1_content', e.target.value)}
                      placeholder="Block content"
                      rows={3}
                      className="w-full px-4 py-2 bg-section-light border border-section-border rounded-lg focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 text-brand-text resize-none"
                    />
                  </div>
                </div>

                {/* Info Block 2 */}
                <div className="p-4 bg-section-subtle rounded-lg border border-section-border">
                  <h3 className="text-sm font-semibold text-brand-text mb-3">Info Block 2</h3>
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={settings.info_block_2_title}
                      onChange={(e) => handleSettingChange('info_block_2_title', e.target.value)}
                      placeholder="Block title"
                      className="w-full px-4 py-2 bg-section-light border border-section-border rounded-lg focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 text-brand-text"
                    />
                    <textarea
                      value={settings.info_block_2_content}
                      onChange={(e) => handleSettingChange('info_block_2_content', e.target.value)}
                      placeholder="Block content"
                      rows={3}
                      className="w-full px-4 py-2 bg-section-light border border-section-border rounded-lg focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 text-brand-text resize-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-brand-text mb-2">Highlight Text</label>
                  <textarea
                    value={settings.info_highlight_text}
                    onChange={(e) => handleSettingChange('info_highlight_text', e.target.value)}
                    rows={2}
                    className="w-full px-4 py-3 bg-section-subtle border border-section-border rounded-lg focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 text-brand-text resize-none"
                  />
                </div>
              </div>
            </section>

            {/* Gallery Section */}
            <section className="bg-section-light rounded-xl p-6 border border-section-border shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-brand-text flex items-center gap-2">
                  <ImageIcon size={20} className="text-accent-secondary" />
                  Gallery Images
                </h2>
                <button
                  onClick={addImage}
                  className="flex items-center gap-2 px-4 py-2 bg-accent-secondary hover:bg-accent-secondary-hover text-white rounded-lg text-sm font-semibold transition"
                >
                  <Plus size={16} />
                  Add Image
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-brand-text mb-2">Gallery Section Title</label>
                  <input
                    type="text"
                    value={settings.gallery_section_title}
                    onChange={(e) => handleSettingChange('gallery_section_title', e.target.value)}
                    className="w-full px-4 py-3 bg-section-subtle border border-section-border rounded-lg focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 text-brand-text"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-brand-text mb-2">Gallery Subtitle</label>
                  <input
                    type="text"
                    value={settings.gallery_section_subtitle}
                    onChange={(e) => handleSettingChange('gallery_section_subtitle', e.target.value)}
                    className="w-full px-4 py-3 bg-section-subtle border border-section-border rounded-lg focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 text-brand-text"
                  />
                </div>
              </div>

              {/* Image List */}
              <div className="space-y-3">
                {images.map((image, index) => (
                  <div
                    key={index}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`p-4 bg-section-subtle border border-section-border rounded-lg ${
                      draggedIndex === index ? 'opacity-50' : ''
                    } cursor-move hover:border-accent-primary transition`}
                  >
                    <div className="flex gap-3">
                      <div className="flex items-start pt-2">
                        <GripVertical size={20} className="text-brand-text-muted" />
                      </div>

                      <div className="flex-1 space-y-3">
                        <div className="p-2 bg-semantic-info-bg border border-accent-primary/30 rounded text-xs text-brand-text-muted mb-2">
                          <strong>Option 1:</strong> Full URL in Public ID field (easier)<br/>
                          <strong>Option 2:</strong> Base URL + Public ID separately
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-brand-text-muted mb-1">Base URL (Optional)</label>
                            <textarea
                              value={image.cloudinary_url}
                              onChange={(e) => handleImageChange(index, 'cloudinary_url', e.target.value)}
                              placeholder="https://res.cloudinary.com/.../upload"
                              rows={2}
                              className="w-full px-3 py-2 text-sm bg-section-light border border-section-border rounded-lg focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 text-brand-text placeholder-brand-text-muted resize-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-brand-text-muted mb-1">Public ID or Full URL</label>
                            <textarea
                              value={image.public_id}
                              onChange={(e) => handleImageChange(index, 'public_id', e.target.value)}
                              placeholder="image_id or full Cloudinary URL"
                              rows={2}
                              className="w-full px-3 py-2 text-sm bg-section-light border border-section-border rounded-lg focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 text-brand-text placeholder-brand-text-muted resize-none"
                            />
                          </div>
                        </div>
                        <div>
                          <input
                            type="text"
                            value={image.title}
                            onChange={(e) => handleImageChange(index, 'title', e.target.value)}
                            placeholder="Image title"
                            className="w-full px-3 py-2 text-sm bg-section-light border border-section-border rounded-lg focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 text-brand-text placeholder-brand-text-muted text-center"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-brand-text-muted mb-1">Alt Text</label>
                          <textarea
                            value={image.alt_text}
                            onChange={(e) => handleImageChange(index, 'alt_text', e.target.value)}
                            placeholder="Alt text description"
                            rows={2}
                            className="w-full px-3 py-2 text-sm bg-section-light border border-section-border rounded-lg focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 text-brand-text placeholder-brand-text-muted resize-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-brand-text-muted mb-1">Caption</label>
                          <textarea
                            value={image.caption}
                            onChange={(e) => handleImageChange(index, 'caption', e.target.value)}
                            placeholder="Image caption"
                            rows={2}
                            className="w-full px-3 py-2 text-sm bg-section-light border border-section-border rounded-lg focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 text-brand-text placeholder-brand-text-muted resize-none"
                          />
                        </div>
                        <label className="flex items-center gap-2 text-sm text-brand-text">
                          <input
                            type="checkbox"
                            checked={image.is_active}
                            onChange={(e) => handleImageChange(index, 'is_active', e.target.checked)}
                            className="rounded border-section-border"
                          />
                          Active
                        </label>
                      </div>

                      <button
                        onClick={() => removeImage(index)}
                        className="text-semantic-error hover:bg-semantic-error-bg p-2 rounded-lg transition"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}

                {images.length === 0 && (
                  <div className="text-center py-8 text-brand-text-muted">
                    No images added yet. Click "Add Image" to get started.
                  </div>
                )}
              </div>
            </section>

            {/* Publishing */}
            <section className="bg-section-light rounded-xl p-6 border border-section-border shadow-sm">
              <h2 className="text-xl font-bold text-brand-text mb-4">Publishing</h2>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.is_published}
                  onChange={(e) => handleSettingChange('is_published', e.target.checked)}
                  className="w-5 h-5 rounded border-section-border"
                />
                <div>
                  <p className="font-medium text-brand-text">Publish this page</p>
                  <p className="text-sm text-brand-text-muted">Make this page visible to public users</p>
                </div>
              </label>
            </section>
          </div>

          {/* Live Preview */}
          {showPreview && (
            <div className="sticky top-24 h-fit">
              <div className="bg-section-light rounded-xl p-6 border border-section-border shadow-sm">
                <h2 className="text-xl font-bold text-brand-text mb-4">Live Preview</h2>
                <div className="bg-white rounded-lg overflow-hidden border border-section-border">
                  <iframe
                    src="/"
                    className="w-full h-[800px]"
                    title="Page Preview"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
