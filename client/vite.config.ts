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
      includeAssets: ['sekouG_logo.jpg', 'favicon.svg', 'logos/*.jpg'],
      manifest: {
        name: 'Sekou-Gaming — Portail Multi-Jeux',
        short_name: 'SekouGaming',
        description: 'Sekou-Gaming : jouez à Sekouno et Loup-Garou en ligne et sur mobile',
        theme_color: '#0f172a',
        background_color: '#090e1c',
        display: 'standalone',
        orientation: 'any',
        icons: [
          {
            src: '/sekouG_logo.jpg',
            sizes: '192x192',
            type: 'image/jpeg',
            purpose: 'any'
          },
          {
            src: '/sekouG_logo.jpg',
            sizes: '512x512',
            type: 'image/jpeg',
            purpose: 'any'
          },
          {
            src: '/sekouG_logo.jpg',
            sizes: '512x512',
            type: 'image/jpeg',
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
