import type { Metadata } from 'next';
import Link from 'next/link';
import { families, products, generatedAt } from '@/lib/catalog';
import { rub } from '@/lib/calc';

export const metadata: Metadata = {
  title: 'Каталог зонтов, гидрофильтров и автоматики',
  description:
    'Вытяжные и приточно-вытяжные зонты ЗВП, ЗВО, ЗПВП, ЗПВО, зонты с гидрозатвором ЗВПГ и ЗВОГ, ' +
    'гидрофильтры и щит автоматики. Типоразмеры и цены производителя.',
  alternates: { canonical: '/catalog' },
};

export default function CatalogPage() {
  return (
    <section className="band band-shop">
      <div className="wrap">
        <div className="head">
          <p className="lbl">Каталог · {products.length} позиций</p>
          <h1>Изделия и типоразмеры</h1>
          <p className="muted">
            Цены указаны за эталонный типоразмер в формате «высота / ширина / глубина» с жироуловителями.
            Изготовление по размерам объекта — расчётом производства.
          </p>
        </div>

        <div className="tiles" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))' }}>
          {families.map((f) => (
            <Link key={f.slug} href={`/catalog/${f.slug}`} className="tile no-underline">
              <span className="lbl">{f.code}</span>
              <h3>{f.title}</h3>
              <p className="muted text-sm">
                {f.island ? 'Островное' : 'Пристенное'} исполнение
                {f.supply ? ' · с притоком' : ''}
                {f.hydro ? ' · гидроконтур' : ''}
              </p>
              <span className="num mt-auto border-t pt-3 text-lg" style={{ borderColor: 'var(--hair)' }}>
                {f.priceFrom ? `от ${rub(f.priceFrom)}` : 'по запросу'}
                <span className="lbl ml-2">{f.count} шт</span>
              </span>
            </Link>
          ))}
        </div>

        <div className="head mt-14">
          <p className="lbl">Прайс</p>
          <h2>Все позиции с ценой</h2>
        </div>
        <div className="scroll-x border" style={{ borderColor: 'var(--hair)' }}>
          <table className="spec" style={{ minWidth: 720 }}>
            <thead>
              <tr>
                <th style={{ width: '32%' }}>Изделие</th>
                <th>Артикул</th>
                <th>Габарит H/W/D, мм</th>
                <th>Жироуловители</th>
                <th style={{ textAlign: 'right' }}>Цена</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td style={{ fontFamily: 'var(--font-body)' }}>
                    <Link href={`/catalog/${p.slug}`} className="no-underline hover:underline">
                      {p.name.replace(/\s*\([^)]*\)\s*$/, '')}
                    </Link>
                  </td>
                  <td>{p.article}</td>
                  <td>{p.base ? `${p.base.h}/${p.base.w}/${p.base.d}` : '—'}</td>
                  <td>{p.greaseTraps ? 'да' : 'нет'}</td>
                  <td style={{ textAlign: 'right' }}>{p.price ? rub(p.price) : 'по запросу'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="lbl mt-4">
          Данные каталога — выгрузка от {generatedAt}. Стоимость носит информационный характер
          и не является публичной офертой.
        </p>
      </div>
    </section>
  );
}
