
import { MetadataRoute } from 'next';

// Em um app real, você buscaria esses dados do seu banco de dados.
// Aqui, estamos simulando a busca de posts de blog.
const mockBlogPosts = [
  { slug: 'guia-de-missoes', updatedAt: new Date('2024-09-01T10:00:00Z') },
  { slug: 'o-poder-das-recompensas', updatedAt: new Date('2024-08-25T15:30:00Z') },
];

export default function sitemap(): MetadataRoute.Sitemap {
  
  // TODO: Substituir pelo seu domínio real quando o site for publicado.
  const baseUrl = 'https://mini-herois-app.com';

  // 1. Páginas Estáticas
  // Estas são as páginas principais do seu site que não mudam com frequência.
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 1.0, // A página principal é a mais importante.
    },
    {
      url: `${baseUrl}/auth/login`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/auth/register`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
     {
      url: `${baseUrl}/dashboard/child-login`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];

  // 2. Páginas Dinâmicas
  // Aqui, buscamos dados (ex: do seu banco de dados) para criar URLs dinâmicas.
  // Neste exemplo, estamos criando URLs para posts de um blog.
  const dynamicBlogRoutes = mockBlogPosts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: post.updatedAt,
    changeFrequency: 'weekly' as 'weekly', // Posts de blog podem mudar.
    priority: 0.7, // Importantes, mas menos que a home.
  }));

  // 3. Combina todas as rotas
  // O resultado final é um array com todas as URLs do seu site.
  return [
    ...staticRoutes,
    ...dynamicBlogRoutes,
  ];
}
