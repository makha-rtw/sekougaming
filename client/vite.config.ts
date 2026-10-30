import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import { fileURLToPath } from 'url';

const clientDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root: clientDir,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: [
        'sekouG_logo.jpg',
        'apple-touch-icon.png',
        'favicon.svg',
        'loading/*.png',
        'logos/*.jpg',
        'hub/*.jpg',
      ],
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        navigateFallback: null,
        globPatterns: ['**/*.{js,css,ico,png,svg,jpg,jpeg,webp,woff2}'],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'sekougaming-pages-v4',
              networkTimeoutSeconds: 3,
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      },
      manifest: {
        name: 'SekouGaming | Portail Multi-Jeux',
        short_name: 'SekouGaming',
        description: 'SekouGaming : jouez entre amis à Sekouno, Loups-Garous, Polychess et Sekou Bomb en ligne et sur mobile.',
        theme_color: '#0f172a',
        background_color: '#090e1c',
        display: 'standalone',
        orientation: 'any',
        icons: [
          {
            src: '/apple-touch-icon.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/apple-touch-icon.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/apple-touch-icon.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@shared': path.resolve(clientDir, '../shared')
    }
  },
  server: {
    host: true,
    port: 3000,
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true
      },
      '/api': {
        target: 'http://localhost:3001'
      }
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
});
