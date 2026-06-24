// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  site: 'https://www.n3global.tech',
  // Static by default; only API routes opt into server-side via `export const prerender = false`
  output: 'static',
  adapter: cloudflare({
    imageService: 'passthrough',
  }),
  build: {
    // Inline all stylesheets into <style> blocks so there's no render-blocking
    // <link rel="stylesheet"> request. Per-page CSS is small enough (~5–10 KB
    // gzipped each) that inlining is a net win for first paint.
    inlineStylesheets: 'always',
  },
});
