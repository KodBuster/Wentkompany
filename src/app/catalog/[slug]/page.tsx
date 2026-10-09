import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  families, products, familyBySlug, productBySlug, productsOf, traitsOf, shortName, schemeOf,
} from '@/lib/catalog';
import { calculate, rub, ru, dec, defaultMaterialGrade } from '@/lib/calc';
import { HoodDiagram } from '@/components/hood-diagram';

/** Линейки коробчатой формы, к которым подходит схема с выносками.
 *  «Пирамида» имеет другую геометрию, гидрофильтр и щит — не зонты. */
const BOX_HOODS = ['ЗВП', 'ЗВО', 'ЗПВП', 'ЗПВО', 'ЗВПГ', 'ЗВОГ'];

/** Всё, что является зонтом: к нему применимы габарит, жироуловители и расчёт. */
const HOODS = [...BOX_HOODS, 'ПИР'];
/** Линейки, которые собираются в конфигураторе. */
const CONFIGURABLE = BOX_HOODS;
import { ProductGallery } from '@/components/product-gallery';
import { HydroChoice } from '@/components/hydro-choice';
import { AutomationModes } from '@/components/automation-modes';
import { HoodDrawing } from '@/components/hood-drawing';
import { ExportButtons } from '@/components/export-buttons';
import { ClauseRichText, ClauseTipBadge } from '@/components/clause-tip';
import { site } from '@/lib/site';

export function generateStaticParams() {
  return [
    ...families.map((f) => ({ slug: f.slug })),
    ...products.map((p) => ({ slug: p.slug })),
  ];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const family = familyBySlug(slug);
  if (family) {
    return {
      title: family.title,
      description: `${family.title}: ${family.count} типоразмера${family.priceFrom ? `, от ${rub(family.priceFrom)}` : ''}. Нержавеющая сталь AISI 430 и 304, изготовление по размерам объекта.`,
      alternates: { canonical: `/catalog/${slug}` },
    };
  }
  const product = productBySlug(slug);
  if (!product) return {};
  return {
    title: product.name,
    description: (product.short || product.description).slice(0, 300),
    alternates: { canonical: `/catalog/${slug}` },
  };
}

export default async function CatalogEntryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const family = familyBySlug(slug);
  if (family) return <FamilyView slug={slug} />;
  const product = productBySlug(slug);
  if (!product) notFound();
  return <ProductView slug={slug} />;
}

/* ------------------------------------------------------------------ */

