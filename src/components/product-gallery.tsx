'use client';

import { useState } from 'react';
import Image from 'next/image';
import { HoverZoom } from '@/components/hover-zoom';

/**
 * Галерея фотографий изделия.
 * Пути — из catalog.json (файлы в public/catalog/).
 * Главный кадр — с лупой как на главной (только мышь).
 */

export function ProductGallery({ images, alt }: { images: string[]; alt: string }) {
  const [active, setActive] = useState(0);
  if (images.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <div
        className="gallery-zoom relative aspect-[4/3] w-full overflow-hidden border"
        style={{ borderColor: 'var(--hair)', background: 'var(--color-steel-850)' }}
      >
        <HoverZoom className="absolute inset-0 block h-full w-full">
          <div className="relative h-full w-full">
            <Image
              src={images[active]}
              alt={alt}
              fill
              priority
              sizes="(max-width: 900px) 100vw, 620px"
              style={{ objectFit: 'contain' }}
            />
          </div>
        </HoverZoom>
      </div>

      {images.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`${alt}, снимок ${i + 1}`}
              aria-pressed={i === active}
              className="relative h-16 w-20 cursor-pointer overflow-hidden border"
              style={{
                borderColor: i === active ? 'var(--color-extract)' : 'var(--color-steel-700)',
                background: 'var(--color-steel-850)',
              }}
            >
              <Image src={src} alt="" fill sizes="80px" style={{ objectFit: 'contain' }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
