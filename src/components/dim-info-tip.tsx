'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Справка по габаритам (Ш × Г × В) — кнопка (i) в углу схемы, текст по клику.
 */
export function DimInfoTip() {
  const hitRef = useRef<HTMLButtonElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: Event) => {
      const t = e.target as Node | null;
      if (hitRef.current?.contains(t)) return;
      if (tipRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const tipW = 400;
  const tipH = 360;
  const gap = 12;

  let left = 0;
  let top = 0;
  let placeAbove = false;
  if (anchor) {
    left = anchor.x - tipW;
    if (left < 12) left = 12;
    if (left + tipW > window.innerWidth - 12) {
      left = Math.max(12, window.innerWidth - tipW - 12);
    }
    placeAbove = window.innerHeight - anchor.y < tipH + 28;
    top = placeAbove ? anchor.y - gap : anchor.y + gap;
  }

  const openAt = (x: number, y: number) => {
    if (open) {
      setOpen(false);
      return;
    }
    setAnchor({ x, y });
    setOpen(true);
  };

  return (
    <>
      <button
        ref={hitRef}
        type="button"
        className="dim-info-tip"
        aria-expanded={open}
        aria-label="Справка по габаритам: высота, вылет (глубина), ширина (длина) — H/D/W"
        onClick={(e) => {
          e.stopPropagation();
          openAt(e.clientX, e.clientY);
        }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <span aria-hidden>i</span>
      </button>
      {open &&
        anchor &&
        createPortal(
          <div
            ref={tipRef}
            className={`clause-tip clause-tip--interactive dim-info-tip__panel${placeAbove ? ' clause-tip--above' : ''}`}
            style={{ left, top }}
            role="dialog"
            aria-label="Справка по габаритам зонта"
          >
            <p className="lbl" style={{ color: 'var(--color-extract)' }}>
              Габариты
            </p>
            <p className="clause-tip__title">Высота · вылет · ширина (H/D/W)</p>
            <p className="clause-tip__text">
              На сайте FortInox, в КП, чертежах и выгрузках габарит всегда пишется в
              порядке <strong>H/D/W</strong>: высота / вылет (глубина) / ширина (она же
              длина по фронту).
            </p>
            <ul className="dim-info-tip__list">
              <li>
                <strong>Высота (H)</strong> — вертикальный размер купола зонта (от низа
                с жироуловителями до верхней плоскости или патрубка). Не путать с высотой
                подвеса над полом или плитой.
              </li>
              <li>
                <strong>Вылет / глубина (D)</strong> — размер перпендикулярно фронту
                (поперечный). У острова перекрывает плиту с обеих сторон, обычно с запасом
                100–200 мм к глубине оборудования.
              </li>
              <li>
                <strong>Ширина / длина (W)</strong> — размер вдоль лицевой стороны плиты
                или линии. В документации часто называют длиной (L или W).
              </li>
            </ul>
          </div>,
          document.body,
        )}
    </>
  );
}
