import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';

// VITE_BASE_PATH = "/nom-du-depot/" pour GitHub Pages (https://compte.github.io/nom-du-depot/)
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    base: env.VITE_BASE_PATH || '/',
    plugins: [react()],
    resolve: { alias: { '@coran/core': fileURLToPath(new URL('../../packages/core/src/index.ts', import.meta.url)) } },
    build: { outDir: 'dist', sourcemap: false, target: 'es2020' },
    server: { port: 5173 },
  };
});
