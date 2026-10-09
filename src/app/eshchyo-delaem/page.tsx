import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { CallLink } from '@/components/call-link';
import { PageBackdrop } from '@/components/page-backdrop';
import { neutralFullName, neutralItems } from '@/lib/neutral';
import { site } from '@/lib/site';

/**
 * Оглавление нейтралки: карточки позиций.
 * Галерея каждой позиции — на своей странице /eshchyo-delaem/[slug].
 */

export const metadata: Metadata = {
  title: 'Нейтральное оборудование из нержавеющей стали на заказ',
  description:
    'Барные станции (типы 1–5), шкафы для мусора и урны из нержавеющей стали по размерам заказчика. ' +
    'Изготовление на собственном производстве вместе с вентиляционным оборудованием.',
  alternates: { canonical: '/eshchyo-delaem' },
  openGraph: {
    title: 'Нейтральное оборудование из нержавеющей стали',
    description: 'Барные станции, шкафы для мусора и урны по размерам заказчика.',
  },
};

export default function NeutralIndexPage() {
  return (
    <>
      <section className="band band-shop page-hero band--backdrop">
        <PageBackdrop theme="steel" />
        <div className="wrap">
          <div className="backdrop-copy">
            <p className="lbl">Нейтральное оборудование</p>
            <h1>
              Ещё делаем
              <br />
              из нержавейки
            </h1>
            <p className="muted mt-6 max-w-[62ch] text-lg">
              Основное производство — вентиляция: зонты, гидрозонты и гидрофильтры. Но тот же цех,
              та же сталь и та же аргонодуговая сварка позволяют делать и нейтральное оборудование
              для кухни и зала — по размерам заказчика.
            </p>
            <p className="hint mt-5 max-w-[62ch]">
              Готовых типоразмеров и прайса здесь нет. Откройте позицию — там только её фото и
              описание.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/contacts" className="btn">
                Запросить расчёт
              </Link>
              <Link href="/#catalog" className="btn btn-ghost">
                Каталог вентиляции
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="band band-deep">
        <div className="wrap">
          <div className="head">
            <p className="lbl">Позиции</p>
            <h2>Что делаем на заказ</h2>
          </div>
          <div className="home-catalog__types home-catalog__types--neutral">
            {neutralItems.map((item) => (
              <article key={item.slug} className="home-catalog__type home-catalog__type--neutral">
                <Link
                  href={`/eshchyo-delaem/${item.slug}`}
                  className="home-catalog__visuals no-underline"
                >
                  <span className="home-catalog__photo">
                    <Image
                      src={item.photos[0]}
                      alt={neutralFullName(item)}
                      width={640}
                      height={480}
                      className="home-catalog__img"
                      sizes="(max-width: 860px) 100vw, 280px"
                    />
                  </span>
                </Link>
                <div className="home-catalog__body">
                  <Link href={`/eshchyo-delaem/${item.slug}`} className="no-underline">
                    <span className="lbl">{item.label}</span>
                    <h3 className="home-catalog__type-title">{item.title}</h3>
                  </Link>
                  <p className="muted text-sm leading-relaxed">{item.lead}</p>
                  <div className="home-catalog__cta">
                    <Link href={`/eshchyo-delaem/${item.slug}`} className="btn home-catalog__btn">
                      Подробнее
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

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
            <Link href="/contacts" className="btn">
              Оставить заявку
            </Link>
            <CallLink className="btn btn-ghost num" label={site.phone} />
          </div>
        </div>
      </section>
    </>
  );
}
