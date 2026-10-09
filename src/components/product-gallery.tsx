'use client';

import { useState } from 'react';
import Image from 'next/image';
import { HoverZoom } from '@/components/hover-zoom';

type Frame =
  | { kind: 'image'; src: string; label: string }
  | { kind: 'scheme'; src: string; label: string };

/**
 * Галерея изделия: фото и кадр схемки-съёмки.
 * Главный кадр — с лупой (мышь).
 */
export function ProductGallery({
  images,
  alt,
  schemeSrc,
  schemeLabel = 'Схема',
}: {
  images: string[];
  alt: string;
  /** Статичная схемка-съёмка — второй кадр */
  schemeSrc?: string | null;
  schemeLabel?: string;
}) {
  const frames: Frame[] = [
    ...images.map((src, i) => ({
      kind: 'image' as const,
      src,
      label: images.length > 1 ? `${alt}, снимок ${i + 1}` : alt,
    })),
    ...(schemeSrc
      ? [{ kind: 'scheme' as const, src: schemeSrc, label: `${alt} · ${schemeLabel}` }]
      : []),
  ];

  const [active, setActive] = useState(0);
  if (frames.length === 0) return null;

  const frame = frames[Math.min(active, frames.length - 1)];

  return (
    <div className="flex flex-col gap-3">
      <div
        className="gallery-zoom relative aspect-[4/3] w-full overflow-hidden border"
        style={{
          borderColor: 'var(--hair)',
          background: frame.kind === 'scheme' ? 'var(--color-sheet)' : 'var(--color-steel-850)',
        }}
      >
        <HoverZoom className="absolute inset-0 block h-full w-full">
          <div className="relative h-full w-full">
            <Image
              src={frame.src}
              alt={frame.label}
              fill
              priority
              sizes="(max-width: 900px) 100vw, 620px"
              style={{ objectFit: 'contain' }}
            />
          </div>
        </HoverZoom>
      </div>

      {frames.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {frames.map((f, i) => (
            <button
              key={`${f.kind}-${f.src}`}
              type="button"
              onClick={() => setActive(i)}
              aria-label={f.label}
              aria-pressed={i === active}
              className="relative h-16 w-20 cursor-pointer overflow-hidden border"
              style={{
                borderColor: i === active ? 'var(--color-extract)' : 'var(--color-steel-700)',
                background: f.kind === 'scheme' ? 'var(--color-sheet)' : 'var(--color-steel-850)',
              }}
            >
              <Image src={f.src} alt="" fill sizes="80px" style={{ objectFit: 'contain' }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
