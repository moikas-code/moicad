import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'static',
    emptyOutDir: false, // Don't delete static/index.html
    minify: 'terser',
    target: 'es2020',
    reportCompressedSize: true,
    sourcemap: false,
    rollupOptions: {
      input: 'app/app.tsx',
      output: {
        entryFileNames: 'gui-bundle.js',
        format: 'es',
        inlineDynamicImports: true,
      },
      external: [],
    },
  },
});
