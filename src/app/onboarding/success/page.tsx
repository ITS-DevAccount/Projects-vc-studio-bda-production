'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Mail, ArrowRight } from 'lucide-react';

export default function OnboardingSuccessPage() {
  const searchParams = useSearchParams();
  const email = searchParams?.get('email') || '';

  return (
    <div className="min-h-screen bg-brand-background text-brand-text flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-section-light border border-section-border rounded-lg p-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
          </div>

          <h1 className="text-3xl font-bold mb-4">Registration Successful!</h1>

          <p className="text-lg text-brand-text-muted mb-6">
            Thank you for registering with VC Studio BDA.
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8 text-left">
            <div className="flex items-start gap-3">
              <Mail className="w-6 h-6 text-blue-600 mt-1 flex-shrink-0" />
              <div>
                <h2 className="font-semibold text-blue-900 mb-2">
                  Verification Email Sent
                </h2>
                <p className="text-sm text-blue-800 mb-3">
                  We've sent a verification email to:
                </p>
                <p className="text-sm font-mono bg-white border border-blue-200 rounded px-3 py-2 mb-3">
                  {email}
                </p>
                <p className="text-sm text-blue-800">
                  Please check your inbox and click the verification link to activate your account.
                  If you don't see the email, check your spam folder.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-lg mb-3">What happens next?</h3>

            <div className="text-left bg-section-subtle rounded-lg p-4 space-y-3">
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-accent-primary text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                  1
                </div>
                <div>
                  <p className="font-medium">Verify your email address</p>
                  <p className="text-sm text-brand-text-muted">
                    Click the link in the email we just sent you
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-8 h-8 bg-accent-primary text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                  2
                </div>
                <div>
                  <p className="font-medium">Admin review</p>
                  <p className="text-sm text-brand-text-muted">
                    Our team will review your registration (typically within 24 hours)
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-8 h-8 bg-accent-primary text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                  3
                </div>
                <div>
                  <p className="font-medium">Access granted</p>
                  <p className="text-sm text-brand-text-muted">
                    Once approved, you'll receive an email with login instructions
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-section-border">
            <p className="text-sm text-brand-text-muted mb-4">
              Need help or have questions?
            </p>
            <div className="flex gap-4 justify-center">
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-6 py-3 bg-section-subtle hover:bg-section-emphasis rounded-lg transition"
              >
                Return Home
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 px-6 py-3 bg-accent-primary hover:bg-accent-primary-hover text-white rounded-lg transition"
              >
                Contact Support
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-brand-text-muted">
            Didn't receive the email?{' '}
            <button className="text-accent-primary hover:underline">
              Resend verification email
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
