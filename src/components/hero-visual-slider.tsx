'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import Image from 'next/image';
import { HoverZoom } from '@/components/hover-zoom';

const INTERVAL_MS = 4000;

type Slide =
  | { id: string; kind: 'diagram'; label: string; node: ReactNode }
  | { id: string; kind: 'image'; label: string; src: string; alt: string };

/**
 * Вьюпорт героя: схема + таблица типов.
 * Размер рамки — по второй (большей) картинке; оба слайда в одном окне.
 */
export function HeroVisualSlider({ diagram }: { diagram: ReactNode }) {
  const slides: Slide[] = [
    {
      id: 'diagram',
      kind: 'diagram',
      label: 'Устройство зонта',
      node: diagram,
    },
    {
      id: 'types',
      kind: 'image',
      label: 'Типы зонтов',
      src: '/hero-hood-types.png',
      alt: 'Типы вытяжных зонтов: пристенные и островные, схемы потоков воздуха',
    },
  ];

  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const n = slides.length;
  const touchX = useRef<number | null>(null);

  const go = useCallback(
    (next: number) => {
      setIdx(((next % n) + n) % n);
    },
    [n],
  );

  useEffect(() => {
    if (paused) return;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    const t = window.setInterval(() => {
      setIdx((i) => (i + 1) % n);
    }, INTERVAL_MS);
    return () => window.clearInterval(t);
  }, [paused, n]);

  const slide = slides[idx]!;

  return (
    <div
      className="hero-slider"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPaused(false);
      }}
      onTouchStart={(e) => {
        touchX.current = e.changedTouches[0]?.clientX ?? null;
        setPaused(true);
      }}
      onTouchEnd={(e) => {
        const start = touchX.current;
        touchX.current = null;
        const end = e.changedTouches[0]?.clientX;
        if (start == null || end == null) return;
        const dx = end - start;
        if (Math.abs(dx) < 40) return;
        go(idx + (dx < 0 ? 1 : -1));
      }}
    >
      {/* Рамка = пропорции hero-hood-types.png (668×630) */}
      <div
        className="hero-slider__viewport"
        aria-roledescription="карусель"
        aria-label="Схемы зонтов"
      >
        {slides.map((s, i) => {
          const on = i === idx;
          return (
            <div
              key={s.id}
              className={`hero-slider__slide${on ? ' is-on' : ''}`}
              aria-hidden={!on}
            >
              {/* Лупа только на активном — иначе pointer-lock конфликтует */}
              {on ? (
                <HoverZoom
                  className="hero-slider__zoom"
                  scale={1.55}
                  maxScale={2.5}
                >
                  {s.kind === 'diagram' ? (
                    <div className="hero-slider__diagram">{s.node}</div>
                  ) : (
                    <div className="hero-slider__photo">
                      <Image
                        src={s.src}
                        alt={s.alt}
                        width={668}
                        height={630}
                        className="hero-slider__img"
                        sizes="(max-width: 900px) 100vw, 480px"
                        priority
                      />
                    </div>
                  )}
                </HoverZoom>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Одна строка: ‹ · подпись · › — точки у надписи по бокам */}
      <div className="hero-slider__bar" role="tablist" aria-label="Слайды">
        <button
          type="button"
          className="hero-slider__nav"
          aria-label="Предыдущая схема"
          onClick={() => go(idx - 1)}
        >
          ‹
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={idx === 0}
          aria-label={slides[0]!.label}
          className={`hero-slider__dot${idx === 0 ? ' is-on' : ''}`}
          onClick={() => go(0)}
        />
        <p className="hero-slider__caption lbl">{slide.label}</p>
        <button
          type="button"
          role="tab"
          aria-selected={idx === 1}
          aria-label={slides[1]!.label}
          className={`hero-slider__dot${idx === 1 ? ' is-on' : ''}`}
          onClick={() => go(1)}
        />
        <button
          type="button"
          className="hero-slider__nav"
          aria-label="Следующая схема"
          onClick={() => go(idx + 1)}
        >
          ›
        </button>
      </div>
    </div>
  );
}
