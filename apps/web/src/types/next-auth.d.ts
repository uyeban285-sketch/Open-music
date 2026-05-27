import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    accessToken: string;
    userId: string;
    role: 'listener' | 'enthusiast' | 'power_user' | 'admin';
    error?: 'RefreshAccessTokenError';
  }

  interface User {
    accessToken: string;
    refreshToken: string;
    userId: string;
    role: 'listener' | 'enthusiast' | 'power_user' | 'admin';
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken: string;
    refreshToken: string;
    userId: string;
    role: 'listener' | 'enthusiast' | 'power_user' | 'admin';
    expiresAt: number;
    error?: 'RefreshAccessTokenError';
  }
}
