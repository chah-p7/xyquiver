import path from 'node:path';
import { fileURLToPath } from 'node:url';

import tailwindcss from '@tailwindcss/postcss';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));

function pagesBasePath(value: string | undefined) {
  if (!value || value === '/') {
    return '/';
  }

  return `/${value.replace(/^\/+|\/+$/g, '')}/`;
}

export default defineConfig({
  root: path.join(projectRoot, 'github-pages'),
  publicDir: path.join(projectRoot, 'public'),
  base: pagesBasePath(process.env.PAGES_BASE_PATH),
  plugins: [react()],
  resolve: {
    alias: {
      '@': projectRoot,
    },
  },
  css: {
    postcss: {
      plugins: [tailwindcss()],
    },
  },
  build: {
    outDir: path.join(projectRoot, 'dist-pages'),
    emptyOutDir: true,
  },
});
