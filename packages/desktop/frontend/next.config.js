/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
  // Configure for both Webpack and Turbopack
  experimental: {},
  // Webpack config for Three.js and other dependencies (for webpack builds)
  webpack: (config, { isServer }) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    };
    return config;
  },
  // Turbopack config (for Turbopack builds)
  turbopack: {
    root: __dirname,
  },
};

module.exports = nextConfig;
