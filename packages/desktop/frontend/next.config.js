const path = require('path');

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
  // Transpile workspace packages
  transpilePackages: ['@moicad/sdk'],
  // Webpack config for Three.js and other dependencies (for webpack builds)
  webpack: (config, { isServer }) => {
    // Resolve workspace packages
    config.resolve.alias = {
      ...config.resolve.alias,
      '@moicad/sdk': path.resolve(__dirname, '../../sdk/dist'),
    };

    // Handle ES modules
    config.module.rules.push({
      test: /\.m?js$/,
      type: 'javascript/auto',
      resolve: {
        fullySpecified: false,
      },
    });

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
