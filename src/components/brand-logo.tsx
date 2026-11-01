/**
 * Пробные логотипы FortInox E–H — только для примерки / скринов.
 */

type Variant = 'E' | 'F' | 'G' | 'H';

function BarsFMark({ size = 40 }: { size?: number }) {
  return (
    <svg
      className="brand-mark"
      viewBox="0 0 48 56"
      width={size}
      height={size * (56 / 48)}
      aria-hidden
      focusable="false"
    >
      <rect x="6" y="8" width="36" height="8" rx="1" fill="currentColor" />
      <rect x="6" y="24" width="26" height="8" rx="1" fill="currentColor" />
      <rect x="6" y="40" width="16" height="8" rx="1" fill="currentColor" />
    </svg>
  );
}

function MonoPlateMark({ size = 44 }: { size?: number }) {
  return (
    <svg
      className="brand-mark"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      aria-hidden
      focusable="false"
    >
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="3.5"
        d="M8 14 L14 8 H50 L56 14 V50 L50 56 H14 L8 50 Z"
      />
      <path
        fill="currentColor"
        d="M18 20 H42 V26 H26 V30 H38 V36 H26 V44 H18 Z"
      />
      <path fill="var(--color-extract)" d="M40 28 H46 V44 H40 Z" />
      <rect x="22" y="48" width="20" height="3" rx="1" fill="var(--color-extract)" />
    </svg>
  );
}

/**
 * Щели ромбом: каждая полоска пополам —
 * слева (к чёрному Fort) рыжая, справа (к рыжему Inox) чёрная.
 */
function VentSlots() {
  /*
   * Крайние короче, две средние длиннее.
   * Полоски 2–4 чуть вниз: зазор 1↔2 чуть больше остальных.
   * viewBox плотный по вертикали — палки не «прижаты» к верху кегля.
   */
  const bars: { y: number; x: number; w: number }[] = [
    { y: 1.2, x: 8.5, w: 9 },
    { y: 8.7, x: 0, w: 26 },
    { y: 15.2, x: 0, w: 26 },
    { y: 21.7, x: 8.5, w: 9 },
  ];
  const h = 2.2;
  return (
    <svg
      className="brand-logo-g__vent"
      viewBox="0 0 26 25"
      width={16}
      height={17}
      aria-hidden
      focusable="false"
    >
      {bars.map((b) => {
        const half = b.w / 2;
        return (
          <g key={b.y}>
            <rect
              x={b.x}
              y={b.y}
              width={half}
              height={h}
              fill="var(--color-extract)"
            />
            <rect
              x={b.x + half}
              y={b.y}
              width={half}
              height={h}
              fill="var(--color-steel-100)"
            />
          </g>
        );
      })}
    </svg>
  );
}

export function BrandLogo({
  variant,
  className,
}: {
  variant: Variant;
  className?: string;
}) {
  if (variant === 'E') {
    return (
      <span className={`brand-logo brand-logo--e${className ? ` ${className}` : ''}`}>
        <BarsFMark />
        <span className="brand-logo__word">
          Fort<span className="brand-logo__inox">Inox</span>
        </span>
      </span>
    );
  }

  if (variant === 'F') {
    return (
      <span className={`brand-logo brand-logo--f${className ? ` ${className}` : ''}`}>
        <MonoPlateMark />
        <span className="brand-logo__word">
          Fort<span className="brand-logo__inox">Inox</span>
        </span>
      </span>
    );
  }

  if (variant === 'G') {
    return (
      <span className={`brand-logo brand-logo--g${className ? ` ${className}` : ''}`}>
        <span className="brand-logo__fort">Fort</span>
        <VentSlots />
        <span className="brand-logo__inox-solid">Inox</span>
      </span>
    );
  }

  /* H = тот же G, но капсом: FORT ‖ INOX */
  return (
    <span className={`brand-logo brand-logo--g brand-logo--h${className ? ` ${className}` : ''}`}>
      <span className="brand-logo__fort">FORT</span>
      <VentSlots />
      <span className="brand-logo__inox-solid">INOX</span>
    </span>
  );
}

export const LOGO_PREVIEW_VARIANTS: { id: Variant; title: string; note: string }[] = [
  { id: 'E', title: '1 · E — F из щелей', note: 'Favicon / лазер / штамп' },
  { id: 'F', title: '2 · F — пластина FI', note: 'Монограмма на пластине' },
  { id: 'G', title: '3 · G — Fort ‖ Inox', note: 'Как сейчас, Title Case' },
  { id: 'H', title: '4 · H — FORT ‖ INOX', note: 'Тот же G, все заглавные' },
];
