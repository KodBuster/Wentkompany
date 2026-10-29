import type { Metadata } from 'next';
import Link from 'next/link';
import { listBlogArticles } from '@/lib/blog';

export const metadata: Metadata = {
  title: 'Блог',
  description:
    'Статьи о вытяжных зонтах, гидрозатворах, гидрофильтрах, нормах СП 7.13130 и подборе оборудования для кухни и мангала.',
  alternates: { canonical: '/blog' },
};

export default function BlogIndexPage() {
  const articles = listBlogArticles();

  return (
    <section className="band band-shop">
      <div className="wrap">
        <div className="head">
          <p className="lbl">Материалы</p>
          <h1>Блог</h1>
          <p className="muted">
            Практические статьи по вытяжным зонтам, гидроочистке и требованиям к мангалам —
            с опорой на нормы и реальный подбор.
          </p>
        </div>

        <ul className="blog-list">
          {articles.map((a) => (
            <li key={a.slug}>
              <Link href={`/blog/${a.slug}`} className="blog-list__item no-underline">
                <span className="blog-list__body">
                  <span className="blog-list__title">{a.title}</span>
                  {a.excerpt ? <span className="blog-list__excerpt muted">{a.excerpt}</span> : null}
                </span>
                <span className="blog-list__arrow" aria-hidden>
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
