'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { supabase } from '@/lib/supabase/client';
import { getUserType, getDashboardRoute } from '@/lib/utils/userType';
import { Mail, Lock, ChevronRight, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import Logo from '@/components/branding/Logo';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!email || !password) {
        throw new Error('Please fill in all fields');
      }

      await signIn(email, password);
      
      // Wait a moment for session to be established
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Get the current user to determine their type
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const userInfo = await getUserType(authUser);
        const dashboardRoute = getDashboardRoute(userInfo);
        router.push(dashboardRoute);
      } else {
        router.push('/dashboard'); // Fallback to admin dashboard
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-background text-brand-text flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Back to Home Link */}
        <div className="mb-6">
          <Link
            href="/"
            className="text-brand-text-muted hover:text-accent-primary transition flex items-center gap-2 text-sm font-medium"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
            Back to Home
          </Link>
        </div>

        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Logo variant="default" linkTo="/" />
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-center mb-2 text-brand-text">Studio Sign In</h1>
        <p className="text-brand-text-muted text-center mb-8">
          Sign in to manage VC Studio content
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-section-light rounded-xl p-8 border border-section-border shadow-sm space-y-6">
          {/* Error Message */}
          {error && (
            <div className="bg-semantic-error-bg border border-semantic-error text-semantic-error px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Email Field */}
          <div>
            <label className="block text-sm font-semibold mb-2 text-brand-text">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 w-5 h-5 text-brand-text-muted" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full pl-10 pr-4 py-3 bg-section-subtle border border-section-border rounded-lg focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 text-brand-text placeholder-brand-text-muted transition"
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-sm font-semibold mb-2 text-brand-text">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-5 h-5 text-brand-text-muted" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full pl-10 pr-4 py-3 bg-section-subtle border border-section-border rounded-lg focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 text-brand-text placeholder-brand-text-muted transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-brand-text-muted hover:text-brand-text transition"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent-primary hover:bg-accent-primary-hover disabled:bg-neutral-400 text-white px-6 py-3 rounded-lg font-semibold transition shadow-md hover:shadow-lg flex items-center justify-center gap-2"
          >
            {loading ? 'Signing in...' : 'Sign In'}
            {!loading && <ChevronRight className="w-5 h-5" />}
          </button>

          {/* Signup Link */}
          <p className="text-center text-brand-text-muted text-sm">
            Don't have an account?{' '}
            <Link href="/auth/signup" className="text-accent-primary hover:text-accent-primary-hover font-medium transition">
              Sign up here
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}