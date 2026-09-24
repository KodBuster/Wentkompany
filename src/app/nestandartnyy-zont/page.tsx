import type { Metadata } from 'next';
import Link from 'next/link';
import { LeadForm } from '@/components/lead-form';
import { CallLink } from '@/components/call-link';
import { HoodDiagram } from '@/components/hood-diagram';
import { PageBackdrop } from '@/components/page-backdrop';
import { priceFrom } from '@/lib/catalog';
import { rub } from '@/lib/calc';
import { site } from '@/lib/site';

/**
 * Зонт по чертежу заказчика.
 *
 * Ключевое отличие от конкурентов, торгующих складскими типоразмерами:
 * производство варит изделие под конкретное место. Страница отвечает на
 * три вопроса, которые задаёт человек с нестандартной задачей: сделаете ли
 * вообще, что от меня нужно и сколько это будет стоить.
 *
 * Сроков и «любых форм» здесь нет: то, что написано цифрами, спросят при
 * первом же разговоре. Границы возможного заданы честно — что делается
 * серийно, что по чертежу, а что требует отдельного обсуждения.
 */

export const metadata: Metadata = {
  title: 'Нестандартный вытяжной зонт по чертежу и эскизу заказчика',
  description:
    'Изготовление вытяжных зонтов нестандартных форм и размеров по чертежам и эскизам заказчика. ' +
    'Нержавеющая сталь AISI 430 и 304, расчёт расхода воздуха, чертёж на согласование до запуска.',
  alternates: { canonical: '/nestandartnyy-zont' },
  openGraph: {
    title: 'Нестандартный вытяжной зонт по чертежу заказчика',
    description: 'Форма и габариты под ваше место. Чертёж на согласование до запуска в производство.',
  },
};

/** Что реально делается — по возрастанию сложности согласования. */
const CASES = [
  {
    tag: 'Габарит вне ряда',
    title: 'Размер, которого нет в прайсе',
    text:
      'Ширина 2 340 мм под нишу, глубина 1 450 мм над островом, высота под низкий потолок. ' +
      'Считается сразу в конфигураторе: расход воздуха, число и диаметр патрубков, чертёж и ' +
      'предварительная цена.',
    action: { href: '/configurator', label: 'Собрать в конфигураторе' },
  },
  {
    tag: 'Форма под место',
    title: 'Не прямоугольник',
    text:
      'Г-образный зонт по углу, трапеция под скошенную стену, купол над круглым очагом, ' +
      'зонт с вырезом под колонну или балку. Здесь нужен ваш чертёж или эскиз с размерами узла.',
    action: { href: '#zayavka', label: 'Прислать эскиз' },
  },
  {
    tag: 'Узлы и обвязка',
    title: 'Особое подключение',
    text:
      'Вывод патрубка вбок или назад, несколько врезок в заданных точках, встроенная подсветка, ' +
      'закладные под скрытый подвес, кран слива с нужной стороны, исполнение под отделку короба.',
    action: { href: '#zayavka', label: 'Обсудить узел' },
  },
  {
    tag: 'Открытый огонь',
    title: 'Нестандарт с гидрозатвором',
    text:
      'Мангал или тандыр в нетиповом месте: гидроконтур, ванночка и слив закладываются в изделие ' +
      'нестандартной формы. Требования пп. 5.28–5.33 при этом остаются те же.',
    action: { href: '/normy-mchs', label: 'Требования МЧС' },
  },
];

