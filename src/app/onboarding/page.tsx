'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  Building2,
  Users,
  Mail,
  Phone,
  Globe,
  MapPin,
  ChevronRight,
  ChevronLeft,
  Check,
  Loader
} from 'lucide-react';
import type {
  OnboardingFormData,
  OnboardingStep,
  StakeholderType,
  Role,
  RelationshipType,
  StakeholderTypeCode,
  RoleCode,
} from '@/lib/types/onboarding';

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('type-selection');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reference data
  const [stakeholderTypes, setStakeholderTypes] = useState<StakeholderType[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [relationshipTypes, setRelationshipTypes] = useState<RelationshipType[]>([]);

  // Form data
  const [formData, setFormData] = useState<OnboardingFormData>({
    stakeholder_type: null,
    name: '',
    email: '',
    phone: '',
    website: '',
    selected_roles: [],
    primary_role: null,
    relationships: [],
    terms_accepted: false,
    marketing_consent: false,
  });

  // Fetch reference data on mount
  useEffect(() => {
    async function fetchReferenceData() {
      setLoading(true);
      try {
        const res = await fetch('/api/onboarding');
        const data = await res.json();
        setStakeholderTypes(data.stakeholder_types || []);
        setRoles(data.roles || []);
        setRelationshipTypes(data.relationship_types || []);
      } catch (err) {
        console.error('Error fetching reference data:', err);
        setError('Failed to load form data');
      } finally {
        setLoading(false);
      }
    }
    fetchReferenceData();
  }, []);

  const handleNext = () => {
    const steps: OnboardingStep[] = ['type-selection', 'registration', 'roles', 'relationships', 'verification'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    const steps: OnboardingStep[] = ['type-selection', 'registration', 'roles', 'relationships', 'verification'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);

    try {
      // Build submission payload
      const primaryRoleCode = formData.primary_role || formData.selected_roles[0];

      const payload = {
        stakeholder_type_code: formData.stakeholder_type,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        website: formData.website,
        country: formData.country,
        region: formData.region,
        city: formData.city,
        industry: formData.industry,
        bio: formData.bio,
        professional_background: formData.professional_background,
        registration_number: formData.registration_number,
        size: formData.size,
        lead_contact: formData.lead_contact,
        role_codes: formData.selected_roles,
        primary_role_code: primaryRoleCode,
        relationships: formData.relationships,
        role_details: formData.role_details,
        terms_accepted: formData.terms_accepted,
        marketing_consent: formData.marketing_consent,
      };

      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Registration failed');
      }

      // Success! Redirect to success page or login
      router.push(`/onboarding/success?email=${encodeURIComponent(formData.email)}`);
    } catch (err: any) {
      console.error('Submission error:', err);
      setError(err.message || 'An error occurred during registration');
    } finally {
      setSubmitting(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 'type-selection':
        return formData.stakeholder_type !== null;
      case 'registration':
        return formData.name && formData.email;
      case 'roles':
        return formData.selected_roles.length > 0;
      case 'relationships':
        return true; // Optional step
      case 'verification':
        return formData.terms_accepted;
      default:
        return false;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-background text-brand-text flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-background text-brand-text">
      {/* Header */}
      <header className="bg-section-light border-b border-section-border sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold">Stakeholder Registration</h1>
            <div className="text-sm text-brand-text-muted">
              Step {['type-selection', 'registration', 'roles', 'relationships', 'verification'].indexOf(currentStep) + 1} of 5
            </div>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="bg-section-subtle border-b border-section-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            {['Type', 'Details', 'Roles', 'Network', 'Verify'].map((label, index) => {
              const steps: OnboardingStep[] = ['type-selection', 'registration', 'roles', 'relationships', 'verification'];
              const stepIndex = steps.indexOf(currentStep);
              const isActive = index === stepIndex;
              const isComplete = index < stepIndex;

              return (
                <div key={label} className="flex items-center flex-1">
                  <div className="flex items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                        isComplete
                          ? 'bg-green-500 text-white'
                          : isActive
                          ? 'bg-accent-primary text-white'
                          : 'bg-section-subtle border border-section-border text-brand-text-muted'
                      }`}
                    >
                      {isComplete ? <Check className="w-5 h-5" /> : index + 1}
                    </div>
                    <span
                      className={`ml-2 text-sm font-medium ${
                        isActive ? 'text-brand-text' : 'text-brand-text-muted'
                      }`}
                    >
                      {label}
                    </span>
                  </div>
                  {index < 4 && (
                    <div className="flex-1 h-1 mx-4 bg-section-border">
                      <div
                        className={`h-full ${
                          isComplete ? 'bg-green-500' : 'bg-section-border'
                        }`}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-semantic-error-bg border border-red-500 text-semantic-error rounded-lg p-4">
            {error}
          </div>
        )}

        {/* Step 1: Type Selection */}
        {currentStep === 'type-selection' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">What type of stakeholder are you?</h2>
              <p className="text-brand-text-muted">
                Select the option that best describes you or your organization
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {stakeholderTypes.filter(t => ['individual', 'organisation', 'collective', 'company', 'cooperative'].includes(t.code)).map((type) => {
                const isSelected = formData.stakeholder_type === type.code;
                const Icon = type.code === 'individual' ? User : type.code === 'collective' || type.code === 'cooperative' ? Users : Building2;

                return (
                  <button
                    key={type.id}
                    onClick={() => setFormData({ ...formData, stakeholder_type: type.code as StakeholderTypeCode })}
                    className={`p-6 rounded-lg border-2 transition text-left ${
                      isSelected
                        ? 'border-accent-primary bg-accent-primary/10'
                        : 'border-section-border bg-section-light hover:border-accent-primary/50'
                    }`}
                  >
                    <Icon className={`w-10 h-10 mb-4 ${isSelected ? 'text-accent-primary' : 'text-brand-text-muted'}`} />
                    <h3 className="text-lg font-semibold mb-2">{type.label}</h3>
                    <p className="text-sm text-brand-text-muted">{type.description}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 2: Registration Details */}
        {currentStep === 'registration' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Tell us about yourself</h2>
              <p className="text-brand-text-muted">
                {formData.stakeholder_type === 'individual'
                  ? 'Provide your personal details'
                  : 'Provide your organization details'}
              </p>
            </div>

            <div className="bg-section-light border border-section-border rounded-lg p-6 space-y-4">
              {/* Common Fields */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  {formData.stakeholder_type === 'individual' ? 'Full Name' : 'Organization Name'} *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-section-subtle border border-section-border rounded"
                  placeholder={formData.stakeholder_type === 'individual' ? 'John Smith' : 'ABC Company Ltd'}
                  required
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                    <Mail className="w-4 h-4" /> Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-section-subtle border border-section-border rounded"
                    placeholder="email@example.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                    <Phone className="w-4 h-4" /> Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-section-subtle border border-section-border rounded"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
              </div>

              {formData.stakeholder_type !== 'individual' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                      <Globe className="w-4 h-4" /> Website
                    </label>
                    <input
                      type="url"
                      value={formData.website || ''}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      className="w-full px-3 py-2 bg-section-subtle border border-section-border rounded"
                      placeholder="https://example.com"
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium mb-2">Registration Number</label>
                      <input
                        type="text"
                        value={formData.registration_number || ''}
                        onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
                        className="w-full px-3 py-2 bg-section-subtle border border-section-border rounded"
                        placeholder="12345678"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Industry</label>
                      <input
                        type="text"
                        value={formData.industry || ''}
                        onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                        className="w-full px-3 py-2 bg-section-subtle border border-section-border rounded"
                        placeholder="Agriculture, Technology, etc."
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Organization Size</label>
                    <select
                      value={formData.size || ''}
                      onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                      className="w-full px-3 py-2 bg-section-subtle border border-section-border rounded"
                    >
                      <option value="">Select size</option>
                      <option value="1-10">1-10 employees</option>
                      <option value="11-50">11-50 employees</option>
                      <option value="51-200">51-200 employees</option>
                      <option value="201-500">201-500 employees</option>
                      <option value="500+">500+ employees</option>
                    </select>
                  </div>
                </>
              )}

              {formData.stakeholder_type === 'individual' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2">Bio</label>
                    <textarea
                      value={formData.bio || ''}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      className="w-full px-3 py-2 bg-section-subtle border border-section-border rounded"
                      rows={3}
                      placeholder="Tell us about yourself..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Professional Background</label>
                    <textarea
                      value={formData.professional_background || ''}
                      onChange={(e) => setFormData({ ...formData, professional_background: e.target.value })}
                      className="w-full px-3 py-2 bg-section-subtle border border-section-border rounded"
                      rows={3}
                      placeholder="Your experience and expertise..."
                    />
                  </div>
                </>
              )}

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                    <MapPin className="w-4 h-4" /> Country
                  </label>
                  <input
                    type="text"
                    value={formData.country || ''}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="w-full px-3 py-2 bg-section-subtle border border-section-border rounded"
                    placeholder="United Kingdom"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Region/State</label>
                  <input
                    type="text"
                    value={formData.region || ''}
                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                    className="w-full px-3 py-2 bg-section-subtle border border-section-border rounded"
                    placeholder="England"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">City</label>
                  <input
                    type="text"
                    value={formData.city || ''}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 bg-section-subtle border border-section-border rounded"
                    placeholder="London"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Roles */}
        {currentStep === 'roles' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Select your role(s)</h2>
              <p className="text-brand-text-muted">
                Choose one or more roles that describe your activities in this ecosystem
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {roles.map((role) => {
                const isSelected = formData.selected_roles.includes(role.code as RoleCode);

                return (
                  <button
                    key={role.id}
                    onClick={() => {
                      const newRoles = isSelected
                        ? formData.selected_roles.filter((r) => r !== role.code)
                        : [...formData.selected_roles, role.code as RoleCode];
                      setFormData({
                        ...formData,
                        selected_roles: newRoles,
                        primary_role: newRoles.length === 1 ? newRoles[0] : formData.primary_role
                      });
                    }}
                    className={`p-4 rounded-lg border-2 transition text-left ${
                      isSelected
                        ? 'border-accent-primary bg-accent-primary/10'
                        : 'border-section-border bg-section-light hover:border-accent-primary/50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-lg font-semibold">{role.label}</h3>
                      {isSelected && <Check className="w-5 h-5 text-accent-primary" />}
                    </div>
                    <p className="text-sm text-brand-text-muted">{role.description}</p>
                  </button>
                );
              })}
            </div>

            {formData.selected_roles.length > 1 && (
              <div className="bg-section-light border border-section-border rounded-lg p-6">
                <label className="block text-sm font-medium mb-3">
                  Primary Role *
                  <span className="text-brand-text-muted font-normal ml-2">
                    (This will be your main role)
                  </span>
                </label>
                <div className="space-y-2">
                  {formData.selected_roles.map((roleCode) => {
                    const role = roles.find((r) => r.code === roleCode);
                    if (!role) return null;

                    return (
                      <label key={roleCode} className="flex items-center gap-3 p-3 bg-section-subtle rounded cursor-pointer hover:bg-section-emphasis">
                        <input
                          type="radio"
                          name="primary_role"
                          value={roleCode}
                          checked={formData.primary_role === roleCode}
                          onChange={(e) => setFormData({ ...formData, primary_role: e.target.value as RoleCode })}
                          className="w-4 h-4"
                        />
                        <span>{role.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Relationships (Optional) */}
        {currentStep === 'relationships' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Build your network</h2>
              <p className="text-brand-text-muted">
                This step is optional. You can add relationships later from your dashboard.
              </p>
            </div>

            <div className="bg-section-light border border-section-border rounded-lg p-6">
              <p className="text-center text-brand-text-muted py-8">
                Relationship mapping will be available after you complete registration.
                <br />
                Click "Next" to continue to verification.
              </p>
            </div>
          </div>
        )}

        {/* Step 5: Verification */}
        {currentStep === 'verification' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Review and confirm</h2>
              <p className="text-brand-text-muted">
                Please review your information and accept the terms to complete registration
              </p>
            </div>

            {/* Summary */}
            <div className="bg-section-light border border-section-border rounded-lg p-6 space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Personal/Organization Details</h3>
                <div className="text-sm space-y-1 text-brand-text-muted">
                  <p><strong>Type:</strong> {stakeholderTypes.find(t => t.code === formData.stakeholder_type)?.label}</p>
                  <p><strong>Name:</strong> {formData.name}</p>
                  <p><strong>Email:</strong> {formData.email}</p>
                  {formData.phone && <p><strong>Phone:</strong> {formData.phone}</p>}
                  {formData.country && <p><strong>Location:</strong> {[formData.city, formData.region, formData.country].filter(Boolean).join(', ')}</p>}
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Roles</h3>
                <div className="flex flex-wrap gap-2">
                  {formData.selected_roles.map((roleCode) => {
                    const role = roles.find((r) => r.code === roleCode);
                    const isPrimary = roleCode === (formData.primary_role || formData.selected_roles[0]);
                    return (
                      <span
                        key={roleCode}
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          isPrimary
                            ? 'bg-accent-primary text-white'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {role?.label} {isPrimary && '(Primary)'}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Terms and Conditions */}
            <div className="bg-section-light border border-section-border rounded-lg p-6 space-y-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.terms_accepted}
                  onChange={(e) => setFormData({ ...formData, terms_accepted: e.target.checked })}
                  className="mt-1 w-4 h-4"
                  required
                />
                <span className="text-sm">
                  I accept the{' '}
                  <a href="/terms" target="_blank" className="text-accent-primary underline">
                    terms and conditions
                  </a>{' '}
                  and{' '}
                  <a href="/privacy" target="_blank" className="text-accent-primary underline">
                    privacy policy
                  </a>{' '}
                  *
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.marketing_consent}
                  onChange={(e) => setFormData({ ...formData, marketing_consent: e.target.checked })}
                  className="mt-1 w-4 h-4"
                />
                <span className="text-sm text-brand-text-muted">
                  I would like to receive updates and marketing communications
                </span>
              </label>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-8 pt-8 border-t border-section-border">
          <button
            onClick={handleBack}
            disabled={currentStep === 'type-selection'}
            className="flex items-center gap-2 px-6 py-3 bg-section-subtle hover:bg-section-emphasis rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-5 h-5" />
            Back
          </button>

          {currentStep === 'verification' ? (
            <button
              onClick={handleSubmit}
              disabled={!canProceed() || submitting}
              className="flex items-center gap-2 px-6 py-3 bg-accent-primary hover:bg-accent-primary-hover text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  Submit Registration
                  <Check className="w-5 h-5" />
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className="flex items-center gap-2 px-6 py-3 bg-accent-primary hover:bg-accent-primary-hover text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
