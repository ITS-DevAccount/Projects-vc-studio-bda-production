'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { Mail, Lock, User, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default function SignupPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const { signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!fullName || !email || !password || !confirmPassword) {
        throw new Error('Please fill in all fields');
      }

      if (password !== confirmPassword) {
        throw new Error('Passwords do not match');
      }

      if (password.length < 8) {
        throw new Error('Password must be at least 8 characters');
      }

      await signUp(email, password, fullName);
      setSuccess(true);
      setTimeout(() => router.push('/auth/login'), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-brand-background text-brand-text flex items-center justify-center px-4">
        <div className="text-center">
          <div className="mb-6 inline-block bg-semantic-success-bg border border-semantic-success text-semantic-success px-6 py-3 rounded-lg">
            Account created successfully! Redirecting to login...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-background text-brand-text flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Back to Home Link */}
        <div className="mb-6">
          <Link
            href="/"
            className="text-brand-text-muted hover:text-accent-primary transition flex items-center gap-2 text-sm"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
            Back to Home
          </Link>
        </div>

        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link href="/">
            <div className="w-12 h-12 bg-gradient-to-br from-accent-primary to-accent-secondary rounded-lg flex items-center justify-center cursor-pointer hover:scale-105 transition">
              <ChevronRight className="w-6 h-6" />
            </div>
          </Link>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-center mb-2">Create Account</h1>
        <p className="text-brand-text-muted text-center mb-8">
          Sign up to start managing VC Studio
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-section-light rounded-xl p-8 border border-section-border space-y-5">
          {/* Error Message */}
          {error && (
            <div className="bg-semantic-error-bg border border-semantic-error text-semantic-error px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Full Name Field */}
          <div>
            <label className="block text-sm font-semibold mb-2">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-3 w-5 h-5 text-brand-text-muted" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                className="w-full pl-10 pr-4 py-3 bg-brand-background border border-section-border rounded-lg focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 focus:outline-none text-brand-text placeholder-brand-text-muted transition"
              />
            </div>
          </div>

          {/* Email Field */}
          <div>
            <label className="block text-sm font-semibold mb-2">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 w-5 h-5 text-brand-text-muted" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full pl-10 pr-4 py-3 bg-brand-background border border-section-border rounded-lg focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 focus:outline-none text-brand-text placeholder-brand-text-muted transition"
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-sm font-semibold mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-5 h-5 text-brand-text-muted" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full pl-10 pr-4 py-3 bg-brand-background border border-section-border rounded-lg focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 focus:outline-none text-brand-text placeholder-brand-text-muted transition"
              />
            </div>
          </div>

          {/* Confirm Password Field */}
          <div>
            <label className="block text-sm font-semibold mb-2">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-5 h-5 text-brand-text-muted" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                className="w-full pl-10 pr-4 py-3 bg-brand-background border border-section-border rounded-lg focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 focus:outline-none text-brand-text placeholder-brand-text-muted transition"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent-primary hover:bg-accent-primary-hover disabled:bg-neutral-400 px-6 py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2 mt-6"
          >
            {loading ? 'Creating account...' : 'Sign Up'}
            {!loading && <ChevronRight className="w-5 h-5" />}
          </button>

          {/* Login Link */}
          <p className="text-center text-brand-text-muted text-sm">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-accent-primary hover:text-accent-primary-hover">
              Sign in here
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}