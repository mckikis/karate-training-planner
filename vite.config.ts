import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// The app is published at https://mckikis.github.io/karate-training-planner/
const REPO_PATH = '/karate-training-planner/'

export default defineConfig({
  base: REPO_PATH,
  server: {
    host: true, // lets the iPhone open the dev server on the same Wi-Fi
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['iconLogo.png', 'katsudo-logo.png'],
      workbox: {
        // Precache starter pictures and videos from public/exercises/ so they work offline (K16).
        globPatterns: ['**/*.{js,css,html,png,jpg,jpeg,gif,webp,svg,mp4,mov,webm}'],
        maximumFileSizeToCacheInBytes: 30 * 1024 * 1024,
      },
      manifest: {
        name: 'Karate Training Planner',
        short_name: 'Karate Planner',
        description: 'Plánovanie karate tréningov a výpočet ich trvania.',
        lang: 'sk',
        theme_color: '#3a3335',
        background_color: '#3a3335',
        display: 'standalone',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
