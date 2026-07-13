import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  // Relative base so the built site works on GitHub Pages project sites
  // (https://user.github.io/repo/) without knowing the repo name.
  base: './',
  resolve: {
    alias: {
      '@core': fileURLToPath(new URL('./src/core', import.meta.url)),
      '@modules': fileURLToPath(new URL('./src/modules', import.meta.url)),
      '@content': fileURLToPath(new URL('./content', import.meta.url)),
    },
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      // Precache only the app shell; the heavy static data (voice mp3s,
      // vocab decks, art, kanji strokes) is cached at runtime on first use.
      workbox: {
        mode: 'development',
        globPatterns: ['**/*.{js,css,html}', 'pwa-*.png', 'apple-touch-icon.png'],
        globIgnores: ['audio/**', 'vocab/**', 'bg/**', 'sprites/**', 'kanji-data.js'],
        navigateFallback: null,
        runtimeCaching: [
          {
            urlPattern: /\/kanji-data\.js$/,
            handler: 'CacheFirst',
            options: { cacheName: 'kanji-data', expiration: { maxEntries: 2 } },
          },
          {
            urlPattern: /\/vocab\/.*\.json$/,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'vocab-decks', expiration: { maxEntries: 12 } },
          },
          {
            urlPattern: /\/(bg|sprites)\/.*\.(png|jpg)$/,
            handler: 'CacheFirst',
            options: { cacheName: 'art', expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 90 } },
          },
          {
            urlPattern: /\/audio\/.*\.mp3$/,
            handler: 'CacheFirst',
            options: { cacheName: 'voice-clips', expiration: { maxEntries: 600, maxAgeSeconds: 60 * 60 * 24 * 90 } },
          },
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/,
            handler: 'CacheFirst',
            options: { cacheName: 'fonts', expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
        ],
      },
      manifest: {
        name: '活用! Katsuyo — Daily Japanese Battles',
        short_name: 'Katsuyo',
        description: 'Daily Japanese battles: conjugation sprint, kanji drawing, otome academy and the Royal Gamble card table.',
        lang: 'en',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0d0a1a',
        theme_color: '#0d0a1a',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  build: {
    // char*.zip (art-src/) and node_modules must never reach dist/;
    // they live outside public/ so this is automatic.
    outDir: 'dist',
  },
  test: {
    environment: 'node',
  },
});
