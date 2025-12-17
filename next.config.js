/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Streaming requires experimental serverActions in some versions
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

module.exports = nextConfig;

