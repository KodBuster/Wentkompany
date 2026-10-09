import data from '@/data/neutral.json';

export interface NeutralItem {
  slug: string;
  kind: 'bar' | 'other';
  label: string;
  title: string;
  lead: string;
  photos: string[];
}

export const neutralItems = data.items as NeutralItem[];

export const neutralBySlug = (slug: string) =>
  neutralItems.find((item) => item.slug === slug);

/** Полное имя для SEO и заголовков — title уже полное. */
export function neutralFullName(item: NeutralItem) {
  return item.title;
}
