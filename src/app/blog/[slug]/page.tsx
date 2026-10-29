import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BlogProse } from '@/components/blog-prose';
import { allBlogSlugs, getBlogArticle, listBlogArticles } from '@/lib/blog';

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return allBlogSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = getBlogArticle(slug);
  if (!article) return { title: 'Статья' };
  return {
    title: article.title,
    description: article.excerpt || article.title,
    alternates: { canonical: `/blog/${article.slug}` },
  };
}

export default async function BlogArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = getBlogArticle(slug);
  if (!article) notFound();

  const all = listBlogArticles();
  const idx = all.findIndex((a) => a.slug === slug);
  const prev = idx > 0 ? all[idx - 1] : null;
  const next = idx >= 0 && idx < all.length - 1 ? all[idx + 1] : null;

  return (
    <section className="band band-shop">
      <div className="wrap blog-article">
        <nav className="blog-crumbs lbl" aria-label="Навигация по разделу">
          <Link href="/blog" className="no-underline">
            Блог
          </Link>
          <span aria-hidden>/</span>
          <span>{article.title}</span>
        </nav>

        <div className="head blog-article__head">
          <p className="lbl">Статья</p>
          <h1>{article.title}</h1>
        </div>

        <BlogProse html={article.html} />

        <div className="blog-pager">
          {prev ? (
            <Link href={`/blog/${prev.slug}`} className="blog-pager__link no-underline">
              <span className="lbl">← Предыдущая</span>
              <span className="blog-pager__title">{prev.title}</span>
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link href={`/blog/${next.slug}`} className="blog-pager__link blog-pager__link--next no-underline">
              <span className="lbl">Следующая →</span>
              <span className="blog-pager__title">{next.title}</span>
            </Link>
          ) : null}
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/blog" className="btn btn-ghost">
            Все статьи
          </Link>
          <Link href="/contacts" className="btn">
            Заявка на расчёт
          </Link>
        </div>
      </div>
    </section>
  );
}
