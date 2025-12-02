import { defineConfig } from 'vite';

export default defineConfig({
  define: {
    'process.env': {},
    'process.version': JSON.stringify('v18.0.0'),
    'process.versions': JSON.stringify({ node: '18.0.0' }),
    global: 'globalThis',
  },
  resolve: {
    alias: {
      buffer: 'buffer',
      crypto: 'crypto-browserify',
      stream: 'stream-browserify',
    },
    // NOTE: No custom conditions needed - Vite respects package.json export order by default
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
    include: [
      'buffer',
      'process',
      'crypto-browserify',
      'stream-browserify',
    ],
  },
});
