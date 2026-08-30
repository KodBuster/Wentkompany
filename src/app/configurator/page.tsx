import type { Metadata } from 'next';
import Link from 'next/link';
import { families, products } from '@/lib/catalog';
import { Configurator, type ConfiguratorModel, type ConfiguratorFamily } from '@/components/configurator-client';

export const metadata: Metadata = {
  title: 'Конфигуратор зонтов',
  description:
    'Параметрический конфигуратор: габариты, расчёт расхода воздуха, подбор патрубков, спецификация ' +
    'и 3D-модель изделия, которая перестраивается под введённые размеры.',
  alternates: { canonical: '/configurator' },
};

/** В клиент уходит только то, что нужно сцене и расчёту — описания и картинки остаются на сервере. */
const CONFIGURABLE = ['ЗВП', 'ЗВО', 'ЗПВП', 'ЗПВО', 'ЗВПГ', 'ЗВОГ'];

export default function ConfiguratorPage() {
  const models: ConfiguratorModel[] = products
    .filter((p) => CONFIGURABLE.includes(p.family) && p.base)
    .map((p) => ({
      slug: p.slug,
      article: p.article,
      family: p.family,
      type: p.type,
      h: p.base!.h,
      w: p.base!.w,
      d: p.base!.d,
      price: p.price,
    }));

  const list: ConfiguratorFamily[] = families
    .filter((f) => CONFIGURABLE.includes(f.code))
    .map((f) => ({
      code: f.code,
      slug: f.slug,
      title: f.title,
      island: f.island,
      supply: f.supply,
      hydro: f.hydro,
    }));

  return (
    <section className="band band-shop" style={{ paddingBlock: '2.5rem' }}>
      <div className="wrap">
        <div className="head" style={{ marginBottom: '1.4rem' }}>
          <p className="lbl">Конфигуратор</p>
          <h1 style={{ fontSize: 'clamp(1.8rem,4vw,3rem)' }}>Соберите изделие по своим размерам</h1>
          <p className="muted">
            Габариты задаёте вы — корпус, жёлоб, кассеты, гидроконтур, патрубки и подвесы
            пересчитываются вместе с ними, как и расход воздуха, спецификация и цена.
          </p>
        </div>

        <Configurator models={models} families={list} />

        <div className="mt-6 flex flex-wrap items-center gap-4">
          <span className="lbl">Если размер нестандартный</span>
          <p className="muted max-w-[46ch] text-sm">
            Цена вне типоразмера считается предварительно, от площади изделия. Точную подтверждаем
            расчётом — пришлите конфигурацию, ответим с окончательной суммой и сроком.
          </p>
          <Link href="/catalog" className="btn btn-ghost">Каталог с ценами</Link>
        </div>
      </div>
    </section>
  );
}
