const path = require('path')
const fs = require('fs')

// Helper to resolve Bun symlinks
function resolveBunSymlink(pkgPath) {
  try {
    const realPath = fs.realpathSync(pkgPath)
    return realPath
  } catch {
    return pkgPath
  }
}

module.exports = {
  turbopack: {
    root: __dirname,
    resolveAlias: {
      '@moicad/sdk/scad': path.join(__dirname, '../sdk/dist/scad/index.js'),
      '@moicad/sdk/runtime': path.join(__dirname, '../sdk/dist/runtime/index.js'),
      '@moicad/sdk/viewport': path.join(__dirname, '../sdk/dist/viewport/index.js'),
      '@moicad/sdk/functional': path.join(__dirname, '../sdk/dist/functional.js'),
      '@moicad/sdk/animation': path.join(__dirname, '../sdk/dist/animation/index.js'),
      '@moicad/sdk/interactive': path.join(__dirname, '../sdk/dist/interactive/index.js'),
      '@moicad/sdk': path.join(__dirname, '../sdk/dist/index.js'),
    },
  },
  transpilePackages: ['@moicad/sdk', '@monaco-editor/react', 'monaco-editor'],
  experimental: {
    externalDir: true,
  },
  webpack: (config, { isServer }) => {
    // Resolve Bun symlinks for monaco packages
    const monacoReactPath = resolveBunSymlink(path.join(__dirname, 'node_modules/@monaco-editor/react'))
    const monacoEditorPath = resolveBunSymlink(path.join(__dirname, 'node_modules/monaco-editor'))

    config.resolve.alias = {
      ...config.resolve.alias,
      '@monaco-editor/react': monacoReactPath,
      'monaco-editor': monacoEditorPath,
      '@moicad/sdk$': path.join(__dirname, '../sdk/dist/index.js'),
      '@moicad/sdk/scad': path.join(__dirname, '../sdk/dist/scad/index.js'),
      '@moicad/sdk/runtime': path.join(__dirname, '../sdk/dist/runtime/index.js'),
      '@moicad/sdk/viewport': path.join(__dirname, '../sdk/dist/viewport/index.js'),
      '@moicad/sdk/functional': path.join(__dirname, '../sdk/dist/functional.js'),
      '@moicad/sdk/animation': path.join(__dirname, '../sdk/dist/animation/index.js'),
      '@moicad/sdk/interactive': path.join(__dirname, '../sdk/dist/interactive/index.js'),
    }
    return config
  },
}
