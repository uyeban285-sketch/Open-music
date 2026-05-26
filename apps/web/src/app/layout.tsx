import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

import { QueryProvider } from '@/providers/query-provider';
import { AuthSessionProvider } from '@/providers/session-provider';

import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Open Music',
  description: 'Multi-source music aggregator with AI-powered recommendations',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <AuthSessionProvider>
          <QueryProvider>{children}</QueryProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
