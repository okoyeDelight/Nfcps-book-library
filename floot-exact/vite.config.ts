import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

const moduleDir = (name: string) => path.resolve(__dirname, 'node_modules', name);

export default defineConfig({
  root: __dirname,
  publicDir: path.resolve(__dirname, '../appdeploy-live/public'),
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      '@appdeploy/client': path.resolve(__dirname, './src/appdeploy-client.ts'),
      'react': moduleDir('react'),
      'react-dom': moduleDir('react-dom'),
      'lucide-react': moduleDir('lucide-react'),
      'mp4box': moduleDir('mp4box'),
    },
  },
  build: {
    outDir: path.resolve(__dirname, '../floot-exact-dist'),
    emptyOutDir: true,
    cssCodeSplit: false,
    assetsInlineLimit: 4096,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        entryFileNames: 'nfcps-one.js',
        assetFileNames: (assetInfo) => assetInfo.name?.endsWith('.css') ? 'nfcps-one.css' : 'assets/[name]-[hash][extname]',
      },
    },
  },
});
