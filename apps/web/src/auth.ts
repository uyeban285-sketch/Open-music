import type { NextAuthConfig, NextAuthResult } from 'next-auth';
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000/api/v1';

const config: NextAuthConfig = {
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        try {
          const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          });
          if (!res.ok) return null;
          const data = (await res.json()) as {
            accessToken: string;
            refreshToken: string;
            expiresIn: number;
          };

          // Fetch user info
          const meRes = await fetch(`${API_BASE}/auth/me`, {
            headers: { Authorization: `Bearer ${data.accessToken}` },
          });
          if (!meRes.ok) return null;
          const user = (await meRes.json()) as {
            id: string;
            email: string;
            role: string;
          };

          return {
            id: user.id,
            email: user.email,
            role: user.role,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
          };
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token['accessToken'] = (user as Record<string, unknown>)['accessToken'];
        token['refreshToken'] = (user as Record<string, unknown>)['refreshToken'];
        token['role'] = (user as Record<string, unknown>)['role'];
        token['userId'] = user.id;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token['userId'] as string;
      (session as unknown as Record<string, unknown>)['accessToken'] = token['accessToken'];
      (session as unknown as Record<string, unknown>)['role'] = token['role'];
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: { strategy: 'jwt' },
  secret: process.env['NEXTAUTH_SECRET'] ?? 'dev-secret-change-in-prod',
};

const nextAuth: NextAuthResult = NextAuth(config);

export const handlers: NextAuthResult['handlers'] = nextAuth.handlers;
export const signIn: NextAuthResult['signIn'] = nextAuth.signIn;
export const signOut: NextAuthResult['signOut'] = nextAuth.signOut;
export const auth: NextAuthResult['auth'] = nextAuth.auth;
