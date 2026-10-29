'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { CLAUSE_TIP } from '@/lib/clause-tips';

type Anchor = { x: number; y: number };

function tipPosition(anchor: Anchor) {
  const tipW = 300;
  const tipH = 168;
  const gap = 14;
  let left = anchor.x + gap;
  if (left + tipW > window.innerWidth - 12) {
    left = anchor.x - tipW - gap;
  }
  const placeAbove = window.innerHeight - anchor.y < tipH + 28;
  const top = placeAbove ? anchor.y - gap : anchor.y + gap;
  return { left, top, placeAbove };
}

/** Розовый бейдж пункта: курсор «?»; по клику — текст нормы. */
export function ClauseTipBadge({ clauseId, label }: { clauseId: string; label: string }) {
  const tip = CLAUSE_TIP[clauseId];
  const hitRef = useRef<HTMLSpanElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<Anchor | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: Event) => {
      const t = e.target as Node | null;
      if (hitRef.current?.contains(t)) return;
      if (tipRef.current?.contains(t)) return;
      // Клик по вложенному бейджу / его карточке — не закрываем родителя
      const el = t as HTMLElement | null;
      if (el?.closest?.('.clause-tip')) return;
      if (el?.closest?.('.clause-tip-hit')) return;
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

  if (!tip) {
    return <span className="badge badge-crit">{label}</span>;
  }

  const pos = anchor ? tipPosition(anchor) : null;

  return (
    <>
      <span
        ref={hitRef}
        className="badge badge-crit clause-tip-hit"
        role="button"
        tabIndex={0}
        aria-expanded={open}
        aria-label={`${label}: ${tip.title}`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (open) {
            setOpen(false);
            return;
          }
          setAnchor({ x: e.clientX, y: e.clientY });
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key !== 'Enter' && e.key !== ' ') return;
          e.preventDefault();
          e.stopPropagation();
          const r = hitRef.current?.getBoundingClientRect();
          if (!r) return;
          if (open) {
            setOpen(false);
            return;
          }
          setAnchor({ x: r.left + r.width / 2, y: r.bottom });
          setOpen(true);
        }}
      >
        {label}
      </span>
      {open &&
        anchor &&
        pos &&
        createPortal(
          <div
            ref={tipRef}
            className={`clause-tip clause-tip--interactive${pos.placeAbove ? ' clause-tip--above' : ''}`}
            style={{ left: pos.left, top: pos.top, zIndex: 90 }}
            role="dialog"
            aria-label={`п. ${clauseId}: ${tip.title}`}
          >
            <p className="lbl" style={{ color: 'var(--color-extract)' }}>
              п. {clauseId}
            </p>
            <p className="clause-tip__title">{tip.title}</p>
            <p className="clause-tip__text">
              <ClauseRichText text={tip.text} excludeId={clauseId} />
            </p>
          </div>,
          document.body,
        )}
    </>
  );
}

/**
 * В тексте одиночные «п. 5.XX» становятся кликабельными подсказками.
 * Диапазоны «пп. 5.28–5.33» не трогаем. excludeId — не линковать сам открытый пункт.
 */
export function ClauseRichText({
  text,
  excludeId,
}: {
  text: string;
  excludeId?: string;
}): ReactNode {
  const re = /(пп\.\s*5\.\d{2}\s*[–\-−]\s*5\.\d{2})|(п\.\s*5\.\d{2})/g;
  const parts: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const range = m[1];
    const single = m[2];
    if (range) {
      parts.push(range);
    } else if (single) {
      const id = single.replace(/^п\.\s*/i, '');
      if (CLAUSE_TIP[id] && id !== excludeId) {
        parts.push(<ClauseTipBadge key={`${id}-${i++}`} clauseId={id} label={single} />);
      } else {
        parts.push(single);
      }
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length === 1 ? parts[0] : <>{parts}</>;
}