/** Что нужно от заказчика, чтобы назвать цену. */
const NEEDED = [
  {
    n: '01',
    title: 'Размеры места',
    text: 'Ширина, глубина, высота ниши или зоны над оборудованием. Эскиз от руки с размерами подходит.',
  },
  {
    n: '02',
    title: 'Что стоит под зонтом',
    text: 'Плита, фритюр, пароконвектомат, мангал, тандыр, хоспер. От этого зависят расход воздуха и нужен ли гидрозатвор.',
  },
  {
    n: '03',
    title: 'Куда уходит тракт',
    text: 'Стена, потолок, существующий короб; высота потолка и есть ли готовый проект вентиляции.',
  },
  {
    n: '04',
    title: 'Сталь и отделка',
    text: 'AISI 430 как стандарт, AISI 304 — где важна стойкость к влаге и химии. Если зонт на виду, скажите об этом.',
  },
];

const FAQ = [
  {
    q: 'Что считается нестандартом?',
    a: 'Всё, что выходит за типоразмер из прайса: другой габарит, непрямоугольная форма, вырез под колонну, нестандартное расположение врезок, особый подвес или исполнение под отделку. Изменение только габарита при обычной форме считается прямо в конфигураторе и нестандартом в тяжёлом смысле не является.',
  },
  {
    q: 'Нужен ли готовый чертёж?',
    a: 'Нет. Достаточно эскиза от руки с размерами или фотографии места с рулеткой в кадре. Чертёж делаем мы и присылаем на согласование до запуска в производство — вы видите изделие до того, как его начали варить.',
  },
  {
    q: 'Как считается цена вне типоразмера?',
    a: `Предварительная оценка считается от площади изделия относительно базового типоразмера и всегда помечается как предварительная — её видно сразу в конфигураторе. Окончательную цену подтверждаем расчётом после того, как согласован чертёж: на неё влияют форма, число врезок, марка стали и опции. Для ориентира: пристенный зонт начинается от ${rub(priceFrom('ЗВП') ?? 0)}, с гидрозатвором — от ${rub(priceFrom('ЗВПГ') ?? 0)}.`,
  },
  {
    q: 'Работаете по чертежам проектной организации?',
    a: 'Да. Принимаем PDF и DXF, отдаём обратно чертёж изделия в PDF и DXF, а модель — в IFC, чтобы проектировщик вставил её в общую модель. Если в проекте заложен другой производитель, наше изделие встаёт по тем же присоединительным размерам.',
  },
  {
    q: 'Есть ли ограничения по размеру?',
    a: 'Ограничения задают не столько производство, сколько транспорт и монтаж: изделие должно проехать в помещение и подняться на место. Крупные зонты делаются секциями со стыковкой по месту. Конкретный предел обсуждаем на замере.',
  },
  {
    q: 'Сколько занимает изготовление?',
    a: 'Срок зависит от загрузки производства и сложности изделия, поэтому называем его при расчёте, а не заранее. Согласование чертежа обычно занимает больше времени, чем сама сварка, — чем точнее исходные данные, тем быстрее.',
  },
];

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
};

