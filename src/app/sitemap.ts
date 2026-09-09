import type { MetadataRoute } from 'next';
import { families, products } from '@/lib/catalog';
import { site } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const url = (p: string) => `${site.url}${p}`;

  return [
    { url: url('/'), lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: url('/normy-mchs'), lastModified: now, changeFrequency: 'monthly', priority: 0.95 },
    { url: url('/dlya-obshchepita'), lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: url('/chastnyy-dom'), lastModified: now, changeFrequency: 'monthly', priority: 0.85 },
    { url: url('/nestandartnyy-zont'), lastModified: now, changeFrequency: 'monthly', priority: 0.88 },
    { url: url('/catalog'), lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: url('/eshchyo-delaem'), lastModified: now, changeFrequency: 'monthly', priority: 0.45 },
    { url: url('/contacts'), lastModified: now, changeFrequency: 'yearly', priority: 0.5 },
    ...families.map((f) => ({
      url: url(`/catalog/${f.slug}`),
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
    ...products.map((p) => ({
      url: url(`/catalog/${p.slug}`),
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
  ];
}
