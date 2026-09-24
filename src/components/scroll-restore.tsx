'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

const keyFor = (path: string) => `wk-scroll:${path}`;

/** Мгновенный скролл — без CSS scroll-behavior: smooth на html. */
function jumpTo(y: number) {
  const root = document.documentElement;
  const prev = root.style.scrollBehavior;
  root.style.scrollBehavior = 'auto';
  window.scrollTo({ top: y, left: 0, behavior: 'auto' });
  root.style.scrollBehavior = prev;
}

/**
 * Скролл при «Назад» после ухода в каталог (и др. страницы без якоря).
 * Позицию пишем в sessionStorage в момент клика по внутренней ссылке —
 * до того, как Next обнулит window.scrollY. Штатный scrollRestoration не трогаем.
 */
export function ScrollRestore() {
  const pathname = usePathname();
  const pendingPop = useRef(false);

  useEffect(() => {
    const onPopState = () => {
      pendingPop.current = true;
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    const onClickCapture = (e: MouseEvent) => {
      if (e.defaultPrevented) return;
      if (e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const a = (e.target as Element | null)?.closest?.('a[href]');
      if (!a) return;
      if (a.hasAttribute('download')) return;
      if (a.getAttribute('target') === '_blank') return;

      const href = a.getAttribute('href');
      if (!href || href.startsWith('mailto:') || href.startsWith('tel:')) return;

      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      // тот же путь + только якорь — страница не меняется, скролл сам на месте
      if (
        url.pathname === window.location.pathname &&
        url.search === window.location.search
      ) {
        return;
      }

      sessionStorage.setItem(keyFor(window.location.pathname), String(window.scrollY));
    };

    document.addEventListener('click', onClickCapture, true);
    return () => document.removeEventListener('click', onClickCapture, true);
  }, []);

  useEffect(() => {
    if (!pendingPop.current) return;

    const raw = sessionStorage.getItem(keyFor(pathname));
    if (raw == null) {
      pendingPop.current = false;
      return;
    }

    const y = Number(raw);
    if (!Number.isFinite(y)) {
      pendingPop.current = false;
      return;
    }

    // Сразу и ещё раз после кадра — на случай, если Next успел обнулить скролл
    jumpTo(y);
    const raf = requestAnimationFrame(() => jumpTo(y));
    const t = window.setTimeout(() => {
      jumpTo(y);
      pendingPop.current = false;
    }, 50);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(t);
    };
  }, [pathname]);

  return null;
}
