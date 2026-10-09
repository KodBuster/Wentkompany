'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { HoverZoom } from '@/components/hover-zoom';

/**
 * Один вьюпорт под Full HD + миниатюры / стрелки между кадрами.
 * Лупа только внутри рамки, без раздувания страницы.
 */
export function NeutralGallery({
  photos,
  alt,
}: {
  photos: string[];
  alt: string;
}) {
  const [active, setActive] = useState(0);
  const total = photos.length;
  const safe = total === 0 ? 0 : Math.min(active, total - 1);
  const src = photos[safe];

  const go = useCallback(
    (dir: -1 | 1) => {
      if (total < 2) return;
      setActive((i) => (i + dir + total) % total);
    },
    [total],
  );

  useEffect(() => {
    if (total < 2) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'ArrowRight') go(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, total]);

  if (!src) return null;

  return (
    <div className="neutral-gallery">
      <div className="neutral-gallery__stage">
        {total > 1 && (
          <button
            type="button"
            className="neutral-gallery__nav neutral-gallery__nav--prev"
            aria-label="Предыдущее фото"
            onClick={() => go(-1)}
          >
            ‹
          </button>
        )}

        <div className="neutral-gallery__viewport">
          <HoverZoom className="neutral-gallery__zoom" scale={1.7} maxScale={2.5}>
            <div className="neutral-gallery__shot">
              <Image
                key={src}
                src={src}
                alt={`${alt} — кадр ${safe + 1}`}
                fill
                priority={safe === 0}
                sizes="(max-width: 900px) 100vw, 1100px"
                className="neutral-gallery__img"
              />
            </div>
          </HoverZoom>
        </div>

        {total > 1 && (
          <button
            type="button"
            className="neutral-gallery__nav neutral-gallery__nav--next"
            aria-label="Следующее фото"
            onClick={() => go(1)}
          >
            ›
          </button>
        )}
      </div>

      {total > 1 && (
        <div className="neutral-gallery__thumbs" role="tablist" aria-label="Варианты фото">
          {photos.map((thumb, i) => (
            <button
              key={thumb}
              type="button"
              role="tab"
              aria-selected={i === safe}
              aria-label={`${alt}, кадр ${i + 1}`}
              className={`neutral-gallery__thumb${i === safe ? ' is-active' : ''}`}
              onClick={() => setActive(i)}
            >
              <Image src={thumb} alt="" fill sizes="96px" className="neutral-gallery__thumb-img" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
