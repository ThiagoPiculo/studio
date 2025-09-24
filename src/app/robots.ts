import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const sitemapUrl = 'https://mini-herois-app.com/sitemap.xml'; // TODO: Substituir pelo seu domínio real

  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: sitemapUrl,
  };
}
