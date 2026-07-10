import { defineConfig } from 'vite';
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
  build: {
    // char*.zip (art-src/) and node_modules must never reach dist/;
    // they live outside public/ so this is automatic.
    outDir: 'dist',
  },
  test: {
    environment: 'node',
  },
});
