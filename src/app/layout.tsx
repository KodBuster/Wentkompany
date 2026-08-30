import type { Metadata } from 'next';
// Шрифты лежат в public/fonts и объявлены в fonts.css: ни одного запроса
// к fonts.googleapis.com из браузера посетителя. Начертания, нужные на первом
// экране, предзагружаются ниже — иначе крупный заголовок перерисовывается
// и страница под ним прыгает.
import './fonts.css';
import './globals.css';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { site } from '@/lib/site';
import { Metrika } from '@/components/metrika';

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: 'WENTKOMPANY — гидрозонты, гидрофильтры и вытяжные зонты',
    template: '%s · WENTKOMPANY',
  },
  description: site.description,
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    siteName: site.name,
    title: 'WENTKOMPANY — гидрозонты, гидрофильтры и вытяжные зонты',
    description: site.description,
  },
  robots: { index: true, follow: true },
};

const orgJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: site.name,
  url: site.url,
  telephone: site.phone,
  email: site.email,
  areaServed: 'RU',
  description: site.description,
};

/** Начертания первого экрана: заголовок, основной текст, моноширинные подписи. */
const PRELOAD = [
  '/fonts/oswald-cyrillic-700.woff2',
  '/fonts/oswald-cyrillic-600.woff2',
  '/fonts/onest-cyrillic-400.woff2',
  '/fonts/plex-mono-cyrillic-400.woff2',
  '/fonts/oswald-latin-700.woff2',
  '/fonts/onest-latin-400.woff2',
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <head>
        {PRELOAD.map((href) => (
          <link key={href} rel="preload" as="font" type="font/woff2" href={href} crossOrigin="anonymous" />
        ))}
      </head>
      <body>
        <Metrika />
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
      </body>
    </html>
  );
}
