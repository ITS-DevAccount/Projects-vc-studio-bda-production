'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useTheme } from '@/hooks/useTheme';
import {
  Save,
  RefreshCw,
  Upload,
  Image as ImageIcon,
  Palette,
  Type,
  AlertCircle,
  CheckCircle,
  Eye,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';

type SaveStatus = 'idle' | 'saving' | 'success' | 'error';

export default function BrandingSettings() {
  const { settings: currentSettings, refreshSettings } = useTheme();
  const [settings, setSettings] = useState(currentSettings);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('site_settings')
        .select('*')
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setSettings(data);
      }
    } catch (err) {
      console.error('Error loading settings:', err);
      setErrorMessage('Failed to load branding settings');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string | number | boolean) => {
    setSettings((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    try {
      setSaveStatus('saving');
      setErrorMessage('');

      console.log('Saving settings:', settings);

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('Not authenticated');
      }

      if (settings.id) {
        // Update existing
        console.log('Updating existing setting with ID:', settings.id);
        const updateData = {
          ...settings,
          updated_at: new Date().toISOString(),
          updated_by: user.id,
        };
        console.log('Update data:', updateData);

        const { data: resultData, error: updateError } = await supabase
          .from('site_settings')
          .update(updateData)
          .eq('id', settings.id)
          .select();

        console.log('Update result:', { resultData, updateError });

        if (updateError) {
          console.error('Update error:', updateError);
          throw updateError;
        }
      } else {
        // Insert new
        console.log('Inserting new setting');
        const { data: resultData, error: insertError } = await supabase
          .from('site_settings')
          .insert([{
            ...settings,
            created_by: user.id,
          }])
          .select();

        console.log('Insert result:', { resultData, insertError });

        if (insertError) {
          console.error('Insert error:', insertError);
          throw insertError;
        }
      }

      console.log('Save successful, refreshing settings...');
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);

      // Refresh theme
      refreshSettings();
      await loadSettings();
    } catch (err) {
      console.error('Error saving settings:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Failed to save settings');
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 5000);
    }
  };

  const handleReset = () => {
    loadSettings();
  };

  const ColorPicker = ({ label, field, value }: { label: string; field: string; value: string }) => (
    <div>
      <label className="block text-sm font-medium text-brand-text mb-2">{label}</label>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={value}
          onChange={(e) => handleChange(field, e.target.value)}
          className="w-16 h-10 border border-section-border rounded cursor-pointer"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => handleChange(field, e.target.value)}
          placeholder="#000000"
          className="flex-1 px-3 py-2 bg-section-subtle border border-section-border rounded-lg focus:border-accent-primary focus:outline-none text-brand-text"
        />
        <div
          className="w-10 h-10 rounded border border-section-border"
          style={{ backgroundColor: value }}
        />
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center">
          <p className="text-brand-text-muted">Loading branding settings...</p>
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
              <h1 className="text-2xl font-bold text-brand-text">Branding & Theme Settings</h1>
              <p className="text-sm text-brand-text-muted">
                Configure site-wide colors, logo, and branding
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-4 py-2 bg-section-subtle border border-section-border text-brand-text rounded-lg hover:bg-section-light transition"
              >
                <RefreshCw size={18} />
                Reset
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
              Settings saved successfully! Theme will update shortly.
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Settings Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Site Identity */}
            <section className="bg-section-light rounded-xl p-6 border border-section-border shadow-sm">
              <h2 className="text-xl font-bold text-brand-text mb-6 flex items-center gap-2">
                <Type size={20} className="text-accent-primary" />
                Site Identity
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-brand-text mb-2">Site Name</label>
                  <input
                    type="text"
                    value={settings.site_name}
                    onChange={(e) => handleChange('site_name', e.target.value)}
                    className="w-full px-4 py-3 bg-section-subtle border border-section-border rounded-lg focus:border-accent-primary focus:outline-none text-brand-text"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-brand-text mb-2">Tagline</label>
                  <textarea
                    value={settings.site_tagline || ''}
                    onChange={(e) => handleChange('site_tagline', e.target.value)}
                    rows={2}
                    className="w-full px-4 py-3 bg-section-subtle border border-section-border rounded-lg focus:border-accent-primary focus:outline-none text-brand-text resize-none"
                  />
                </div>
              </div>
            </section>

            {/* Logo Configuration */}
            <section className="bg-section-light rounded-xl p-6 border border-section-border shadow-sm">
              <h2 className="text-xl font-bold text-brand-text mb-6 flex items-center gap-2">
                <ImageIcon size={20} className="text-accent-secondary" />
                Logo Configuration
              </h2>
              <div className="space-y-4">
                <div className="p-3 bg-semantic-info-bg border border-accent-primary/30 rounded text-sm text-brand-text-muted">
                  <strong>Tip:</strong> Upload your logo to Cloudinary and paste the full URL, or use
                  base URL + public ID
                </div>
                <div>
                  <label className="block text-sm font-medium text-brand-text mb-2">
                    Logo URL or Base URL
                  </label>
                  <input
                    type="text"
                    value={settings.logo_url || ''}
                    onChange={(e) => handleChange('logo_url', e.target.value)}
                    placeholder="https://res.cloudinary.com/your-cloud/image/upload"
                    className="w-full px-4 py-3 bg-section-subtle border border-section-border rounded-lg focus:border-accent-primary focus:outline-none text-brand-text"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-brand-text mb-2">
                    Logo Public ID or Full URL
                  </label>
                  <input
                    type="text"
                    value={settings.logo_public_id || ''}
                    onChange={(e) => handleChange('logo_public_id', e.target.value)}
                    placeholder="logo-file-id or full URL"
                    className="w-full px-4 py-3 bg-section-subtle border border-section-border rounded-lg focus:border-accent-primary focus:outline-none text-brand-text"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-brand-text mb-2">
                      Logo Width (px)
                    </label>
                    <input
                      type="number"
                      value={settings.logo_width}
                      onChange={(e) => handleChange('logo_width', parseInt(e.target.value))}
                      className="w-full px-4 py-3 bg-section-subtle border border-section-border rounded-lg focus:border-accent-primary focus:outline-none text-brand-text"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brand-text mb-2">
                      Logo Height (px)
                    </label>
                    <input
                      type="number"
                      value={settings.logo_height}
                      onChange={(e) => handleChange('logo_height', parseInt(e.target.value))}
                      className="w-full px-4 py-3 bg-section-subtle border border-section-border rounded-lg focus:border-accent-primary focus:outline-none text-brand-text"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Primary Colors */}
            <section className="bg-section-light rounded-xl p-6 border border-section-border shadow-sm">
              <h2 className="text-xl font-bold text-brand-text mb-6 flex items-center gap-2">
                <Palette size={20} className="text-accent-primary" />
                Primary Brand Colors
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ColorPicker
                  label="Primary Color"
                  field="primary_color"
                  value={settings.primary_color}
                />
                <ColorPicker
                  label="Primary Hover"
                  field="primary_hover"
                  value={settings.primary_hover}
                />
                <ColorPicker
                  label="Secondary Color"
                  field="secondary_color"
                  value={settings.secondary_color}
                />
                <ColorPicker
                  label="Secondary Hover"
                  field="secondary_hover"
                  value={settings.secondary_hover}
                />
              </div>
            </section>

            {/* Background Colors */}
            <section className="bg-section-light rounded-xl p-6 border border-section-border shadow-sm">
              <h2 className="text-xl font-bold text-brand-text mb-6">Background Colors</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ColorPicker
                  label="Main Background"
                  field="background_color"
                  value={settings.background_color}
                />
                <ColorPicker
                  label="Subtle Background"
                  field="background_subtle"
                  value={settings.background_subtle}
                />
              </div>
            </section>

            {/* Section Colors */}
            <section className="bg-section-light rounded-xl p-6 border border-section-border shadow-sm">
              <h2 className="text-xl font-bold text-brand-text mb-6">Section Colors</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ColorPicker label="Light Section" field="section_light" value={settings.section_light} />
                <ColorPicker label="Subtle Section" field="section_subtle" value={settings.section_subtle} />
                <ColorPicker label="Emphasis Section" field="section_emphasis" value={settings.section_emphasis} />
                <ColorPicker label="Section Border" field="section_border" value={settings.section_border} />
              </div>
            </section>

            {/* Text Colors */}
            <section className="bg-section-light rounded-xl p-6 border border-section-border shadow-sm">
              <h2 className="text-xl font-bold text-brand-text mb-6">Text Colors</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ColorPicker label="Primary Text" field="text_primary" value={settings.text_primary} />
                <ColorPicker label="Secondary Text" field="text_secondary" value={settings.text_secondary} />
                <ColorPicker label="Muted Text" field="text_muted" value={settings.text_muted} />
                <ColorPicker label="Light Text" field="text_light" value={settings.text_light} />
              </div>
            </section>

            {/* Semantic Colors */}
            <section className="bg-section-light rounded-xl p-6 border border-section-border shadow-sm">
              <h2 className="text-xl font-bold text-brand-text mb-6">Semantic Colors</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ColorPicker label="Success" field="success_color" value={settings.success_color} />
                <ColorPicker label="Error" field="error_color" value={settings.error_color} />
                <ColorPicker label="Warning" field="warning_color" value={settings.warning_color} />
                <ColorPicker label="Info" field="info_color" value={settings.info_color} />
              </div>
            </section>
          </div>

          {/* Preview Panel */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <div className="bg-section-light rounded-xl p-6 border border-section-border shadow-sm">
                <h2 className="text-xl font-bold text-brand-text mb-4 flex items-center gap-2">
                  <Eye size={20} />
                  Live Preview
                </h2>
                <div className="space-y-4">
                  {/* Logo Preview */}
                  <div className="p-4 bg-section-subtle rounded-lg border border-section-border">
                    <p className="text-xs text-brand-text-muted mb-2">Logo</p>
                    {settings.logo_url && settings.logo_public_id ? (
                      <img
                        src={
                          settings.logo_public_id.startsWith('http')
                            ? settings.logo_public_id
                            : `${settings.logo_url}/w_${settings.logo_width},h_${settings.logo_height},c_fit,q_auto,f_auto/${settings.logo_public_id}`
                        }
                        alt={settings.site_name}
                        className="max-h-16"
                      />
                    ) : (
                      <div className="text-sm text-brand-text-muted">No logo configured</div>
                    )}
                  </div>

                  {/* Color Previews */}
                  <div className="p-4 bg-section-subtle rounded-lg border border-section-border">
                    <p className="text-xs text-brand-text-muted mb-2">Primary Colors</p>
                    <div className="flex gap-2">
                      <div
                        className="w-12 h-12 rounded"
                        style={{ backgroundColor: settings.primary_color }}
                        title="Primary"
                      />
                      <div
                        className="w-12 h-12 rounded"
                        style={{ backgroundColor: settings.secondary_color }}
                        title="Secondary"
                      />
                    </div>
                  </div>

                  {/* Button Preview */}
                  <div className="p-4 bg-section-subtle rounded-lg border border-section-border">
                    <p className="text-xs text-brand-text-muted mb-2">Button Example</p>
                    <button
                      className="px-4 py-2 rounded-lg text-white font-semibold"
                      style={{ backgroundColor: settings.primary_color }}
                    >
                      Primary Button
                    </button>
                  </div>

                  {/* Text Preview */}
                  <div className="p-4 bg-section-subtle rounded-lg border border-section-border">
                    <p className="text-xs text-brand-text-muted mb-2">Text Samples</p>
                    <p style={{ color: settings.text_primary }} className="text-sm font-semibold">
                      Primary Text
                    </p>
                    <p style={{ color: settings.text_secondary }} className="text-sm">
                      Secondary Text
                    </p>
                    <p style={{ color: settings.text_muted }} className="text-xs">
                      Muted Text
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
