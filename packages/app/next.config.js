const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Turbopack config - set root to monorepo root (like landing does)
  turbopack: {
    root: path.join(__dirname, '../..'),
    resolveAlias: {
      '@moicad/sdk/scad': './packages/sdk/dist/scad/index.js',
      '@moicad/sdk/runtime': './packages/sdk/dist/runtime/index.js',
      '@moicad/sdk/viewport': './packages/sdk/dist/viewport/index.js',
      '@moicad/sdk/functional': './packages/sdk/dist/functional.js',
      '@moicad/sdk/animation': './packages/sdk/dist/animation/index.js',
      '@moicad/sdk/interactive': './packages/sdk/dist/interactive/index.js',
      '@moicad/sdk': './packages/sdk/dist/index.js',
    },
  },
  transpilePackages: ['@moicad/sdk'],
  experimental: {
    externalDir: true,
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // Webpack config for Three.js and other dependencies
  webpack: (config, { isServer }) => {
    // Add SDK resolve aliases
    config.resolve.alias = {
      ...config.resolve.alias,
      '@moicad/sdk$': path.join(__dirname, '../sdk/dist/index.js'),
      '@moicad/sdk/scad': path.join(__dirname, '../sdk/dist/scad/index.js'),
      '@moicad/sdk/runtime': path.join(__dirname, '../sdk/dist/runtime/index.js'),
      '@moicad/sdk/viewport': path.join(__dirname, '../sdk/dist/viewport/index.js'),
      '@moicad/sdk/functional': path.join(__dirname, '../sdk/dist/functional.js'),
      '@moicad/sdk/animation': path.join(__dirname, '../sdk/dist/animation/index.js'),
      '@moicad/sdk/interactive': path.join(__dirname, '../sdk/dist/interactive/index.js'),
    };
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
