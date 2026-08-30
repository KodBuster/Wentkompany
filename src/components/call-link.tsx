'use client';

import { site } from '@/lib/site';
import { GOALS, track } from '@/lib/analytics';

/** Телефон с целью Метрики. Без счётчика ведёт себя как обычная ссылка. */
export function CallLink({ className, label }: { className?: string; label?: string }) {
  return (
    <a
      href={site.phoneHref}
      className={className}
      onClick={() => track(GOALS.callClick, { page: window.location.pathname })}
    >
      {label ?? site.phone}
    </a>
  );
}
