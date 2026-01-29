import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'static',
    emptyOutDir: false, // Don't delete static files
    minify: 'terser',
    target: 'es2020',
    reportCompressedSize: true,
    sourcemap: false,
    cssCodeSplit: false, // Inline CSS into bundle
    rollupOptions: {
      input: 'app/app.tsx',
      output: {
        entryFileNames: 'gui-bundle.js',
        assetFileNames: (assetInfo) => {
          // Rename CSS to predictable name for easy reference
          if (assetInfo.name.endsWith('.css')) {
            return 'app.css';
          }
          return 'assets/[name]-[hash][extname]';
        },
        format: 'es',
        inlineDynamicImports: true,
      },
      external: [],
    },
  },
});
