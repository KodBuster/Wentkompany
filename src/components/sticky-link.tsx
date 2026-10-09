'use client';

import Link from 'next/link';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';

function useFinePointer() {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
    const sync = () => setOk(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);
  return ok;
}

/**
 * Внутренняя ссылка с «липким магнитом» к курсору (как у кнопок мессенджеров).
 */
export function StickyLink({
  href,
  className = '',
  children,
  strength = 0.42,
  maxPull = 12,
}: {
  href: string;
  className?: string;
  children: ReactNode;
  strength?: number;
  maxPull?: number;
}) {
  const ref = useRef<HTMLAnchorElement>(null);
  const fine = useFinePointer();
  const reduced = useRef(false);

  useEffect(() => {
    reduced.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  const reset = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty('--sticky-x', '0px');
    el.style.setProperty('--sticky-y', '0px');
    el.style.removeProperty('--sticky-scale');
  }, []);

  const onMove = useCallback(
    (e: ReactPointerEvent) => {
      if (!fine || reduced.current) return;
      if (e.pointerType !== 'mouse') return;
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.hypot(dx, dy) || 1;
      const pull = Math.min(maxPull, dist * strength);
      el.style.setProperty('--sticky-x', `${((dx / dist) * pull).toFixed(2)}px`);
      el.style.setProperty('--sticky-y', `${((dy / dist) * pull).toFixed(2)}px`);
      el.style.setProperty('--sticky-scale', '1.05');
    },
    [fine, maxPull, strength],
  );

  return (
    <Link
      ref={ref}
      href={href}
      className={`sticky-magnet ${className}`.trim()}
      onPointerMove={onMove}
      onPointerLeave={reset}
      onBlur={reset}
    >
      {children}
    </Link>
  );
}
