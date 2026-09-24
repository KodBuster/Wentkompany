'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/** Пункт меню активен на своей странице и на вложенных (например /catalog/…). */
function isActive(pathname: string, href: string) {
  if (pathname === href) return true;
  return pathname.startsWith(`${href}/`);
}

/** Десктопная навигация с подсветкой текущей страницы. */
export function SiteNavLinks({ links }: { links: { href: string; label: string }[] }) {
  const pathname = usePathname();

  return (
    <nav className="ml-auto hidden gap-5 text-sm lg:flex" aria-label="Основная навигация">
      {links.map((l) => {
        const active = isActive(pathname, l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`site-nav-link${active ? ' is-active' : ''}`}
            aria-current={active ? 'page' : undefined}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
