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
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
        <div className="text-center">
          <div className="mb-6 inline-block bg-green-900/20 border border-green-500 text-green-300 px-6 py-3 rounded-lg">
            Account created successfully! Redirecting to login...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <ChevronRight className="w-6 h-6" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-center mb-2">Create Account</h1>
        <p className="text-gray-400 text-center mb-8">
          Sign up to start managing VC Studio
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-gray-900 rounded-xl p-8 border border-gray-800 space-y-5">
          {/* Error Message */}
          {error && (
            <div className="bg-red-900/20 border border-red-500 text-red-300 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Full Name Field */}
          <div>
            <label className="block text-sm font-semibold mb-2">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                className="w-full pl-10 pr-4 py-3 bg-black border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none text-white placeholder-gray-500 transition"
              />
            </div>
          </div>

          {/* Email Field */}
          <div>
            <label className="block text-sm font-semibold mb-2">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full pl-10 pr-4 py-3 bg-black border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none text-white placeholder-gray-500 transition"
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-sm font-semibold mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full pl-10 pr-4 py-3 bg-black border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none text-white placeholder-gray-500 transition"
              />
            </div>
          </div>

          {/* Confirm Password Field */}
          <div>
            <label className="block text-sm font-semibold mb-2">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                className="w-full pl-10 pr-4 py-3 bg-black border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none text-white placeholder-gray-500 transition"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 px-6 py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2 mt-6"
          >
            {loading ? 'Creating account...' : 'Sign Up'}
            {!loading && <ChevronRight className="w-5 h-5" />}
          </button>

          {/* Login Link */}
          <p className="text-center text-gray-400 text-sm">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-blue-400 hover:text-blue-300">
              Sign in here
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}