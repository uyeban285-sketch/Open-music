'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000/api/v1';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { title?: string; detail?: string };
        setError(data.detail ?? data.title ?? 'Registration failed');
        return;
      }

      router.push('/login');
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
          Create account
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {(['Email', 'Password', 'Confirm password'] as const).map((label, i) => {
            const id = ['email', 'password', 'confirm'][i] as string;
            const value = [email, password, confirm][i] as string;
            const setter = [setEmail, setPassword, setConfirm][i] as (v: string) => void;
            return (
              <div key={id}>
                <label
                  htmlFor={id}
                  className="mb-1 block text-sm font-medium"
                  style={{ color: 'oklch(var(--palette-text) / 0.8)' }}
                >
                  {label}
                </label>
                <input
                  id={id}
                  type={id === 'email' ? 'email' : 'password'}
                  required
                  value={value}
                  onChange={(e) => setter(e.target.value)}
                  className="w-full rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2"
                  style={{
                    background: 'oklch(var(--palette-bg) / 0.8)',
                    color: 'oklch(var(--palette-text))',
                    border: '1px solid oklch(var(--palette-accent) / 0.3)',
                  }}
                />
              </div>
            );
          })}

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
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p
          className="mt-4 text-center text-sm"
          style={{ color: 'oklch(var(--palette-text) / 0.6)' }}
        >
          Already have an account?{' '}
          <Link
            href="/login"
            className="font-medium underline"
            style={{ color: 'oklch(var(--palette-accent))' }}
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
