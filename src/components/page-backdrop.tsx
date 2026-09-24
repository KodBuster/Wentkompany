'use client';

import { useEffect, useRef } from 'react';

/** Тема задника страницы / hero-секции. */
export type BackdropTheme = 'shop' | 'kitchen' | 'home' | 'steel' | 'fire' | 'draft';

const SRC: Record<BackdropTheme, string> = {
  shop: '/backdrops/backdrop-shop.webp',
  kitchen: '/backdrops/backdrop-kitchen.webp',
  home: '/backdrops/backdrop-home.webp',
  steel: '/backdrops/backdrop-steel.webp',
  fire: '/backdrops/backdrop-fire.webp',
  draft: '/backdrops/backdrop-draft.webp',
};

/**
 * Полноэкранный атмосферный задник секции: фото + вуаль + лёгкий параллакс.
 * Не конкурирует с контентом — читаемость текста сохраняется оверлеем.
 */
export function PageBackdrop({
  theme,
  parallax = true,
}: {
  theme: BackdropTheme;
  parallax?: boolean;
}) {
  const layerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!parallax) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const layer = layerRef.current;
    const host = layer?.closest('.band') as HTMLElement | null;
    if (!layer || !host) return;

    let raf = 0;
    let tx = 0;
    let ty = 0;
    let cx = 0;
    let cy = 0;

    const onMove = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return;
      tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
    };
    const onLeave = () => {
      tx = 0;
      ty = 0;
    };
    const tick = () => {
      cx += (tx - cx) * 0.05;
      cy += (ty - cy) * 0.05;
      layer.style.transform = `translate3d(${cx * 12}px, ${cy * 8}px, 0) scale(1.08)`;
      raf = requestAnimationFrame(tick);
    };

    host.addEventListener('pointermove', onMove, { passive: true });
    host.addEventListener('pointerleave', onLeave);
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      host.removeEventListener('pointermove', onMove);
      host.removeEventListener('pointerleave', onLeave);
    };
  }, [parallax]);

  return (
    <div className="page-backdrop" aria-hidden>
      <div
        ref={layerRef}
        className="page-backdrop__photo"
        style={{ backgroundImage: `url(${SRC[theme]})` }}
      />
      <div className={`page-backdrop__veil page-backdrop__veil--${theme}`} />
    </div>
  );
}
