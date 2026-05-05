// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  site: 'https://n3global.tech',
  // Static by default; only API routes opt into server-side via `export const prerender = false`
  output: 'static',
  adapter: vercel(),
});
