/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  trailingSlash: true,
  async rewrites() {
    return [
      {
        source: '/pipeline/',
        destination: '/pipeline',
      },
      {
        source: '/dashboard/',
        destination: '/dashboard',
      },
      {
        source: '/ideas/',
        destination: '/ideas',
      },
    ];
  },
}

module.exports = nextConfig