export default function CustomHoodPage() {
  return (
    <>
      <section className="band band-shop page-hero band--backdrop">
        <PageBackdrop theme="shop" />
        <div className="wrap">
          <div className="backdrop-copy">
            <p className="lbl">Производство по чертежам и эскизам заказчика</p>
            <h1>
              Зонт под место,<br />
              <span style={{ color: 'var(--color-extract)' }}>а не место под зонт</span>
            </h1>
          <p className="muted mt-6 max-w-[58ch] text-lg">
            Ниша нетиповой ширины, скошенная стена, колонна посреди зоны, вывод тракта вбок —
            всё это делается. Изделие варится под конкретное место, а чертёж вы согласуете
            до запуска в производство.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="#zayavka" className="btn">Прислать чертёж или эскиз</Link>
            <Link href="/configurator" className="btn btn-ghost">Сначала посчитать габарит</Link>
          </div>
          <p className="hint mt-5 max-w-[58ch]">
            Если меняется только размер, а форма обычная — считайте сразу в конфигураторе:
            расход, патрубки, чертёж и предварительная цена появятся на экране.
          </p>
          </div>
        </div>
      </section>

      <section className="band band-deep">
        <div className="wrap">
          <div className="head">
            <p className="lbl">Что делаем</p>
            <h2>Четыре типа нестандарта</h2>
            <p className="muted">
              По возрастанию сложности согласования: от габарита вне ряда до изделия,
              нарисованного с нуля под ваш узел.
            </p>
          </div>
          <div className="tiles" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))' }}>
            {CASES.map((c) => (
              <article key={c.title} className="tile">
                <span className="tag">{c.tag}</span>
                <h3 style={{ textTransform: 'none', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '1.05rem' }}>
                  {c.title}
                </h3>
                <p className="muted text-sm">{c.text}</p>
                <Link href={c.action.href} className="tile-cta">{c.action.label} →</Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="band band-shop">
        <div className="wrap">
          <div className="head">
            <p className="lbl">Терминология</p>
            <h2>Как называются узлы</h2>
            <p className="muted">
              Чтобы в переписке говорить об одном и том же: вылет, врезка, ванночка,
              лабиринтные фильтры. На вашем чертеже достаточно указать эти же величины.
            </p>
          </div>
          <div className="border p-6" style={{ borderColor: 'var(--hair)', background: 'var(--color-steel-900)' }}>
            <HoodDiagram />
          </div>
        </div>
      </section>

      <section className="band band-deep">
        <div className="wrap">
          <div className="head">
            <p className="lbl">Что нужно от вас</p>
            <h2>Четыре вещи, чтобы назвать цену</h2>
          </div>
          <div className="tiles" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))' }}>
            {NEEDED.map((s) => (
              <article key={s.n} className="tile">
                <span className="num text-2xl" style={{ color: 'var(--color-steel-500)' }}>{s.n}</span>
                <h3 style={{ textTransform: 'none', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '1.02rem' }}>
                  {s.title}
                </h3>
                <p className="muted text-sm">{s.text}</p>
              </article>
            ))}
          </div>
          <p className="hint mt-5 max-w-[76ch]">
            Готового чертежа не требуется: эскиза от руки с размерами или фотографии места
            с рулеткой в кадре достаточно, чтобы назвать порядок цены.
          </p>
        </div>
      </section>

      <section className="band band-shop" id="zayavka">
        <div className="wrap">
          <div className="grid gap-10 lg:grid-cols-[1fr_minmax(340px,420px)]">
            <div>
              <div className="head">
                <p className="lbl">Заявка</p>
                <h2>Пришлите чертёж или эскиз</h2>
                <p className="muted">
                  Принимаем фото, PDF и DXF до 10 МБ. Файл уходит менеджеру вместе с заявкой
                  и на сервере не сохраняется.
                </p>
              </div>
              <ul className="muted flex max-w-[52ch] list-disc flex-col gap-2 pl-4 text-sm">
                <li>Отвечаем в течение рабочего дня, при срочности — быстрее по телефону.</li>
                <li>Чертёж изделия присылаем на согласование до запуска в производство.</li>
                <li>Для проекта отдаём PDF и DXF, модель — в IFC.</li>
              </ul>
              <div className="mt-8 flex flex-wrap gap-3">
                <CallLink className="btn btn-ghost num" label={site.phone} />
                <a href={`mailto:${site.email}`} className="btn btn-ghost">{site.email}</a>
              </div>
            </div>
            <LeadForm configuration="Нестандартное изделие по чертежу заказчика" />
          </div>
        </div>
      </section>

      <section className="band band-paper">
        <div className="wrap">
          <div className="head">
            <p className="lbl">Вопросы</p>
            <h2>Что спрашивают про нестандарт</h2>
          </div>
          <div className="flex flex-col gap-4">
            {FAQ.map((f) => (
              <details key={f.q} className="border p-5" style={{ borderColor: 'rgba(0,0,0,.14)' }}>
                <summary className="cursor-pointer text-base font-semibold">{f.q}</summary>
                <p className="mt-3 text-sm leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
    </>
  );
}
