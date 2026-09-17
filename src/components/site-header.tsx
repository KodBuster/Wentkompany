import Link from 'next/link';
import { CallLink } from '@/components/call-link';
import { MobileNav } from '@/components/mobile-nav';

const links = [
  { href: '/normy-mchs', label: 'Нормы МЧС' },
  { href: '/dlya-obshchepita', label: 'Общепит' },
  { href: '/chastnyy-dom', label: 'Частный дом' },
  { href: '/catalog', label: 'Каталог' },
  { href: '/nestandartnyy-zont', label: 'Нестандарт' },
  { href: '/configurator', label: 'Конфигуратор' },
  { href: '/contacts', label: 'Контакты' },
];

export function SiteHeader() {
  return (
    <header
      className="sticky top-0 z-30 border-b backdrop-blur-md"
      style={{ background: 'rgba(245,240,234,.92)', borderColor: 'var(--hair)' }}
    >
      <div className="wrap flex min-h-[4.25rem] items-center gap-5">
        <Link
          href="/"
          className="font-[family-name:var(--font-display)] text-xl font-bold uppercase whitespace-nowrap no-underline tracking-wide transition-opacity duration-200 hover:opacity-90"
        >
          WENT<span style={{ color: 'var(--color-extract)' }}>KOMPANY</span>
        </Link>
        <nav className="ml-auto hidden gap-5 text-sm lg:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="site-nav-link">
              {l.label}
            </Link>
          ))}
        </nav>
        <CallLink className="num hidden text-sm no-underline text-steel-300 transition-colors duration-200 hover:text-steel-100 sm:block" />
        <MobileNav links={links} />
        <Link href="/configurator" className="btn hidden sm:inline-flex">
          Собрать зонт
        </Link>
      </div>
    </header>
  );
}
