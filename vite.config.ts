/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages serves the app from /<repo>/; GitHub Actions sets BASE_PATH accordingly.
const base = process.env.BASE_PATH || '/'

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // Custom worker (src/sw.ts): the precache manifest is injected, push handlers are ours.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectManifest: {
        // Only the static app shell is precached; Supabase traffic is cross-origin and never cached.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
      },
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'BookMyDesk',
        short_name: 'BookMyDesk',
        description: 'Book a seat in the office.',
        lang: 'en',
        theme_color: '#300091',
        background_color: '#300091',
        display: 'standalone',
        start_url: './',
        scope: './',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
