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
        aria-label="Справка по габаритам: ширина, глубина (вылет), высота"
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
            <p className="clause-tip__title">Ширина · глубина · высота</p>
            <p className="clause-tip__text">
              В технической документации и чертежах эти параметры обычно указываются
              в последовательности длина × ширина × высота (Д×Ш×В) или ширина × глубина ×
              высота (Ш×Г×В).
            </p>
            <ul className="dim-info-tip__list">
              <li>
                <strong>Ширина (по фронту / длине плиты)</strong> — размер зонта вдоль
                лицевой (длинной) стороны варочной поверхности или теплового оборудования,
                которое он накрывает. Часто производители называют этот размер длиной
                (обозначается как L или W).
              </li>
              <li>
                <strong>Глубина (вылет)</strong> — размер зонта от одного края до другого
                перпендикулярно фронтальной части (поперечный размер). Островной зонт
                подвешивается по центру помещения, поэтому его глубина перекрывает плиту
                с обеих сторон и обычно равна сумме глубины оборудования плюс запас
                (в среднем на 100–200 мм больше плиты).
              </li>
              <li>
                <strong>Высота (H)</strong> — вертикальный размер самого купола зонта
                (высота борта/корпуса от нижней точки с жироуловителями до верхней
                плоскости или патрубка). Не путайте с высотой подвеса зонта над полом
                или плитой.
              </li>
            </ul>
          </div>,
          document.body,
        )}
    </>
  );
}
