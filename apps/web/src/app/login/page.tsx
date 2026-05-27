'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useState } from 'react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid email or password');
      } else {
        router.push('/');
        router.refresh();
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div
        className="w-full max-w-md rounded-2xl p-8"
        style={{
          background: 'oklch(var(--palette-bg-secondary) / 0.55)',
          backdropFilter: 'blur(16px) saturate(150%)',
          border: '1px solid oklch(var(--palette-accent) / 0.15)',
        }}
      >
        <h1 className="mb-6 text-2xl font-bold" style={{ color: 'oklch(var(--palette-text))' }}>
          Sign in to Open Music
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="mb-1 block text-sm font-medium"
              style={{ color: 'oklch(var(--palette-text) / 0.8)' }}
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2"
              style={{
                background: 'oklch(var(--palette-bg) / 0.8)',
                color: 'oklch(var(--palette-text))',
                border: '1px solid oklch(var(--palette-accent) / 0.3)',
              }}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium"
              style={{ color: 'oklch(var(--palette-text) / 0.8)' }}
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2"
              style={{
                background: 'oklch(var(--palette-bg) / 0.8)',
                color: 'oklch(var(--palette-text))',
                border: '1px solid oklch(var(--palette-accent) / 0.3)',
              }}
            />
          </div>

          {error && (
            <p className="text-sm text-red-400" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg py-2.5 text-sm font-semibold transition-opacity disabled:opacity-50"
            style={{
              background: 'oklch(var(--palette-accent))',
              color: 'oklch(0.1 0.02 280)',
            }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p
          className="mt-4 text-center text-sm"
          style={{ color: 'oklch(var(--palette-text) / 0.6)' }}
        >
          Don&apos;t have an account?{' '}
          <Link
            href="/register"
            className="font-medium underline"
            style={{ color: 'oklch(var(--palette-accent))' }}
          >
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
