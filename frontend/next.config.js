/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Enable static export for Tauri
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // Allow static optimization
  staticPageGenerationTimeout: 60,
  // Webpack config for Three.js and other dependencies
  webpack: (config, { isServer }) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    };
    return config;
  },
};

module.exports = nextConfig;
