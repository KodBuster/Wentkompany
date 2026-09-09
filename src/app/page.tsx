import Link from 'next/link';
import { HoodDiagram } from '@/components/hood-diagram';
import { hoodFamilies, complianceProducts, priceFrom } from '@/lib/catalog';
import { rub } from '@/lib/calc';
import { norms } from '@/lib/site';

const TRACKS = [
  {
    tag: 'Инженер · проектировщик · монтажник',
    title: 'Данные и файлы',
    text: 'Конфигуратор с габаритами до миллиметра, расчётом расхода и подбором патрубков.',
    items: ['2D-чертёж с размерными цепями', 'PDF-спецификация в тендер', 'DXF, далее IFC и Revit'],
    href: '/configurator',
    cta: 'Открыть конфигуратор',
  },
  {
    tag: 'Ресторан · столовая · тёмная кухня',
    title: 'Срок, цена, приёмка',
    text: 'Подбор по типу оборудования на линии и комплект под требования МЧС для открытого огня.',
    items: ['Цена по типоразмеру сразу', 'Схема тракта по пп. 5.28–5.33', 'Монтаж и пусконаладка'],
    href: '/dlya-obshchepita',
    cta: 'Решения для общепита',
  },
  {
    tag: 'Частный дом · мангальная зона',
    title: 'Чтобы не пахло в доме',
    text: 'Зонт над мангалом, хоспером или летней кухней — по месту, под интерьер.',
    items: ['Замер и изготовление по размеру', 'Гидрозатвор вместо кассет', 'Тихий режим работы'],
    href: '/chastnyy-dom',
    cta: 'Зонт для дома',
  },
];

