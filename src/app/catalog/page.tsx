import type { Metadata } from 'next';
import { CatalogAnchorRedirect } from './catalog-anchor-redirect';

export const metadata: Metadata = {
  title: 'Каталог',
  description:
    'Вытяжные и приточно-вытяжные зонты, гидрофильтры и автоматика — типоразмеры и цены на главной.',
  alternates: { canonical: '/' },
  robots: { index: false, follow: true },
};

/** Листинг /catalog снят — остаётся только редирект на якорь главной. */
export default function CatalogIndexPage() {
  return <CatalogAnchorRedirect />;
}
