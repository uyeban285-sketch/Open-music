/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@open-music/shared'],
  output: 'standalone',
};

export default nextConfig;
