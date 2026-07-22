import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/** Les composants sont testes dans un DOM simule, sans navigateur ni Worker. */
export default defineConfig({
  plugins: [react()],
  /* La config PostCSS du projet est destinee a Next.js : les tests n'ont pas
     besoin de Tailwind, on court-circuite sa decouverte. */
  css: { postcss: {} },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    include: ['test/**/*.test.{ts,tsx}'],
  },
});