export default function HomePage() {
  return (
    <>
      <section className="band band-shop">
        <div className="wrap">
          <p className="lbl">Собственное производство · нержавеющая сталь AISI 430 / 304</p>
          <h1 className="mt-5">
            Жир остаётся<br />в зонте.<br />
            <span style={{ color: 'var(--color-extract)' }}>Канал — чистый.</span>
          </h1>
          <p className="muted mt-6 max-w-[54ch] text-lg">
            Гидрозонты, гидрофильтры и вытяжные зонты для профессиональных кухонь и мангальных зон.
            С {norms.inForce} удаление продуктов горения от мангалов и тандыров регулируется прямо —
            производим то, чем это требование закрывается.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/configurator" className="btn">Собрать зонт в конфигураторе</Link>
            <Link href="/normy-mchs" className="btn btn-ghost">Требования МЧС с 2025 года</Link>
          </div>
        </div>
      </section>

      <section className="band band-paper">
        <div className="wrap">
          <div className="head">
            <p className="lbl">С чего начнём</p>
            <h2>Выберите, кто вы — дальше сайт говорит на вашем языке</h2>
            <p>
              Проектировщику нужны цифры и файлы, ресторану — срок и приёмка, частному дому — чтобы
              в гостиной не пахло углём.
            </p>
          </div>
          <div className="tiles" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))' }}>
            {TRACKS.map((t) => (
              <article key={t.title} className="tile">
                <span className="tag">
                  {t.tag}
                </span>
                <h3>{t.title}</h3>
                <p className="muted text-sm">{t.text}</p>
                <ul className="muted list-disc pl-4 text-sm">
                  {t.items.map((i) => <li key={i}>{i}</li>)}
                </ul>
                <Link
                  href={t.href}
                  className="tile-cta"
                >
                  {t.cta} →
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="band band-deep">
        <div className="wrap">
          <div className="head">
            <p className="lbl">Открытый огонь</p>
            <h2>Мангал и тандыр — с 1 июля 2025 по новым правилам</h2>
            <p className="muted">
              {norms.change} к {norms.sp} ({norms.order}) дополнило раздел 5 пунктами {norms.clauses}.
              Гидрофильтр, зонт с гидрозатвором и щит автоматики — ровно те позиции, которыми закрывается требование.
            </p>
          </div>
          <div className="tiles" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))' }}>
            {complianceProducts.map((p) => (
              <Link key={p.id} href={`/catalog/${p.slug}`} className="tile no-underline">
                <span className="lbl">{p.article}</span>
                <h3>{p.name.replace(/\s*\([^)]*\)\s*$/, '')}</h3>
                <span className="num mt-auto border-t pt-3 text-lg" style={{ borderColor: 'var(--hair)' }}>
                  {p.price ? `от ${rub(p.price)}` : 'по запросу'}
                </span>
              </Link>
            ))}
          </div>
          <Link href="/normy-mchs" className="btn mt-8">Разобрать требования по пунктам</Link>
        </div>
      </section>

      <section className="band band-paper">
        <div className="wrap">
          <div className="head">
            <p className="lbl">Каталог</p>
            <h2>Линейки зонтов для профессиональной кухни</h2>
            <p>Базовые цены за эталонный типоразмер с жироуловителями.</p>
          </div>
          <div className="tiles" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))' }}>
            {hoodFamilies.map((f) => (
              <Link key={f.slug} href={`/catalog/${f.slug}`} className="tile no-underline">
                <span className="lbl">{f.code}</span>
                <h3>{f.title}</h3>
                <p className="muted text-sm">
                  {f.island ? 'Островное исполнение' : 'Пристенное исполнение'}
                  {f.supply ? ' · с притоком' : ''}
                  {f.hydro ? ' · с гидрозатвором' : ''}
                </p>
                <span
                  className="num mt-auto border-t pt-3 text-lg"
                  style={{ borderColor: 'var(--hair-l)', color: 'var(--color-steel-900)' }}
                >
                  {f.priceFrom ? `от ${rub(f.priceFrom)}` : 'по запросу'}
                  <span className="lbl ml-2">{f.count} типоразмера</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="band band-shop">
        <div className="wrap">
          <div className="head">
            <p className="lbl">Экономика</p>
            <h2>Что даёт эффективная фильтрация, кроме приёмки</h2>
          </div>
          <div className="tiles" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))' }}>
            {[
              ['12 → 2', 'раза в год — столько чисток воздуховодов остаётся после внедрения эффективной фильтрации'],
              ['+15 %', 'КПД вентиляции горячего цеха по результатам того же исследования'],
              ['0', 'переделок на приёмке, если тракт собран по пп. 5.28–5.33 сразу'],
              ['AISI 304', 'для влажных зон и гидроконтура, аргонодуговая сварка'],
            ].map(([n, t]) => (
              <div key={n} className="tile">
                <b className="num text-3xl leading-none">{n}</b>
                <span className="muted text-sm">{t}</span>
              </div>
            ))}
          </div>
          <p className="lbl mt-4">
            Источник по первым двум показателям:{' '}
            <a
              href="https://cyberleninka.ru/article/n/optimizatsiya-sistem-ventilyatsii-goryachih-tsehov-predpriyatiy-obschestvennogo-pitaniya"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--color-supply)' }}
            >
              «Оптимизация систем вентиляции горячих цехов предприятий общественного питания», КиберЛенинка
            </a>
          </p>
        </div>
      </section>

      <section className="band band-shop">
        <div className="wrap">
          <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="lbl">Производство по чертежам заказчика</p>
              <h2 className="mt-4">Зонт под место,<br />а не место под зонт</h2>
              <p className="muted mt-5 max-w-[52ch]">
                Ниша нетиповой ширины, скошенная стена, колонна посреди зоны, вывод тракта вбок.
                Изделие варится под конкретное место, а чертёж вы согласуете до запуска
                в производство.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/nestandartnyy-zont" className="btn">Зонт по вашему чертежу</Link>
                <Link href="/configurator" className="btn btn-ghost">Посчитать габарит</Link>
              </div>
            </div>
            <div
              className="border p-5"
              style={{ borderColor: 'var(--hair)', background: 'var(--color-steel-900)' }}
            >
              <HoodDiagram />
            </div>
          </div>
        </div>
      </section>

      <section className="band band-deep">
        <div className="wrap flex flex-wrap items-center justify-between gap-6">
          <div className="max-w-[52ch]">
            <h2>Соберите изделие — пришлём чертёж и цену</h2>
            <p className="muted mt-3">
              Конфигурация прикрепляется к заявке автоматически: повторять размеры не нужно.
              Гидрофильтр от {rub(priceFrom('ГФ') ?? 120000)}, зонт с гидрозатвором от {rub(priceFrom('ЗВПГ') ?? 45000)}.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/configurator" className="btn">Открыть конфигуратор</Link>
            <Link href="/contacts" className="btn btn-ghost">Задать вопрос</Link>
          </div>
        </div>
      </section>
    </>
  );
}
