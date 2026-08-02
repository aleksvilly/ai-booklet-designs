import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://aleksvilly.github.io',
  base: '/ai-booklet-designs',
  output: 'static',
  build: {
    format: 'directory'
  }
});