function FamilyView({ slug }: { slug: string }) {
  const family = familyBySlug(slug)!;
  const items = productsOf(family.code);
  const traits = traitsOf(family.code);

  return (
    <section className="band band-shop">
      <div className="wrap">
        <nav className="lbl mb-3 flex flex-wrap gap-2">
          <Link href="/" className="no-underline">Главная</Link><span>/</span>
          <Link href="/#catalog" className="no-underline">Каталог</Link><span>/</span>
          <span>{family.code}</span>
        </nav>

        <div className="head">
          <p className="lbl">{family.code}</p>
          <h1>{family.title}</h1>
          <p className="muted">
            {traits.island ? 'Островное исполнение с захватом по периметру.' : 'Пристенное исполнение.'}
            {traits.supply ? ' Подаёт компенсирующий приточный воздух в рабочую зону.' : ''}
            {traits.hydro ? ' Гидрозатвор внутри корпуса — искрогашение и охлаждение потока на источнике.' : ''}
          </p>
        </div>

        {traits.hydro && (
          <p className="badge badge-crit mb-6">
            Изделие для открытого огня: применяется вместе со щитом автоматики по{' '}
            <ClauseTipBadge clauseId="5.30" label="п. 5.30" /> —{' '}
            <Link href="/normy-mchs" className="underline">разбор требований</Link>
          </p>
        )}

        <h2 className="mb-5">Типоразмеры линейки</h2>

        <div className="tiles" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))' }}>
          {items.map((p) => {
            const c = p.base ? calculate(p.base, traits, p.base, p.price) : null;
            return (
              <article key={p.id} className="tile">
                <Link href={`/catalog/${p.slug}`} className="no-underline">
                  <span className="lbl">{shortName(p)}</span>
                  <h3>{p.name.replace(/\s*\([^)]*\)\s*$/, '')}</h3>
                </Link>
                <dl className="mt-1 flex flex-col gap-1.5 text-sm">
                  <Row k="Габарит H/W/D" v={p.base ? `${p.base.h}/${p.base.w}/${p.base.d} мм` : '—'} />
                  {c && <Row k="Расход, расчёт" v={`${ru(c.airflow)} м³/ч`} />}
                  {c && <Row k="Патрубки" v={`${c.ducts.count} × Ø${c.ducts.diameter}`} />}
                </dl>
                <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t pt-3" style={{ borderColor: 'var(--hair)' }}>
                  <span className="num text-xl">{p.price ? rub(p.price) : 'по запросу'}</span>
                  {p.base ? (
                    <Link
                      href={`/contacts?mode=order&slug=${encodeURIComponent(p.slug)}`}
                      className="btn"
                    >
                      Заказать
                    </Link>
                  ) : (
                    <Link href={`/catalog/${p.slug}`} className="btn btn-ghost">
                      Подробнее
                    </Link>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        {BOX_HOODS.includes(family.code) && (
          <>
            <div className="head mt-14">
              <p className="lbl">Устройство</p>
              <h2>Как называются узлы</h2>
              <p>
                Термины из этой схемы используются в спецификации, в чертеже и в разговоре
                с монтажником.
              </p>
            </div>
            <div className="border p-6" style={{ borderColor: 'var(--hair)', background: 'var(--color-steel-900)' }}>
              <HoodDiagram island={traits.island} supply={traits.supply} />
            </div>
          </>
        )}

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href={
              items[0]
                ? `/configurator?slug=${encodeURIComponent(items[0].slug)}${
                    items[0].base
                      ? `&h=${items[0].base.h}&w=${items[0].base.w}&d=${items[0].base.d}`
                      : ''
                  }`
                : '/configurator'
            }
            className="btn"
          >
            Собрать по своим размерам
          </Link>
          <Link href="/#catalog" className="btn btn-ghost">Весь каталог</Link>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

function ProductView({ slug }: { slug: string }) {
  const p = productBySlug(slug)!;
  const traits = traitsOf(p.family);
  const family = families.find((f) => f.code === p.family);
  const material = defaultMaterialGrade(traits.hydro);
  const c = p.base ? calculate(p.base, traits, p.base, p.price, material) : null;
  const related = productsOf(p.family).filter((x) => x.id !== p.id).slice(0, 3);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    sku: p.article,
    description: (p.short || p.description).slice(0, 500),
    brand: { '@type': 'Brand', name: site.name },
    ...(p.price
      ? {
          offers: {
            '@type': 'Offer',
            price: p.price,
            priceCurrency: 'RUB',
            availability: 'https://schema.org/InStock',
            url: `${site.url}/catalog/${p.slug}`,
          },
        }
      : {}),
  };

  return (
    <section className="band band-shop">
      <div className="wrap">
        <nav className="lbl mb-3 flex flex-wrap gap-2">
          <Link href="/" className="no-underline">Главная</Link><span>/</span>
          <Link href="/#catalog" className="no-underline">Каталог</Link><span>/</span>
          {family && (<><Link href={`/catalog/${family.slug}`} className="no-underline">{family.code}</Link><span>/</span></>)}
          <span>
            {p.type
              ?? (p.base ? `${p.base.h}/${p.base.w}/${p.base.d}` : null)
              ?? (p.article === family?.code ? p.name : p.article)}
          </span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <p className="lbl" style={{ color: 'var(--color-extract)' }}>
              {shortName(p)}{p.base ? ` · ${p.base.h}/${p.base.w}/${p.base.d} мм` : ''}
            </p>
            <h1 className="mt-3">{p.name.replace(/\s*\([^)]*\)\s*$/, '')}</h1>
            <p className="muted mt-5 max-w-[60ch]">{p.short}</p>
            {p.description && <p className="muted mt-4 max-w-[60ch] text-sm">{p.description}</p>}
            {p.features.length > 0 && (
              <ul className="muted mt-4 flex max-w-[60ch] list-disc flex-col gap-1.5 pl-4 text-sm">
                {p.features.map((f) => <li key={f}>{f}</li>)}
              </ul>
            )}

            <div className="mt-8 flex flex-wrap items-baseline gap-4">
              <span className="num text-4xl">{p.price ? rub(p.price) : 'по запросу'}</span>
              {p.price && <span className="badge">цена для эталонного типоразмера</span>}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              {p.base && (
                <Link
                  href={`/contacts?mode=order&slug=${encodeURIComponent(p.slug)}`}
                  className="btn"
                >
                  Заказать
                </Link>
              )}
              {CONFIGURABLE.includes(p.family) ? (
                <>
                  <Link
                    href={`/configurator?slug=${encodeURIComponent(p.slug)}${
                      p.base ? `&h=${p.base.h}&w=${p.base.w}&d=${p.base.d}` : ''
                    }`}
                    className={p.base ? 'btn btn-ghost' : 'btn'}
                  >
                    Открыть в конфигураторе
                  </Link>
                  {!p.base && <Link href="/contacts" className="btn btn-ghost">Запросить расчёт</Link>}
                </>
              ) : (
                <>
                  {!p.base && <Link href="/contacts" className="btn">Запросить расчёт</Link>}
                  <Link href="/normy-mchs" className="btn btn-ghost">Требования МЧС</Link>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {(p.images.length > 0 || schemeOf(p)) && (
              <ProductGallery
                images={p.images}
                alt={p.name}
                schemeSrc={schemeOf(p)}
                schemeLabel="Схема"
              />
            )}
            <div className="scroll-x border" style={{ borderColor: 'var(--hair)', background: 'var(--color-steel-900)' }}>
              <table className="spec">
                <tbody>
                  <tr><th>Артикул</th><td>{p.article}</td></tr>
                  <tr><th>Тип</th><td>{family?.title.toLowerCase()}</td></tr>
                  {p.base && (
                    <tr><th>Габарит H/W/D</th><td>{`${p.base.h} / ${p.base.w} / ${p.base.d} мм`}</td></tr>
                  )}
                  {p.family !== 'АВТ' && (
                    <>
                      <tr>
                        <th>Материал</th>
                        <td>
                          <MaterialsList materials={p.materials} hydro={traits.hydro} />
                        </td>
                      </tr>
                      {HOODS.includes(p.family) && (
                        <tr>
                          <th>Жироуловители</th>
                          <td>{p.greaseTraps ? 'лабиринтные, съёмные' : 'не устанавливаются'}</td>
                        </tr>
                      )}
                      <tr><th>Сварка</th><td>инверторная аргонодуговая</td></tr>
                      <tr><th>Толщина стали</th><td style={{ color: 'var(--color-warn)' }}>уточняется по чертежу</td></tr>
                    </>
                  )}
                  {p.family === 'АВТ' && (
                    <>
                      <tr><th>Назначение</th><td>зонты с гидрозатвором и гидрофильтры</td></tr>
                      <tr><th>Контроль</th><td>давление воды, температура продуктов горения</td></tr>
                      <tr><th>Сигнализация</th><td>световая и звуковая</td></tr>
                      <tr><th>Электроснабжение</th><td style={{ color: 'var(--color-warn)' }}>1-я категория, по проекту объекта</td></tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>

            {c && (
              <div className="scroll-x border" style={{ borderColor: 'var(--hair)', background: 'var(--color-steel-900)' }}>
                <table className="spec">
                  <tbody>
                    <tr><th>Расход воздуха, расчёт</th><td style={{ color: 'var(--color-supply)' }}>{ru(c.airflow)} м³/ч</td></tr>
                    <tr><th>Патрубки</th><td style={{ color: 'var(--color-supply)' }}>{c.ducts.count} × Ø{c.ducts.diameter}</td></tr>
                    <tr><th>Скорость в патрубке</th><td style={{ color: 'var(--color-supply)' }}>{dec(c.ducts.velocity)} м/с</td></tr>
                    <tr><th>Площадь захвата</th><td style={{ color: 'var(--color-supply)' }}>{dec(c.captureArea, 2)} м²</td></tr>
                    <tr><th>Периметр захвата</th><td style={{ color: 'var(--color-supply)' }}>{dec(c.perimeter)} м</td></tr>
                    <tr><th>Площадь стали</th><td style={{ color: 'var(--color-supply)' }}>{dec(c.area)} м²</td></tr>
                    <tr><th>Масса, ориентир</th><td style={{ color: 'var(--color-supply)' }}>{ru(c.mass)} кг</td></tr>
                  </tbody>
                </table>
              </div>
            )}
            {c && (
              <p className="lbl">Синим — расчётные величины конфигуратора, методика сверяется с производством.</p>
            )}
          </div>
        </div>

        {c && p.base && (
          <>
            <div className="head mt-14"><p className="lbl">Чертёж</p><h2>Эталонный типоразмер в трёх проекциях</h2></div>
            <div className="drawing-card">
              <HoodDrawing
                input={{
                  dims: p.base,
                  traits,
                  calc: c,
                  article: p.article,
                  productName: family?.title ?? p.name,
                  material,
                }}
              />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-start">
              <p className="lbl">
                Чертёж строится из тех же параметров, что и 3D-модель. Для сборки изделия по
                собственным габаритам — используйте конфигуратор, спецификация и цена
                пересчитаются.
              </p>
              <ExportButtons
                slug={p.slug}
                dims={p.base}
                material={material}
                className="export-row"
              />
            </div>
          </>
        )}

        {HOODS.includes(p.family) && p.options.length > 0 && (
          <>
            <div className="head mt-14"><p className="lbl">Комплектация</p><h2>Дополнительное оборудование</h2></div>
            <div className="tiles" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}>
              {p.options.map((o) => (
                <div key={o} className="tile">
                  <h3 style={{ fontFamily: 'var(--font-body)', fontWeight: 600, textTransform: 'none' }}>{o}</h3>
                  <span className="lbl mt-auto">надбавка по запросу</span>
                </div>
              ))}
            </div>
          </>
        )}

        {traits.hydro && p.family !== 'АВТ' && (
          <>
            <div className="head mt-14"><p className="lbl">Нормы</p><h2>Требования к этому изделию</h2></div>
            <div className="tiles" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))' }}>
              {[
                ['5.28', 'п. 5.28', 'Удаление продуктов горения через дымоотвод наружу или самостоятельный дымовой канал от этого зонта.'],
                ['5.30', 'п. 5.30', 'Датчики температуры, сигнализаторы 95 % от максимальной температуры и падения давления воды, питание по 1-й категории, сигнал ≥ 85 дБ на 1 м.'],
                ['5.31', 'п. 5.31', 'Гидрозатвор внутри зонта — участка «зонт → отдельный фильтр» не возникает.'],
                ['5.32', 'п. 5.32', 'Воздуховод после изделия до оголовка не ниже EI 45 по ГОСТ Р 53299.'],
              ].map(([id, label, text]) => (
                <div key={id} className="tile">
                  <ClauseTipBadge clauseId={id} label={label} />
                  <p className="muted text-sm">{text}</p>
                </div>
              ))}
            </div>
            <Link href="/normy-mchs" className="btn mt-6">Полный разбор пп. 5.28–5.33</Link>

            <div className="head mt-14">
              <p className="lbl">Выбор решения</p>
              <h2>Гидрозонт или гидрофильтр</h2>
              <p>
                <ClauseRichText text="Оба соответствуют п. 5.30. Разница — в том, сколько аппаратов на линии и есть ли место над очагом." />
              </p>
            </div>
            <HydroChoice />
          </>
        )}

        {p.family === 'АВТ' && (
          <>
            <div className="head mt-14">
              <p className="lbl">Как это работает</p>
              <h2>Три сценария защиты</h2>
              <p>
                Пункт 5.30 требует датчиков температуры и сигнализаторов давления воды. Щит — это
                то, чем требование закрывается физически.
              </p>
            </div>
            <AutomationModes />
            <Link href="/normy-mchs" className="btn mt-6">Разбор требований МЧС</Link>
          </>
        )}

        {related.length > 0 && (
          <>
            <div className="head mt-14"><p className="lbl">Линейка</p><h2>Другие типоразмеры</h2></div>
            <div className="tiles" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}>
              {related.map((r) => (
                <Link key={r.id} href={`/catalog/${r.slug}`} className="tile no-underline">
                  <span className="lbl">{shortName(r)}</span>
                  <h3>{r.base ? `${r.base.h}/${r.base.w}/${r.base.d} мм` : r.name}</h3>
                  <span className="num mt-auto border-t pt-3" style={{ borderColor: 'var(--hair)' }}>
                    {r.price ? rub(r.price) : 'по запросу'}
                  </span>
                </Link>
              ))}
            </div>
          </>
        )}

        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </div>
    </section>
  );
}

/**
 * Список марок: по умолчанию — жирным (304 для гидро, 430 для сухих).
 * Дефолт ставится первым в строке.
 */
function MaterialsList({ materials, hydro }: { materials: string[]; hydro: boolean }) {
  const grade = defaultMaterialGrade(hydro);
  const ordered = [...materials].sort((a, b) => {
    const aDef = a.includes(grade) ? 0 : 1;
    const bDef = b.includes(grade) ? 0 : 1;
    return aDef - bDef;
  });
  return (
    <>
      {ordered.map((m, i) => (
        <span key={m}>
          {i > 0 ? ' · ' : null}
          {m.includes(grade) ? <strong>{m}</strong> : m}
        </span>
      ))}
    </>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-dotted pb-1" style={{ borderColor: 'var(--color-steel-700)' }}>
      <dt className="muted">{k}</dt>
      <dd className="num m-0 font-medium">{v}</dd>
    </div>
  );
}
