'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Подсветка карточки пункта СП при переходе по якорю (#clause-5.28 и т.п.).
 * Короткая «вспышка», чтобы было ясно, какой прямоугольник имеется в виду.
 */
export function ClauseAnchorFlash() {
  const pathname = usePathname();

  useEffect(() => {
    let clearTimer = 0;

    const flash = () => {
      const id = decodeURIComponent(window.location.hash.replace(/^#/, ''));
      if (!id.startsWith('clause-')) return;
      const el = document.getElementById(id);
      if (!el) return;

      el.classList.remove('is-flash');
      // перезапуск анимации при повторном клике на тот же якорь
      void el.offsetWidth;
      el.classList.add('is-flash');
      window.clearTimeout(clearTimer);
      clearTimer = window.setTimeout(() => el.classList.remove('is-flash'), 1800);
    };

    // после перехода с другой страницы якорь может примениться чуть позже отрисовки
    const start = window.setTimeout(flash, 40);
    window.addEventListener('hashchange', flash);
    return () => {
      window.clearTimeout(start);
      window.clearTimeout(clearTimer);
      window.removeEventListener('hashchange', flash);
    };
  }, [pathname]);

  return null;
}
