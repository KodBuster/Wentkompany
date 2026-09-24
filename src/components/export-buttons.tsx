'use client';

import { useState } from 'react';
import type { Dims } from '@/lib/calc';
import { GOALS, track } from '@/lib/analytics';

/**
 * Кнопки выгрузки. Клиент отправляет только выбор пользователя —
 * состав, расход и цену пересчитывает сервер, поэтому один и тот же
 * компонент безопасно живёт и в карточке товара, и в конфигураторе.
 */

export type ExportKind = 'pdf' | 'svg' | 'quote' | 'dxf' | 'ifc';

const LABELS: Record<ExportKind, string> = {
  pdf: 'Чертёж PDF',
  svg: 'Скачать SVG',
  quote: 'КП с ценой',
  dxf: 'DXF для CAD',
  ifc: 'IFC для BIM',
};

interface Props {
  slug: string;
  dims: Dims;
  material?: '430' | '304';
  options?: string[];
  kinds?: ExportKind[];
  className?: string;
}

export function ExportButtons({
  slug, dims, material = '430', options = [], kinds = ['pdf', 'svg', 'quote', 'dxf', 'ifc'], className = 'cfg-dl',
}: Props) {
  const [busy, setBusy] = useState<ExportKind | null>(null);
  const [error, setError] = useState('');

  async function run(kind: ExportKind) {
    setBusy(kind);
    setError('');
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, slug, dims, material, options }),
      });
      if (!res.ok) {
        const info = await res.json().catch(() => ({}));
        throw new Error(info.error || 'Не удалось собрать файл');
      }
      const blob = await res.blob();
      const header = res.headers.get('Content-Disposition') ?? '';
      const utf8 = header.match(/filename\*=UTF-8''([^;]+)/);
      const plain = header.match(/filename="([^"]+)"/);
      const name = utf8 ? decodeURIComponent(utf8[1]) : plain?.[1];
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name || `${slug}-${kind}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      track(GOALS.exportFile, { kind, slug });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось собрать файл');
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <div className={className}>
        {kinds.map((kind) => (
          <button key={kind} type="button" onClick={() => run(kind)} disabled={busy !== null}>
            {busy === kind ? 'Собираем…' : LABELS[kind]}
          </button>
        ))}
      </div>
      {error && (
        <span className="badge badge-crit mt-2" role="alert">
          {error}
        </span>
      )}
    </>
  );
}
