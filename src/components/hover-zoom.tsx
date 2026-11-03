'use client';

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
} from 'react';

type Pt = { x: number; y: number };

function clamp(n: number, a: number, b: number) {
  return Math.min(b, Math.max(a, n));
}

/** Мышь / трекпад с нормальным hover — не тачфон */
function useDesktopPointer() {
  const [ok, setOk] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
    const sync = () => setOk(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  return ok;
}

/**
 * Зум-лупа по клику мыши — только pointerType === 'mouse'.
 * В режиме лупы колесо: плавно от minScale (1.55) до maxScale (2.5).
 * Тач не трогаем.
 *
 * controlled: `active` + `onActiveChange` — внешняя кнопка (конфигуратор).
 * `clickToggle={false}` — клик по области не переключает (орбита 3D свободна).
 */
export function HoverZoom({
  children,
  scale = 1.55,
  maxScale = 2.5,
  className,
  active: controlledActive,
  onActiveChange,
  clickToggle = true,
}: {
  children: ReactNode;
  /** Стартовый / минимальный зум в режиме лупы */
  scale?: number;
  /** Потолок зума колесом */
  maxScale?: number;
  className?: string;
  /** Управляемый режим (кнопка «Лупа») */
  active?: boolean;
  onActiveChange?: (next: boolean) => void;
  /** Клик по области включает/выключает; false — только внешнее управление */
  clickToggle?: boolean;
}) {
  const minScale = scale;
  const desktop = useDesktopPointer();
  const clipId = useId().replace(/:/g, '');
  const ref = useRef<HTMLDivElement>(null);
  /** Свой выход из лупы — не дублировать сброс в pointerlockchange. */
  const selfExitRef = useRef(false);
  const [internalOn, setInternalOn] = useState(false);
  const [pos, setPos] = useState<Pt>({ x: 50, y: 50 });
  const [liveScale, setLiveScale] = useState(minScale);

  const controlled = controlledActive !== undefined;
  const on = controlled ? Boolean(controlledActive) : internalOn;

  const pctFromClient = useCallback((clientX: number, clientY: number): Pt => {
    const box = ref.current?.getBoundingClientRect();
    if (!box || box.width === 0 || box.height === 0) return { x: 50, y: 50 };
    return {
      x: clamp(((clientX - box.left) / box.width) * 100, 0, 100),
      y: clamp(((clientY - box.top) / box.height) * 100, 0, 100),
    };
  }, []);

  const stopLoupe = useCallback(() => {
    /* Сброс origin/scale — иначе уход с угла «сбивает» кадр листа. */
    setPos({ x: 50, y: 50 });
    setLiveScale(minScale);
    /* Только свой контейнер: обход родителей сбрасывал scroll страницы. */
    if (ref.current) {
      ref.current.scrollLeft = 0;
      ref.current.scrollTop = 0;
    }
    /* exitPointerLock часто дёргает window.scroll — возвращаем позицию. */
    const sx = window.scrollX;
    const sy = window.scrollY;
    selfExitRef.current = true;
    if (document.pointerLockElement === ref.current) {
      document.exitPointerLock();
    }
    requestAnimationFrame(() => {
      window.scrollTo(sx, sy);
      selfExitRef.current = false;
    });
    if (controlled) onActiveChange?.(false);
    else setInternalOn(false);
  }, [minScale, controlled, onActiveChange]);

  const startLoupe = useCallback(
    (clientX: number, clientY: number) => {
      setPos(pctFromClient(clientX, clientY));
      setLiveScale(minScale);
      if (controlled) onActiveChange?.(true);
      else setInternalOn(true);
      void ref.current?.requestPointerLock?.();
    },
    [pctFromClient, minScale, controlled, onActiveChange],
  );

  /* Внешнее включение: стартуем из центра и берём pointer lock */
  useEffect(() => {
    if (!controlled || !desktop) return;
    if (controlledActive) {
      setLiveScale(minScale);
      const box = ref.current?.getBoundingClientRect();
      if (box) {
        setPos({ x: 50, y: 50 });
        void ref.current?.requestPointerLock?.();
      }
    } else {
      setLiveScale(minScale);
      if (document.pointerLockElement === ref.current) {
        document.exitPointerLock();
      }
    }
  }, [controlled, controlledActive, desktop, minScale]);

  useEffect(() => {
    if (!desktop && on) stopLoupe();
  }, [desktop, on, stopLoupe]);

  useEffect(() => {
    const onLockChange = () => {
      if (document.pointerLockElement === ref.current || !on) return;
      if (selfExitRef.current) return;
      /* Потеряли lock извне (Esc системы и т.п.) */
      const sx = window.scrollX;
      const sy = window.scrollY;
      setPos({ x: 50, y: 50 });
      setLiveScale(minScale);
      if (ref.current) {
        ref.current.scrollLeft = 0;
        ref.current.scrollTop = 0;
      }
      if (controlled) onActiveChange?.(false);
      else setInternalOn(false);
      requestAnimationFrame(() => {
        window.scrollTo(sx, sy);
      });
    };
    document.addEventListener('pointerlockchange', onLockChange);
    return () => document.removeEventListener('pointerlockchange', onLockChange);
  }, [minScale, on, controlled, onActiveChange]);

  useEffect(() => {
    if (!on || !desktop) return;

    const onMove = (e: MouseEvent) => {
      const box = ref.current?.getBoundingClientRect();
      if (!box || box.width === 0 || box.height === 0) return;

      if (document.pointerLockElement === ref.current) {
        setPos((p) => ({
          x: clamp(p.x + (e.movementX / box.width) * 100, 0, 100),
          y: clamp(p.y + (e.movementY / box.height) * 100, 0, 100),
        }));
        return;
      }
      setPos(pctFromClient(e.clientX, e.clientY));
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      /* deltaY > 0 — от себя / вниз = отдалить; вверх = приблизить */
      const step = e.deltaMode === 1 ? 0.08 : 0.0012;
      setLiveScale((s) =>
        Math.round(clamp(s - e.deltaY * step, minScale, maxScale) * 100) / 100,
      );
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') stopLoupe();
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('wheel', onWheel, { passive: false });
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('wheel', onWheel);
      document.removeEventListener('keydown', onKey);
    };
  }, [on, desktop, pctFromClient, stopLoupe, minScale, maxScale]);

  if (!desktop) {
    return (
      <div className={className} style={{ width: '100%', height: '100%' }}>
        {children}
      </div>
    );
  }

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!clickToggle) return;
    if (e.pointerType !== 'mouse') return;
    if (e.button !== 0) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    e.preventDefault();
    if (on) stopLoupe();
    else startLoupe(e.clientX, e.clientY);
  };

  const origin = `${pos.x}% ${pos.y}%`;

  return (
    <div
      ref={ref}
      className={className}
      role={clickToggle ? 'button' : undefined}
      tabIndex={clickToggle ? 0 : undefined}
      aria-pressed={clickToggle ? on : undefined}
      aria-label={
        clickToggle
          ? on
            ? `Лупа ×${liveScale.toFixed(2)}, левая кнопка мыши — выключить, колёсико — масштаб`
            : 'Включить лупу для схемы'
          : on
            ? `Лупа ×${liveScale.toFixed(2)}, колёсико — масштаб, Esc — выключить`
            : undefined
      }
      onPointerDown={onPointerDown}
      onKeyDown={
        clickToggle
          ? (e) => {
              if (e.key !== 'Enter' && e.key !== ' ') return;
              e.preventDefault();
              if (on) stopLoupe();
              else {
                const box = ref.current?.getBoundingClientRect();
                if (!box) return;
                startLoupe(box.left + box.width / 2, box.top + box.height / 2);
              }
            }
          : undefined
      }
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        /* Не даём раздутому scale утащить скролл родителя */
        overflow: 'hidden',
        /* В лупе системный курсор скрыт — рисуем свою «мышь» */
        cursor: on ? 'none' : clickToggle ? 'zoom-in' : 'default',
        userSelect: 'none',
        touchAction: 'auto',
      }}
    >
      <div
        className="hover-zoom__target"
        style={{
          width: '100%',
          height: '100%',
          transformOrigin: on ? origin : '50% 50%',
          transform: on ? `scale(${liveScale})` : 'none',
          /* Выход без анимации — иначе кадр «плывёт» от угла курсора */
          transition: on ? 'transform 0.12s ease-out' : 'none',
          willChange: on ? 'transform' : undefined,
          /* В лупе блокируем орбиту; вне лупы при clickToggle=false — события идут на canvas */
          pointerEvents: on ? 'none' : clickToggle ? 'none' : 'auto',
        }}
      >
        {children}
      </div>

      {on && (
        <span
          aria-hidden
          className="hover-zoom__reticle"
          style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
          title={`×${liveScale.toFixed(2)} · ЛКМ — выйти · колесо — масштаб`}
        >
          {/* Компактная мышь: ЛКМ = выход, колёсико = зум */}
          <svg
            className="hover-zoom__mouse"
            viewBox="0 0 24 36"
            width="22"
            height="33"
            focusable="false"
          >
            <defs>
              <clipPath id={clipId}>
                <rect x="2.5" y="1.5" width="19" height="33" rx="9.5" />
              </clipPath>
            </defs>
            {/* Корпус */}
            <rect
              x="2.5"
              y="1.5"
              width="19"
              height="33"
              rx="9.5"
              className="hover-zoom__mouse-body"
            />
            <g clipPath={`url(#${clipId})`}>
              {/* Левая кнопка */}
              <rect
                x="2.5"
                y="1.5"
                width="9.5"
                height="13"
                className="hover-zoom__mouse-lmb"
              />
              {/* Правая — приглушена */}
              <rect
                x="12"
                y="1.5"
                width="9.5"
                height="13"
                className="hover-zoom__mouse-rmb"
              />
            </g>
            {/* Шов между кнопками */}
            <line
              x1="12"
              y1="2.5"
              x2="12"
              y2="14.5"
              className="hover-zoom__mouse-split"
            />
            {/* Горизонталь под кнопками */}
            <line
              x1="4"
              y1="14.5"
              x2="20"
              y2="14.5"
              className="hover-zoom__mouse-split"
            />
            {/* Вариант F: колёсико B+C; ЛКМ — «плямк» с блеском */}
            <g className="hover-zoom__wheel">
              <defs>
                <clipPath id={`${clipId}-wheel`}>
                  <rect x="9.5" y="7.4" width="5" height="8" rx="2.4" />
                </clipPath>
              </defs>
              <path
                className="hover-zoom__wheel-chevron hover-zoom__wheel-chevron--up"
                d="M12 3.9 L8.9 7.35 H15.1 Z"
              />
              <rect
                x="9.5"
                y="7.4"
                width="5"
                height="8"
                rx="2.4"
                className="hover-zoom__mouse-wheel"
              />
              <g clipPath={`url(#${clipId}-wheel)`}>
                <line
                  className="hover-zoom__wheel-notch"
                  x1="10.15"
                  y1="11.4"
                  x2="13.85"
                  y2="11.4"
                />
              </g>
              <path
                className="hover-zoom__wheel-chevron hover-zoom__wheel-chevron--dn"
                d="M12 18.9 L8.9 15.45 H15.1 Z"
              />
            </g>
          </svg>
        </span>
      )}
    </div>
  );
}
