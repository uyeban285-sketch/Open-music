import type { NextAuthOptions } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

import { authApi } from '@/lib/api-client';

export const authOptions: NextAuthOptions = {
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const tokens = await authApi.login(credentials.email, credentials.password);
          const user = await authApi.me(tokens.accessToken);

          return {
            id: user.id,
            email: user.email,
            name: user.displayName,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            userId: user.id,
            role: user.role,
          };
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.accessToken = user.accessToken;
        token.refreshToken = user.refreshToken;
        token.userId = user.userId;
        token.role = user.role;
        // Set expiry to 14 minutes (access tokens typically expire in 15 min)
        token.expiresAt = Date.now() + 14 * 60 * 1000;
      }

      // Return existing token if not expired
      if (Date.now() < token.expiresAt) {
        return token;
      }

      // Attempt to refresh the token
      try {
        const refreshed = await authApi.refresh(token.refreshToken);
        token.accessToken = refreshed.accessToken;
        token.refreshToken = refreshed.refreshToken;
        token.expiresAt = Date.now() + 14 * 60 * 1000;
      } catch {
        // Refresh failed - token will be stale, user will need to re-login
      }

      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.userId = token.userId;
      session.role = token.role;
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
};
