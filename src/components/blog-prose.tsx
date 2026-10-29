'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ClauseRichText } from '@/components/clause-tip';
import { CLAUSE_TIP } from '@/lib/clause-tips';

type TipState = {
  id: string;
  x: number;
  y: number;
};

/**
 * HTML статьи блога + клики по пунктам СП (data-clause-id) → то же окошко, что на сайте.
 * Внутри карточки ссылки на другие пункты тоже кликабельны (матрёшка).
 */
export function BlogProse({ html }: { html: string }) {
  const rootRef = useRef<HTMLElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<TipState | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      const hit = t?.closest?.('[data-clause-id]') as HTMLElement | null;
      if (!hit || !root.contains(hit)) return;
      e.preventDefault();
      e.stopPropagation();
      const id = hit.getAttribute('data-clause-id');
      if (!id || !CLAUSE_TIP[id]) return;
      setTip((prev) =>
        prev && prev.id === id ? null : { id, x: e.clientX, y: e.clientY },
      );
    };

    root.addEventListener('click', onClick);
    return () => root.removeEventListener('click', onClick);
  }, []);

  useEffect(() => {
    if (!tip) return;
    const onDoc = (e: Event) => {
      const t = e.target as Node | null;
      if (tipRef.current?.contains(t)) return;
      const el = t as HTMLElement | null;
      if (el?.closest?.('[data-clause-id]')) return;
      if (el?.closest?.('.clause-tip')) return;
      if (el?.closest?.('.clause-tip-hit')) return;
      setTip(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setTip(null);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [tip]);

  const data = tip ? CLAUSE_TIP[tip.id] : null;
  const tipW = 300;
  const tipH = 168;
  const gap = 14;
  let left = 0;
  let top = 0;
  let placeAbove = false;
  if (tip && typeof window !== 'undefined') {
    left = tip.x + gap;
    if (left + tipW > window.innerWidth - 12) left = tip.x - tipW - gap;
    placeAbove = window.innerHeight - tip.y < tipH + 28;
    top = placeAbove ? tip.y - gap : tip.y + gap;
  }

  return (
    <>
      <article
        ref={rootRef}
        className="blog-prose"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {tip &&
        data &&
        createPortal(
          <div
            ref={tipRef}
            className={`clause-tip clause-tip--interactive${placeAbove ? ' clause-tip--above' : ''}`}
            style={{ left, top, zIndex: 85 }}
            role="dialog"
            aria-label={`п. ${tip.id}: ${data.title}`}
          >
            <p className="lbl" style={{ color: 'var(--color-extract)' }}>
              п. {tip.id}
            </p>
            <p className="clause-tip__title">{data.title}</p>
            <p className="clause-tip__text">
              <ClauseRichText text={data.text} excludeId={tip.id} />
            </p>
          </div>,
          document.body,
        )}
    </>
  );
}
