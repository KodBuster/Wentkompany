import Link from 'next/link';
import { site } from '@/lib/site';
import { hoodFamilies } from '@/lib/catalog';
import { CallLink } from '@/components/call-link';

export function SiteFooter() {
  return (
    <footer className="band-deep border-t" style={{ borderColor: 'var(--hair)' }}>
      <div className="wrap py-10">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <span className="font-[family-name:var(--font-display)] text-xl font-bold uppercase">
              WENT<span style={{ color: 'var(--color-extract)' }}>KOMPANY</span>
            </span>
            <p className="muted mt-3 text-sm">{site.description}</p>
          </div>
          <div>
            <h2 className="mb-3 text-sm text-steel-300">Каталог</h2>
            {hoodFamilies.map((f) => (
              <Link key={f.slug} href={`/catalog/${f.slug}`} className="mb-1.5 block text-sm no-underline text-steel-400 hover:text-steel-100">
                {f.title}
              </Link>
            ))}
            <Link href="/catalog/gf" className="mb-1.5 block text-sm no-underline text-steel-400 hover:text-steel-100">
              Гидрофильтры
            </Link>
          </div>
          <div>
            <h2 className="mb-3 text-sm text-steel-300">Решения</h2>
            <Link href="/dlya-obshchepita" className="mb-1.5 block text-sm no-underline text-steel-400 hover:text-steel-100">
              Для общепита
            </Link>
            <Link href="/chastnyy-dom" className="mb-1.5 block text-sm no-underline text-steel-400 hover:text-steel-100">
              Для частного дома
            </Link>
            <Link href="/nestandartnyy-zont" className="mb-1.5 block text-sm no-underline text-steel-400 hover:text-steel-100">
              Зонт по вашему чертежу
            </Link>
            <Link href="/eshchyo-delaem" className="mb-1.5 block text-sm no-underline text-steel-400 hover:text-steel-100">
              Нейтральное оборудование
            </Link>
            <Link href="/normy-mchs" className="mb-1.5 block text-sm no-underline text-steel-400 hover:text-steel-100">
              Требования СП 7.13130 · Изм. № 3
            </Link>
            <Link href="/configurator" className="mb-1.5 block text-sm no-underline text-steel-400 hover:text-steel-100">
              Конфигуратор и выгрузка
            </Link>
            <Link href="/catalog" className="mb-1.5 block text-sm no-underline text-steel-400 hover:text-steel-100">
              Типоразмеры и цены
            </Link>
          </div>
          <div>
            <h2 className="mb-3 text-sm text-steel-300">Контакты</h2>
            <CallLink className="mb-1.5 block text-sm no-underline text-steel-400 hover:text-steel-100" />
            <a href={`mailto:${site.email}`} className="mb-1.5 block text-sm no-underline text-steel-400 hover:text-steel-100">{site.email}</a>
            <p className="mb-1.5 text-sm text-steel-400">{site.address}</p>
            <p className="text-sm text-steel-400">{site.hours}</p>
          </div>
        </div>
        <div
          className="lbl mt-8 flex flex-wrap justify-between gap-2 border-t pt-5"
          style={{ borderColor: 'var(--hair)' }}
        >
          <span>© 2026 {site.name}</span>
          <span className="flex gap-5">
            <Link href="/privacy" className="no-underline">Политика конфиденциальности</Link>
            <span>152-ФЗ</span>
          </span>
        </div>
      </div>
    </footer>
  );
}
