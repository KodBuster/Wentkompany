import Link from 'next/link';
import Image from 'next/image';
import { ClauseRichText } from '@/components/clause-tip';
import { StickyLink } from '@/components/sticky-link';
import {
  homeCatalogFamilies,
  productsOf,
  shortName,
  traitsOf,
  schemeOf,
  familyByCode,
  type FamilyRecord,
  type Product,
} from '@/lib/catalog';
import { calculate, rub, ru } from '@/lib/calc';
import neutral from '@/data/neutral.json';

/** Ссылка на форму заказа эталона с уже выбранным slug. */
export function orderHref(slug: string) {
  return `/contacts?mode=order&slug=${encodeURIComponent(slug)}`;
}

const LINE_CODES = ['ЗВП', 'ЗВО', 'ЗПВП', 'ЗПВО'];
/** Один остров на главной: пристенный + островной с гидрозатвором. */
const HYDRO_CODES = ['ЗВПГ', 'ЗВОГ'] as const;
const SINGLE_CODES = ['ПИР', 'ГФ', 'АВТ'];

function familyBlurb(f: FamilyRecord) {
  if (f.code === 'ГФ') return 'Очистка воздуха · искрогашение';
  if (f.code === 'АВТ') return 'Щит управления · п. 5.30';
  if (f.code === 'ПИР') return 'Пристенное или островное исполнение';
  return (
    (f.island ? 'Островное исполнение' : 'Пристенное исполнение') +
    (f.supply ? ' · с притоком' : '') +
    (f.hydro ? ' · с гидрозатвором' : '')
  );
}

/** Короткий заголовок карточки: для гидро — пристенный / островный. */
function typeTitle(p: Product, f: FamilyRecord) {
  if (f.code === 'ЗВПГ') return 'Пристенный';
  if (f.code === 'ЗВОГ') return 'Островный';
  return p.name.replace(/\s*\([^)]*\)\s*$/, '');
}

function TypeCard({
  p,
  f,
  textOnly = false,
}: {
  p: Product;
  f: FamilyRecord;
  textOnly?: boolean;
}) {
  const traits = traitsOf(f.code);
  const c = p.base ? calculate(p.base, traits, p.base, p.price) : null;
  const img = p.images[0];
  const scheme = schemeOf(p);
  const title = typeTitle(p, f);
  const showVisuals = !textOnly && (!!img || !!scheme);

  return (
    <article className={`home-catalog__type${textOnly ? ' home-catalog__type--text' : ''}`}>
      {showVisuals && (
        <Link href={`/catalog/${p.slug}`} className="home-catalog__visuals no-underline">
          {img && (
            <span className="home-catalog__photo">
              <Image
                src={img}
                alt={title}
                width={640}
                height={400}
                className="home-catalog__img"
                sizes="(max-width: 860px) 100vw, 420px"
              />
            </span>
          )}
          {scheme && (
            <span className="home-catalog__scheme">
              <Image
                src={scheme}
                alt=""
                width={480}
                height={360}
                className="home-catalog__scheme-img"
                sizes="(max-width: 860px) 100vw, 220px"
              />
            </span>
          )}
        </Link>
      )}

      <div className="home-catalog__body">
        <Link href={`/catalog/${p.slug}`} className="no-underline">
          <span className="lbl">{shortName(p)}</span>
          <h4 className="home-catalog__type-title">{title}</h4>
        </Link>
        {p.short && textOnly && (
          <p className="muted text-sm leading-relaxed">
            <ClauseRichText text={p.short} />
          </p>
        )}
        {p.base && (
          <dl className="home-catalog__specs">
            <div>
              <dt>Габарит H/W/D</dt>
              <dd>{`${p.base.h}/${p.base.w}/${p.base.d} мм`}</dd>
            </div>
            {c && (
              <>
                <div>
                  <dt>Расход, расчёт</dt>
                  <dd>{ru(c.airflow)} м³/ч</dd>
                </div>
                <div>
                  <dt>Патрубки</dt>
                  <dd>
                    {c.ducts.count} × Ø{c.ducts.diameter}
                  </dd>
                </div>
              </>
            )}
          </dl>
        )}
        {!p.base && p.features.length > 0 && !textOnly && (
          <ul className="home-catalog__features muted text-sm">
            {p.features.slice(0, 4).map((feat) => (
              <li key={feat}>{feat}</li>
            ))}
          </ul>
        )}
        <div className="home-catalog__cta">
          <span className="num home-catalog__price">
            {p.price ? rub(p.price) : 'по запросу'}
          </span>
          {p.base ? (
            <StickyLink href={orderHref(p.slug)} className="btn home-catalog__btn">
              Заказать
            </StickyLink>
          ) : (
            <StickyLink href={`/catalog/${p.slug}`} className="btn btn-ghost home-catalog__btn">
              Подробнее
            </StickyLink>
          )}
        </div>
      </div>
    </article>
  );
}

