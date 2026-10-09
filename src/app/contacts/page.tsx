import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { LeadForm } from '@/components/lead-form';
import { StandardOrderForm } from '@/components/standard-order-form';
import { HoodDrawing } from '@/components/hood-drawing';
import { MessengerLinks } from '@/components/messenger-links';
import { PageBackdrop } from '@/components/page-backdrop';
import { productBySlug, shortName, traitsOf, familyByCode } from '@/lib/catalog';
import { calculate, defaultMaterialGrade, rub } from '@/lib/calc';
import { site } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Контакты и заявка',
  description: 'Расчёт комплекта, замер и изготовление зонтов по размерам объекта. Москва и область.',
  alternates: { canonical: '/contacts' },
};

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ cfg?: string; mode?: string; slug?: string }>;
}) {
  const { cfg, mode: rawMode, slug } = await searchParams;
  const mode = rawMode === 'order' || rawMode === 'quote' ? rawMode : undefined;

  const product = slug ? productBySlug(slug) : undefined;
  /** Заказ эталона: короткий формат + авто-PDF + превью фото/чертежа */
  const isStandardOrder = mode === 'order' && !!product?.base;

  const traits = product ? traitsOf(product.family) : null;
  const family = product ? familyByCode(product.family) : null;
  const material = traits ? defaultMaterialGrade(traits.hydro) : '430';
  const calc =
    product?.base && traits
      ? calculate(product.base, traits, product.base, product.price, material)
      : null;

  const standardCfg = product?.base
    ? [
        shortName(product),
        `${product.base.h}/${product.base.w}/${product.base.d} мм`,
        `AISI ${material}`,
        product.price ? rub(product.price) : 'цена по запросу',
      ].join(' · ')
    : '';

  const isOrder = mode === 'order';
  const isQuote = mode === 'quote';
  const photo = product?.images[0];

  return (
    <section className="band band-shop page-hero band--backdrop">
      <PageBackdrop theme="steel" />
      <div className="wrap grid gap-10 lg:grid-cols-[1fr_420px]">
        <div>
          <div className="backdrop-copy">
            <div className="head">
              <p className="lbl">Заявка</p>
              <h1>
                {isStandardOrder
                  ? 'Оформить заказ эталона'
                  : isOrder
                    ? 'Оформим заказ по вашей сборке'
                    : isQuote
                      ? 'Посчитаем точную цену по вводным'
                      : 'Проверим объект и пришлём расчёт'}
              </h1>
              <p className="muted mt-6 leading-relaxed">
                {isStandardOrder
                  ? 'Имя, телефон и при желании примечание — чертёж выбранного типоразмера уйдёт вместе с заказом. На сервере файл не сохраняется.'
                  : isOrder
                    ? 'Конфигурация уже в заявке. Нужен пакет документов: чертёж, КП и спецификация — производство подтвердит срок и сумму.'
                    : isQuote
                      ? 'Приложите эскизы, чертежи и пояснения — производство пересчитает по вашим вводным, а не только по типовому габариту.'
                      : 'Опишите задачу — ответим с ориентиром по сроку и цене. Для объектов с открытым огнём приложим схему тракта по пп. 5.28–5.33 и спецификацию комплекта.'}
              </p>
            </div>
          </div>

          {isStandardOrder && product?.base && calc && traits && (
            <div className="order-preview mt-8">
              {photo && (
                <div className="order-preview__photo">
                  <Image
                    src={photo}
                    alt={product.name}
                    width={960}
                    height={720}
                    className="order-preview__img"
                    sizes="(max-width: 900px) 100vw, 480px"
                  />
                </div>
              )}
              <div className="order-preview__drawing">
                <HoodDrawing
                  compact
                  input={{
                    dims: product.base,
                    traits,
                    calc,
                    article: product.article,
                    productName: family?.title ?? product.name,
                    material,
                    typeLabel: product.type,
                  }}
                />
              </div>
              <p className="lbl mt-3">
                <Link href={`/catalog/${product.slug}`} className="no-underline">
                  {shortName(product)} · подробнее на карточке →
                </Link>
              </p>
            </div>
          )}

          {!isStandardOrder && (
            <>
              <div className="tiles mt-8" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))' }}>
                <div className="tile">
                  <span className="lbl">Телефон</span>
                  <a href={site.phoneHref} className="num text-lg no-underline">{site.phone}</a>
                </div>
                <div className="tile">
                  <span className="lbl">Почта</span>
                  <a href={`mailto:${site.email}`} className="num text-lg no-underline">{site.email}</a>
                </div>
                <div className="tile">
                  <span className="lbl">География</span>
                  <span>{site.address}</span>
                </div>
                <div className="tile">
                  <span className="lbl">Часы работы</span>
                  <span className="num">{site.hours}</span>
                </div>
              </div>
              <p className="lbl mt-6">Реквизиты и адрес производства подставим из карточки компании.</p>
              <div className="mt-6">
                <MessengerLinks />
              </div>
            </>
          )}

          {isStandardOrder && (
            <div className="mt-6">
              <MessengerLinks />
            </div>
          )}
        </div>
        {isStandardOrder && product?.base ? (
          <StandardOrderForm
            slug={product.slug}
            dims={product.base}
            configuration={standardCfg}
            material={material}
          />
        ) : (
          <LeadForm configuration={cfg} mode={mode} />
        )}
      </div>
    </section>
  );
}
