import type { Metadata } from 'next';
import Link from 'next/link';
import { LeadForm } from '@/components/lead-form';
import { StandardOrderForm } from '@/components/standard-order-form';
import { HoodDrawing } from '@/components/hood-drawing';
import { OrderPreviewPhoto } from '@/components/order-preview-photo';
import { MessengerLinks } from '@/components/messenger-links';
import { PageBackdrop } from '@/components/page-backdrop';
import { productBySlug, shortName, traitsOf, familyByCode } from '@/lib/catalog';
import { calculate, defaultMaterialGrade, rub } from '@/lib/calc';
import { site } from '@/lib/site';
import { openGraph } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Контакты и заявка',
  description: 'Расчёт комплекта, замер и изготовление зонтов по размерам объекта. Москва и область.',
  alternates: { canonical: '/contacts' },
  openGraph: openGraph({
    title: 'Контакты и заявка — FortInox',
    description: 'Расчёт комплекта, замер и изготовление зонтов по размерам объекта. Москва и область.',
    url: '/contacts',
  }),
};

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{
    cfg?: string;
    mode?: string;
    slug?: string;
    h?: string;
    w?: string;
    d?: string;
    material?: string;
    v?: string;
    opt?: string | string[];
  }>;
}) {
  const { cfg, mode: rawMode, slug, h, w, d, material: materialParam, v, opt } = await searchParams;
  const mode = rawMode === 'order' || rawMode === 'quote' ? rawMode : undefined;

  const product = slug ? productBySlug(slug) : undefined;
  const queryNum = (value?: string) => {
    if (value == null || value === '') return undefined;
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
  };
  const queryH = queryNum(h);
  const queryW = queryNum(w);
  const queryD = queryNum(d);
  /** Габарит из конфигуратора — не эталон карточки, даже если slug тот же. */
  const customDims = queryH != null || queryW != null || queryD != null;
  /** Заказ эталона: короткий формат + авто-PDF + превью фото/чертежа */
  const isStandardOrder = mode === 'order' && !!product?.base && !customDims;

  const traits = product ? traitsOf(product.family) : null;
  const family = product ? familyByCode(product.family) : null;
  const material = traits ? defaultMaterialGrade(traits.hydro) : '430';
  const calc =
    product?.base && traits
      ? calculate(product.base, traits, product.base, product.price, material, {
          typeLabel: product.type,
        })
      : null;

  const standardCfg = product?.base
    ? [
        shortName(product),
        `${product.base.h}/${product.base.w}/${product.base.d} мм`,
        `AISI ${material}`,
        product.price ? rub(product.price) : 'после расчёта',
      ].join(' · ')
    : '';

  const isOrder = mode === 'order';
  const isQuote = mode === 'quote';
  const photo = product?.images[0];
  const optList = (Array.isArray(opt) ? opt : opt ? [opt] : []).filter(Boolean);
  const drawMaterial = materialParam === '304' || materialParam === '430' ? materialParam : material;
  const drawing = product?.base
    ? {
        slug: product.slug,
        dims: {
          h: queryH ?? product.base.h,
          w: queryW ?? product.base.w,
          d: queryD ?? product.base.d,
        },
        material: drawMaterial,
        options: optList,
        captureVelocity: queryNum(v),
      }
    : undefined;

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
                  ? 'Имя, телефон, при необходимости доп. оборудование и примечание — чертёж выбранного типоразмера уйдёт вместе с заказом. На сервере файл не сохраняется.'
                  : isOrder
                    ? 'Конфигурация уже в заявке, чертёж PDF уйдёт вместе с заказом. На сервере файл не сохраняется.'
                    : isQuote && drawing
                      ? 'Чертёж изделия уйдёт вместе с заявкой. Если узел отличается от типового — приложите эскиз или пояснение.'
                      : isQuote
                      ? 'Приложите эскизы, чертежи и пояснения — производство пересчитает по вашим вводным, а не только по типовому габариту.'
                      : 'Опишите задачу — ответим с ориентиром по сроку и цене. Для объектов с открытым огнём приложим схему тракта по пп. 5.28–5.33 и спецификацию комплекта.'}
              </p>
            </div>
          </div>

          {isStandardOrder && product?.base && calc && traits && (
            <div className="order-preview mt-8">
              {photo && <OrderPreviewPhoto src={photo} alt={product.name} />}
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
              <div className="tiles mt-8" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))' }}>
                <div className="tile">
                  <span className="lbl">Телефон</span>
                  <a href={site.phoneHref} className="num text-lg no-underline whitespace-nowrap">{site.phone}</a>
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
            availableOptions={product.options}
          />
        ) : (
          <LeadForm configuration={cfg} mode={mode} drawing={drawing} />
        )}
      </div>
    </section>
  );
}
