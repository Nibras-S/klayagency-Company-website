import type { APIRoute } from 'astro';

export const prerender = true;

const META: Record<string, { priority: number; changefreq: string }> = {
  '/':           { priority: 1.0, changefreq: 'weekly'  },
  '/services/':  { priority: 0.9, changefreq: 'monthly' },
  '/products/':  { priority: 0.9, changefreq: 'monthly' },
  '/work/':      { priority: 0.8, changefreq: 'monthly' },
  '/contact/':   { priority: 0.7, changefreq: 'yearly'  },
};
const DEFAULT_META = { priority: 0.5, changefreq: 'monthly' };

const pages = import.meta.glob('./**/*.astro');

function toUrlPath(file: string): string {
  let p = file.replace(/^\.\//, '/').replace(/\.astro$/, '');
  p = p.replace(/\/index$/, '/');
  if (p === '') return '/';
  return p.endsWith('/') ? p : p + '/';
}

export const GET: APIRoute = ({ site }) => {
  const today = new Date().toISOString().split('T')[0];
  const base = (site?.toString() ?? 'https://n3global.tech/').replace(/\/$/, '');

  const paths = Array.from(new Set(
    Object.keys(pages)
      .map(toUrlPath)
      .filter((p) => !p.startsWith('/_'))
  )).sort();

  const body = paths
    .map((path) => {
      const m = META[path] ?? DEFAULT_META;
      return `  <url>
    <loc>${base}${path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${m.changefreq}</changefreq>
    <priority>${m.priority.toFixed(1)}</priority>
  </url>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;

  return new Response(xml, {
    status: 200,
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
