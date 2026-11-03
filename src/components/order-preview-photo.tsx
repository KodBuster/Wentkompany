'use client';

import Image from 'next/image';
import { HoverZoom } from '@/components/hover-zoom';

/** Фото стандарта в форме заказа — с лупой, как в каталоге. */
export function OrderPreviewPhoto({
  src,
  alt,
}: {
  src: string;
  alt: string;
}) {
  return (
    <div className="order-preview__photo gallery-zoom">
      <HoverZoom className="order-preview__zoom" scale={1.7} maxScale={3}>
        <div className="relative h-full w-full">
          <Image
            src={src}
            alt={alt}
            fill
            className="order-preview__img"
            sizes="(max-width: 900px) 100vw, 480px"
            /* Как в галерее каталога: весь кадр, без «приближения» cover */
            style={{ objectFit: 'contain' }}
          />
        </div>
      </HoverZoom>
    </div>
  );
}
