import type { Metadata } from 'next';
import { LeadForm } from '@/components/lead-form';
import { StandardOrderExperience } from '@/components/standard-order-experience';
import { MessengerLinks } from '@/components/messenger-links';
import { PageBackdrop } from '@/components/page-backdrop';
import {
  productBySlug,
  productPriceAt,
  shortName,
  traitsOf,
  supportsParametricDrawing,
} from '@/lib/catalog';
import { defaultMaterialGrade, type Dims } from '@/lib/calc';
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
  const orderDims: Dims | null = product?.base
    ? {
        h: queryH ?? product.base.h,
        w: queryW ?? product.base.w,
        d: queryD ?? product.base.d,
      }
    : null;
  /**
   * Заказ стандарта: короткий формат + авто-PDF.
   * С cfg — сборка из конфигуратора (полная форма).
   * Без cfg — карточка/каталог; габарит из query или base, если есть цена в прайсе.
   */
  const listPrice =
    product && orderDims
      ? productPriceAt(product.article, orderDims, product.base)
      : null;
  const isStandardOrder =
    mode === 'order' && !!product?.base && !!orderDims && listPrice != null && !cfg;

  const traits = product ? traitsOf(product.family) : null;
  const material = traits ? defaultMaterialGrade(traits.hydro) : '430';
  const isOrder = mode === 'order';
  const isQuote = mode === 'quote';
  const optList = (Array.isArray(opt) ? opt : opt ? [opt] : []).filter(Boolean);
  const drawMaterial = materialParam === '304' || materialParam === '430' ? materialParam : material;
  const drawing = orderDims
    ? {
        slug: product!.slug,
        dims: orderDims,
        material: drawMaterial,
        options: optList,
        captureVelocity: queryNum(v),
      }
    : undefined;

  const standardIntro =
    product && supportsParametricDrawing(product.family)
      ? 'Имя, телефон, при необходимости доп. оборудование и примечание — чертёж стандартного типоразмера уйдёт вместе с заказом. На сервере файл не сохраняется.'
      : 'Имя, телефон и примечание — заявку примем без параметрического чертежа (у этой линейки другая геометрия). Рабочий лист подготовим под заказ.';

  return (
    <section className="band band-shop page-hero band--backdrop">
      <PageBackdrop theme="steel" />
      <div className="wrap grid gap-10 lg:grid-cols-[1fr_420px]">
        {isStandardOrder && product && orderDims && traits ? (
          <StandardOrderExperience
            slug={product.slug}
            productName={product.name}
            shortLabel={shortName(product)}
            article={product.article}
            dims={orderDims}
            traits={traits}
            typeLabel={product.type}
            basePrice={listPrice}
            availableOptions={product.options}
            photoSrc={product.images[0]}
            supportsDrawing={supportsParametricDrawing(product.family)}
            intro={standardIntro}
          />
        ) : (
          <>
            <div>
              <div className="backdrop-copy">
                <div className="head">
                  <p className="lbl">Заявка</p>
                  <h1>
                    {isOrder
                      ? 'Оформим заказ по вашей сборке'
                      : isQuote
                        ? 'Посчитаем точную цену по вводным'
                        : 'Проверим объект и пришлём расчёт'}
                  </h1>
                  <p className="muted mt-6 leading-relaxed">
                    {isOrder
                      ? 'Конфигурация уже в заявке, чертёж PDF уйдёт вместе с заказом. На сервере файл не сохраняется.'
                      : isQuote && drawing && product && supportsParametricDrawing(product.family)
                        ? 'Чертёж изделия уйдёт вместе с заявкой. Если узел отличается от типового — приложите эскиз или пояснение.'
                        : isQuote
                          ? 'Приложите эскизы, чертежи и пояснения — производство пересчитает по вашим вводным, а не только по типовому габариту.'
                          : 'Опишите задачу — ответим с ориентиром по сроку и цене. Для объектов с открытым огнём приложим схему тракта по пп. 5.28–5.33 и спецификацию комплекта.'}
                  </p>
                </div>
              </div>

              <div className="tiles mt-8" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))' }}>
                <div className="tile">
                  <span className="lbl">Телефон</span>
                  <a href={site.phoneHref} className="num text-lg no-underline whitespace-nowrap">
                    {site.phone}
                  </a>
                </div>
                <div className="tile">
                  <span className="lbl">Почта</span>
                  <a href={`mailto:${site.email}`} className="num text-lg no-underline">
                    {site.email}
                  </a>
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
            </div>
            <LeadForm configuration={cfg} mode={mode} drawing={drawing} />
          </>
        )}
      </div>
    </section>
  );
}
