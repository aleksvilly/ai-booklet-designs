import { getPublishedCategoryCatalog } from '../category-catalog';

export const prerender = true;

const origin = 'https://aleksvilly.github.io/ai-booklet-designs';

function categoryUrl(slug: string, lang: 'en' | 'ru') {
  return `${origin}/${lang === 'ru' ? 'ru/' : ''}category/${slug}/`;
}

export function GET() {
  const staticUrls = [
    { path: '/', priority: '1.0', frequency: 'daily' },
    { path: '/wedding.html', priority: '0.9', frequency: 'weekly' },
    { path: '/menu.html', priority: '0.9', frequency: 'weekly' },
    { path: '/gifts.html', priority: '0.9', frequency: 'weekly' },
    { path: '/events.html', priority: '0.9', frequency: 'weekly' },
    { path: '/privacy.html', priority: '0.3', frequency: 'monthly' }
  ];

  const staticEntries = staticUrls.map(({ path, priority, frequency }) => `  <url>
    <loc>${origin}${path}</loc>
    <changefreq>${frequency}</changefreq>
    <priority>${priority}</priority>
  </url>`).join('\n');

  const categoryEntries = getPublishedCategoryCatalog().flatMap((entry) => {
    const english = categoryUrl(entry.slug, 'en');
    const russian = categoryUrl(entry.slug, 'ru');
    return [english, russian].map((url) => `  <url>
    <loc>${url}</loc>
    <xhtml:link rel="alternate" hreflang="x-default" href="${english}"/>
    <xhtml:link rel="alternate" hreflang="en" href="${english}"/>
    <xhtml:link rel="alternate" hreflang="ru" href="${russian}"/>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`);
  }).join('\n');

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${staticEntries}
${categoryEntries}
</urlset>\n`;

  return new Response(body, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' }
  });
}
