import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import data from '@/data/neutral.json';
import { CallLink } from '@/components/call-link';
import { site } from '@/lib/site';

/**
 * Нейтральное оборудование.
 *
 * Одна страница-галерея, а не карточки товаров: у этих изделий нет ни
 * артикулов, ни прайса — они делаются по размерам заказчика. Пять «барных
 * станций» с одинаковым описанием, как было на старом сайте, — это дубли,
 * которые ничего не добавляют ни человеку, ни поиску.
 *
 * Раздел намеренно скромный и стоит в стороне от основного пути: сайт
 * читается как производитель вентиляции под требования МЧС, а нейтралка —
 * ответ на вопрос «а это тоже сделаете?».
 */

export const metadata: Metadata = {
  title: 'Нейтральное оборудование из нержавеющей стали на заказ',
  description:
    'Барные станции, шкафы для мусора и урны из нержавеющей стали по размерам заказчика. ' +
    'Изготовление на собственном производстве вместе с вентиляционным оборудованием.',
  alternates: { canonical: '/eshchyo-delaem' },
  openGraph: {
    title: 'Нейтральное оборудование из нержавеющей стали',
    description: 'Барные станции, шкафы для мусора и урны по размерам заказчика.',
  },
};

const groups = data.groups;

export default function NeutralPage() {
  return (
    <>
      <section className="band band-shop">
        <div className="wrap">
          <p className="lbl">Нейтральное оборудование</p>
          <h1 className="mt-5">Ещё делаем<br />из нержавейки</h1>
          <p className="muted mt-6 max-w-[62ch] text-lg">
            Основное производство — вентиляция: зонты, гидрозонты и гидрофильтры. Но тот же цех,
            та же сталь и та же аргонодуговая сварка позволяют делать и нейтральное оборудование
            для кухни и зала — по размерам заказчика.
          </p>
          <p className="hint mt-5 max-w-[62ch]">
            Готовых типоразмеров и прайса здесь нет: каждая вещь считается по вашему чертежу или
            эскизу. Ниже — примеры выполненных работ.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/contacts" className="btn">Запросить расчёт</Link>
            <Link href="/catalog" className="btn btn-ghost">Каталог вентиляции</Link>
          </div>
        </div>
      </section>

      {groups.map((g, i) => (
        <section key={g.slug} id={g.slug} className={`band ${i % 2 === 0 ? 'band-deep' : 'band-shop'}`}>
          <div className="wrap">
            <div className="head">
              <p className="lbl">Примеры работ</p>
              <h2>{g.title}</h2>
              <p className="muted">{g.lead}</p>
            </div>
            {/* auto-fill + верхняя граница ячейки: одна фотография не растягивается
                на всю полосу, как это было бы с auto-fit */}
            <div
              className="grid gap-2"
              style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(230px,300px))', justifyContent: 'start' }}
            >
              {g.photos.map((src) => (
                <div
                  key={src}
                  className="relative aspect-[4/3] overflow-hidden border"
                  style={{ borderColor: 'var(--hair)', background: 'var(--color-steel-850)' }}
                >
                  <Image
                    src={src}
                    alt={`${g.title} из нержавеющей стали — пример исполнения`}
                    fill
                    sizes="(max-width: 900px) 100vw, 320px"
                    style={{ objectFit: 'contain' }}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}

      <section className="band band-paper">
        <div className="wrap">
          <div className="head">
            <p className="lbl">Как считаем</p>
            <h2>Что нужно, чтобы назвать цену</h2>
          </div>
          <ol className="flex max-w-[70ch] list-decimal flex-col gap-3 pl-5">
            <li>Габариты изделия или размеры места, куда оно встаёт.</li>
            <li>Что должно быть внутри: мойка, отсеки, полки, ополаскиватель, колёса.</li>
            <li>Марка стали: AISI 430 как стандарт, AISI 304 — где важна стойкость к влаге и химии.</li>
            <li>Сколько штук и к какому сроку.</li>
          </ol>
          <p className="mt-5 max-w-[70ch] text-sm">
            Эскиза от руки с размерами обычно достаточно. Если изделие едет вместе с вентиляцией
            на один объект — считаем и везём одним комплектом.
          </p>
        </div>
      </section>

      <section className="band band-shop">
        <div className="wrap flex flex-wrap items-center justify-between gap-6">
          <div>
            <h2>Пришлите эскиз — посчитаем</h2>
            <p className="muted mt-3 max-w-[52ch]">
              Фото места и примерные размеры уже позволяют назвать порядок цены.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/contacts" className="btn">Оставить заявку</Link>
            <CallLink className="btn btn-ghost num" label={site.phone} />
          </div>
        </div>
      </section>
    </>
  );
}