/** Карточка позиции нейтралки: фото + название, без цены и без повтора общего текста. */
function NeutralCard({
  slug,
  label,
  title,
  photo,
}: {
  slug: string;
  label: string;
  title: string;
  photo: string;
}) {
  const href = `/eshchyo-delaem/${slug}`;
  return (
    <article className="home-catalog__type home-catalog__type--neutral">
      <Link href={href} className="home-catalog__visuals no-underline">
        <span className="home-catalog__photo">
          <Image
            src={photo}
            alt={`${label} · ${title}`}
            width={480}
            height={360}
            className="home-catalog__img"
            sizes="(max-width: 860px) 100vw, 280px"
          />
        </span>
      </Link>
      <div className="home-catalog__body">
        <Link href={href} className="no-underline">
          <span className="lbl">{label}</span>
          <h4 className="home-catalog__type-title">{title}</h4>
        </Link>
        <div className="home-catalog__cta">
          <Link href={href} className="btn home-catalog__btn">
            Подробнее
          </Link>
        </div>
      </div>
    </article>
  );
}

/**
 * Каталог на главной: линейки → гидрозатвор → ПИР/ГФ/АВТ → нейтралка.
 */
export function HomeCatalog() {
  const lines = homeCatalogFamilies.filter((f) => LINE_CODES.includes(f.code));
  const singles = homeCatalogFamilies.filter((f) => SINGLE_CODES.includes(f.code));

  const hydroItems = HYDRO_CODES.map((code) => {
    const f = familyByCode(code);
    const p = productsOf(code)[0];
    return f && p ? { f, p } : null;
  }).filter(Boolean) as { f: FamilyRecord; p: Product }[];

  const hydroFrom = Math.min(
    ...HYDRO_CODES.map((code) => familyByCode(code)?.priceFrom).filter(
      (n): n is number => typeof n === 'number',
    ),
  );

  return (
    <div className="home-catalog">
      {lines.map((f) => {
        const items = productsOf(f.code);
        return (
          <article key={f.code} className="home-catalog__family">
            <header className="home-catalog__family-head">
              <div>
                <p className="lbl">{f.code}</p>
                <h3 className="home-catalog__family-title">{f.title}</h3>
                <p className="muted text-sm leading-relaxed">{familyBlurb(f)}</p>
              </div>
              <span className="num home-catalog__from">
                {f.priceFrom ? `от ${rub(f.priceFrom)}` : 'по запросу'}
              </span>
            </header>

            <div className="home-catalog__types">
              {items.map((p) => (
                <TypeCard key={p.id} p={p} f={f} />
              ))}
            </div>
          </article>
        );
      })}

      {/* Зонты с гидрозатвором: пристенный + островной, две крупные карточки */}
      {hydroItems.length > 0 && (
        <article className="home-catalog__family home-catalog__family--hydro">
          <header className="home-catalog__family-head">
            <div>
              <p className="lbl">ЗВПГ · ЗВОГ</p>
              <h3 className="home-catalog__family-title">Зонты с гидрозатвором</h3>
              <p className="muted text-sm leading-relaxed">
                <ClauseRichText text="Искрогашение и охлаждение потока внутри зонта · п. 5.30" />
              </p>
            </div>
            <span className="num home-catalog__from">
              {Number.isFinite(hydroFrom) ? `от ${rub(hydroFrom)}` : 'по запросу'}
            </span>
          </header>

          <div className="home-catalog__types home-catalog__types--pair">
            {hydroItems.map(({ f, p }) => (
              <TypeCard key={p.id} p={p} f={f} />
            ))}
          </div>
        </article>
      )}

      {/* ПИР, гидрофильтр, автоматика — одна строка из трёх карточек-типов */}
      <div className="home-catalog__types home-catalog__singles">
        {singles.map((f) => {
          const p = productsOf(f.code)[0];
          if (!p) return null;
          return <TypeCard key={f.code} p={p} f={f} textOnly={f.code === 'АВТ'} />;
        })}
      </div>

      {/* Нейтральное оборудование — отдельные позиции, как на старом сайте */}
      <article className="home-catalog__family home-catalog__family--neutral">
        <header className="home-catalog__family-head">
          <div>
            <p className="lbl">На заказ</p>
            <h3 className="home-catalog__family-title">Нейтральное оборудование</h3>
            <p className="muted text-sm leading-relaxed">
              Изготавливается из нержавеющей стали по размерам заказчика, разных видов.
            </p>
          </div>
          <Link href="/eshchyo-delaem" className="lbl no-underline home-catalog__more">
            Все примеры →
          </Link>
        </header>

        <div className="home-catalog__types home-catalog__types--neutral">
          {neutral.items.map((item) => (
            <NeutralCard
              key={item.slug}
              slug={item.slug}
              label={item.label}
              title={item.title}
              photo={item.photos[0]}
            />
          ))}
        </div>
      </article>
    </div>
  );
}
