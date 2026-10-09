import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { NeutralGallery } from '@/components/neutral-gallery';
import { PageBackdrop } from '@/components/page-backdrop';
import { neutralBySlug, neutralFullName, neutralItems } from '@/lib/neutral';

/**
 * Одна позиция нейтралки: только её фото и описание.
 * Остальные типы — отдельные страницы, не пролистываются подряд.
 */

export function generateStaticParams() {
  return neutralItems.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const item = neutralBySlug(slug);
  if (!item) return {};
  const name = neutralFullName(item);
  return {
    title: `${name} на заказ`,
    description: item.lead,
    alternates: { canonical: `/eshchyo-delaem/${item.slug}` },
  };
}

export default async function NeutralItemPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const item = neutralBySlug(slug);
  if (!item) notFound();

  const name = neutralFullName(item);

  return (
    <>
      <section className="band band-shop page-hero band--backdrop neutral-item-hero">
        <PageBackdrop theme="steel" />
        <div className="wrap">
          {/* backdrop-copy только слева: иначе max-width: 58ch держит всё у края */}
          <div className="neutral-item-hero__row">
            <div className="backdrop-copy neutral-item-hero__main">
              <p className="lbl" style={{ color: 'var(--color-extract)' }}>
                {item.label}
              </p>
              <h1 className="neutral-item-title">{item.title}</h1>
              <p className="muted leading-relaxed">{item.lead}</p>
            </div>
            <div className="neutral-item-hero__cta">
              <p className="neutral-item-hero__pitch-line">
                <span className="neutral-item-hero__pitch">Пришлите эскиз — посчитаем.</span>{' '}
                Фото места и размеры уже позволяют назвать порядок цены.
              </p>
              <div className="neutral-item-hero__actions">
                <Link href="/contacts" className="btn">
                  Оставить заявку
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="band band-deep">
        <div className="wrap">
          <NeutralGallery photos={item.photos} alt={name} />
        </div>
      </section>
    </>
  );
}
