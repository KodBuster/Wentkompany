'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  displayPriceForDims,
  matrixAllowedValues,
  matrixAxisValues,
  nearestMatrixDims,
} from '@/lib/prices';
import { rub, sizeCompact, type Dims } from '@/lib/calc';

type Axis = 'h' | 'd' | 'w';

/** Подписи как на макете карточки каталога. */
const AXIS_LABEL: Record<Axis, string> = {
  h: 'Высота - H',
  d: 'Вылет (глубина) - D',
  w: 'Длина (ширина) - W',
};

function resolveInitial(article: string, initial: Dims): Dims {
  if (displayPriceForDims(article, initial) != null) return { ...initial };
  return nearestMatrixDims(article, initial) ?? { ...initial };
}

/**
 * Выпадающий список с ограничением высоты и прокруткой
 * (у нативного select высоту панели не задать).
 */
function SizeDropdown({
  label,
  value,
  options,
  onChange,
  open,
  onOpenChange,
}: {
  label: string;
  value: number | null;
  options: number[];
  onChange: (v: number) => void;
  open: boolean;
  onOpenChange: (next: boolean) => void;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) onOpenChange(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onOpenChange(false);
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open || value == null || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-v="${value}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [open, value]);

  const shown = value != null ? `${value} мм` : 'вне прайса';

  return (
    <div className="product-size-order__dd" ref={rootRef}>
      <button
        type="button"
        className="product-size-order__sel border bg-transparent px-2 py-1.5"
        style={{ borderColor: 'var(--hair)' }}
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => onOpenChange(!open)}
      >
        <span>{shown}</span>
        <span className="product-size-order__caret" aria-hidden>
          ▾
        </span>
      </button>
      {open && (
        <ul
          id={listId}
          ref={listRef}
          className="product-size-order__menu"
          role="listbox"
          aria-label={label}
        >
          {options.map((v) => (
            <li key={v} role="option" aria-selected={v === value} data-v={v}>
              <button
                type="button"
                className={
                  v === value
                    ? 'product-size-order__opt product-size-order__opt--on'
                    : 'product-size-order__opt'
                }
                onClick={() => {
                  onChange(v);
                  onOpenChange(false);
                }}
              >
                {v} мм
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Выбор H/D/W: список + поле ввода, цена при точном совпадении с матрицей.
 * layout=tile — компактно на плитке главной; page — блок на странице изделия.
 */
export function ProductSizeOrder({
  slug,
  article,
  initial,
  configurable = false,
  layout = 'page',
}: {
  slug: string;
  article: string;
  initial: Dims;
  configurable?: boolean;
  layout?: 'page' | 'tile';
}) {
  const start = useMemo(() => resolveInitial(article, initial), [article, initial]);
  const axes = useMemo(() => matrixAxisValues(article), [article]);
  const [dims, setDims] = useState<Dims>(start);
  const [draft, setDraft] = useState<Record<Axis, string>>({
    h: String(start.h),
    d: String(start.d),
    w: String(start.w),
  });
  const [openAxis, setOpenAxis] = useState<Axis | null>(null);

  const price = displayPriceForDims(article, dims);

  const allowed: Record<Axis, number[]> = {
    h: matrixAllowedValues(article, { d: dims.d, w: dims.w }, 'h'),
    d: matrixAllowedValues(article, { h: dims.h, w: dims.w }, 'd'),
    w: matrixAllowedValues(article, { h: dims.h, d: dims.d }, 'w'),
  };

  function commitAxis(axis: Axis, raw: string) {
    const cleaned = raw.replace(/\s/g, '').replace(/мм/gi, '').replace(',', '.');
    const n = Number(cleaned);
    if (!Number.isFinite(n) || n <= 0) {
      setDraft((s) => ({ ...s, [axis]: String(dims[axis]) }));
      return;
    }
    const next = Math.round(n);
    setDraft((s) => ({ ...s, [axis]: String(next) }));
    setDims((s) => ({ ...s, [axis]: next }));
  }

  function pickAxis(axis: Axis, value: number) {
    setDraft((s) => ({ ...s, [axis]: String(value) }));
    setDims((s) => ({ ...s, [axis]: value }));
  }

  const orderHref = price
    ? `/contacts?mode=order&slug=${encodeURIComponent(slug)}&h=${dims.h}&w=${dims.w}&d=${dims.d}`
    : `/contacts?mode=quote&slug=${encodeURIComponent(slug)}&h=${dims.h}&w=${dims.w}&d=${dims.d}`;

  const cfgHref = `/configurator?slug=${encodeURIComponent(slug)}&h=${dims.h}&w=${dims.w}&d=${dims.d}`;

  const allH = axes.h.length ? axes.h : allowed.h;
  const allD = axes.d.length ? axes.d : allowed.d;
  const allW = axes.w.length ? axes.w : allowed.w;

  const isTile = layout === 'tile';

  return (
    <div className={isTile ? 'product-size-order product-size-order--tile' : 'product-size-order'}>
      {isTile ? (
        <dl className="home-catalog__specs">
          <div>
            <dt>Габарит H/D/W</dt>
            <dd>{sizeCompact(dims)} мм</dd>
          </div>
        </dl>
      ) : (
        <>
          <p className="lbl mt-6">Габарит H/D/W</p>
          <p className="num text-xl mt-1">{sizeCompact(dims)} мм</p>
        </>
      )}

      <div className={`flex flex-col gap-2 ${isTile ? 'mt-3' : 'mt-4'}`}>
        {(['h', 'd', 'w'] as const).map((axis) => {
          const list = axis === 'h' ? allH : axis === 'd' ? allD : allW;
          const filtered = allowed[axis];
          /* В списке — только совместимые с остальными осями; иначе полный ряд оси. */
          const options = filtered.length ? filtered : list;
          const inMatrix = filtered.includes(dims[axis]);
          return (
            <div
              key={axis}
              className={`grid items-center gap-2 text-sm ${isTile ? 'product-size-order__row' : 'flex flex-wrap'}`}
            >
              <span className="muted product-size-order__lab">{AXIS_LABEL[axis]}</span>
              <SizeDropdown
                label={`${AXIS_LABEL[axis]}, выбор из прайса`}
                value={inMatrix ? dims[axis] : null}
                options={options}
                open={openAxis === axis}
                onOpenChange={(next) => setOpenAxis(next ? axis : null)}
                onChange={(v) => pickAxis(axis, v)}
              />
              <input
                type="text"
                inputMode="numeric"
                className="border bg-transparent px-2 py-1.5 num product-size-order__inp"
                style={{ borderColor: 'var(--hair)' }}
                value={draft[axis]}
                onChange={(e) => setDraft((s) => ({ ...s, [axis]: e.target.value }))}
                onBlur={() => commitAxis(axis, draft[axis])}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    commitAxis(axis, draft[axis]);
                  }
                }}
                aria-label={`${AXIS_LABEL[axis]}, ввод мм`}
              />
              <span className="muted product-size-order__mm" aria-hidden>
                мм
              </span>
            </div>
          );
        })}
      </div>

      {isTile ? (
        <div className="home-catalog__cta mt-auto">
          <span className="num home-catalog__price">
            {price ? rub(price) : 'после расчёта'}
          </span>
          <Link href={orderHref} className="btn home-catalog__btn">
            {price ? 'Заказать' : 'Запросить расчёт'}
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-8 flex flex-wrap items-baseline gap-4">
            <span className="num text-4xl">{price ? rub(price) : 'после расчёта'}</span>
            {price ? (
              <span className="badge">цена типоразмера из прайса</span>
            ) : (
              <span className="badge badge-warn">после расчёта</span>
            )}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={orderHref} className="btn">
              {price ? 'Заказать' : 'Запросить расчёт'}
            </Link>
            {configurable && (
              <Link href={cfgHref} className="btn btn-ghost">
                Открыть в конфигураторе
              </Link>
            )}
          </div>
        </>
      )}
    </div>
  );
}
