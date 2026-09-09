'use client';

import { useState } from 'react';
import Image from 'next/image';

/**
 * Галерея фотографий изделия.
 *
 * Снимки временные: вырезаны из карточек старого сайта, поэтому на них
 * остался водяной знак и разрешение экранное. Заменяются подстановкой новых
 * файлов в public/catalog и правкой images в src/data/catalog.json —
 * трогать компонент не нужно.
 */

export function ProductGallery({ images, alt }: { images: string[]; alt: string }) {
  const [active, setActive] = useState(0);
  if (images.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <div
        className="relative aspect-[4/3] w-full overflow-hidden border"
        style={{ borderColor: 'var(--hair)', background: 'var(--color-steel-850)' }}
      >
        <Image
          src={images[active]}
          alt={alt}
          fill
          priority
          sizes="(max-width: 900px) 100vw, 620px"
          style={{ objectFit: 'contain' }}
        />
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
