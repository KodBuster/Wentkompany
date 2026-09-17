/**
 * Схема зонта с выносками — терминология производителя.
 *
 * Стрелки потоков — заполненные ленты по кубическим Безье.
 * Корпус и узлы контрастнее, с non-scaling-stroke — читаются на мелком масштабе.
 */

'use client';

import { useId } from 'react';

interface Props {
  /** островное исполнение: подвес на потолок, захват по периметру */
  island?: boolean;
  /** приточно-вытяжной: врезка притока и щелевые решётки */
  supply?: boolean;
  /** Компактный показ (герой): крупнее нижние наконечники и чуть толще штрих */
  compact?: boolean;
  className?: string;
}

/* Изометрия. Низ — проём захвата, верх — крыша. */
const B = { fl: [150, 300], fr: [430, 300], br: [520, 252], bl: [240, 252] };
const T = { fl: [196, 186], fr: [396, 186], br: [458, 152], bl: [258, 152] };

const poly = (...pts: number[][]) => pts.map((p) => p.join(',')).join(' ');

type Pt = [number, number];

/** Единичная касательная в конце кубики (P2 → P3). */
function endTangent(p2: Pt, p3: Pt): Pt {
  const dx = p3[0] - p2[0];
  const dy = p3[1] - p2[1];
  const len = Math.hypot(dx, dy) || 1;
  return [dx / len, dy / len];
}

/** Наконечник: длина `size`, основание чуть шире штриха — читается как стрелка. */
function flowTip(
  apex: Pt,
  ux: number,
  uy: number,
  size: number,
  strokeW: number,
): string {
  const half = strokeW * 0.72;
  const bx = apex[0] - ux * size;
  const by = apex[1] - uy * size;
  const px = -uy;
  const py = ux;
  return `M ${apex[0]},${apex[1]} L ${bx + px * half},${by + py * half} L ${bx - px * half},${by - py * half} Z`;
}

/**
 * Поток: кубика + залитый наконечник.
 * tipVertical — ось кончика строго вверх (нижние рыжие); иначе по касательной.
 * Основание кончика = конец тела (точки A и B совпадают).
 */
function FlowArrow({
  p0,
  p1,
  p2,
  p3,
  color,
  width,
  tipSize = 11,
  tipVertical = false,
}: {
  p0: Pt;
  p1: Pt;
  p2: Pt;
  p3: Pt;
  color: string;
  width: number;
  tipSize?: number;
  tipVertical?: boolean;
}) {
  const [ux, uy] = tipVertical ? ([0, -1] as Pt) : endTangent(p2, p3);
  /* Конец тела = центр основания наконечника (A ≡ B) */
  const body = `M${p0[0]},${p0[1]} C${p1[0]},${p1[1]} ${p2[0]},${p2[1]} ${p3[0]},${p3[1]}`;
  const apex: Pt = [p3[0] + ux * tipSize, p3[1] + uy * tipSize];

  return (
    <g opacity="0.92">
      <path
        d={body}
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeLinecap="butt"
        strokeLinejoin="round"
      />
      <path d={flowTip(apex, ux, uy, tipSize, width)} fill={color} />
    </g>
  );
}

export function HoodDiagram({
  island = false,
  supply = false,
  compact = false,
  className,
}: Props) {
  const uid = useId().replace(/:/g, '');
  const title = `Устройство ${island ? 'островного' : 'пристенного'} ${
    supply ? 'приточно-вытяжного' : 'вытяжного'
  } зонта`;

  const tip = `hd-tip-${uid}`;
  const tipStart = `hd-tip-start-${uid}`;
  const tipS = `hd-tip-s-${uid}`;
  const bodyGrad = `hd-body-${uid}`;

  /* На герое SVG мельче — чуть толще штрих и крупнее кончик (×1.5), пропорции те же */
  const intakeW = compact ? 7.4 : 5.0;
  const exhaustW = compact ? 7.0 : 4.7;
  const intakeTip = compact ? 16.5 : 11;
  const exhaustTip = compact ? 14 : 10;
  /* Левая кромка ≈ полклетки сетки фона от края SVG */
  const labelL = 8;
  /* Правый край текста (моно 12.5) — от него стартует полка выноски */
  const labelStub = {
    collar: labelL + 168, /* «Врезка присоединительная» */
    filters: labelL + 148, /* «Лабиринтные фильтры» */
    tray: labelL + 72, /* «Ванночка» */
  };
  /* Точка K — левый край основания врезки на крыше */
  const collarK: Pt = [297, 169];
  /* Размер «Длина» чуть выше врезки, без прислонения */
  const lengthY = 98;

  return (
    <figure className={className} style={{ margin: 0 }}>
      <svg
        viewBox="0 0 660 420"
        role="img"
        aria-label={title}
        style={{ width: '100%', height: 'auto', display: 'block' }}
      >
        <defs>
          <linearGradient id={bodyGrad} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--color-steel-800)" stopOpacity="0.65" />
            <stop offset="100%" stopColor="var(--color-steel-700)" stopOpacity="0.3" />
          </linearGradient>
          <marker id={tip} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0,1 L10,5 L0,9 z" fill="var(--color-steel-200)" />
          </marker>
          {/* Старт размерной линии: остриё наружу, без вылета за выносную */}
          <marker id={tipStart} viewBox="0 0 10 10" refX="1" refY="5" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M10,1 L0,5 L10,9 z" fill="var(--color-steel-200)" />
          </marker>
          <marker id={tipS} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M0,1 L10,5 L0,9 z" fill="var(--color-steel-300)" />
          </marker>
        </defs>

        {island && (
          <g>
            <path
              d="M120,40 L580,40"
              stroke="var(--color-steel-200)"
              strokeWidth="2.8"
              vectorEffect="non-scaling-stroke"
            />
            <g
              stroke="var(--color-steel-300)"
              strokeWidth="1.6"
              strokeDasharray="5 4"
              vectorEffect="non-scaling-stroke"
            >
              <path d={`M${T.fl[0]},${T.fl[1]} L${T.fl[0]},40`} />
              <path d={`M${T.fr[0]},${T.fr[1]} L${T.fr[0]},40`} />
              <path d={`M${T.bl[0]},${T.bl[1]} L${T.bl[0]},40`} />
              <path d={`M${T.br[0]},${T.br[1]} L${T.br[0]},40`} />
            </g>
          </g>
        )}

        {/* ——— корпус ——— */}
        <g strokeLinejoin="round">
          <polygon points={poly(B.fr, B.br, T.br, T.fr)} fill={`url(#${bodyGrad})`} stroke="none" />
          <polygon points={poly(B.fl, B.fr, T.fr, T.fl)} fill="rgba(60, 50, 42, 0.14)" stroke="none" />
          <polygon points={poly(T.fl, T.fr, T.br, T.bl)} fill="rgba(60, 50, 42, 0.2)" stroke="none" />
        </g>
        <g
          stroke="var(--color-steel-100)"
          strokeWidth="2.4"
          fill="none"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        >
          <polygon points={poly(B.fr, B.br, T.br, T.fr)} />
          <polygon points={poly(B.fl, B.fr, T.fr, T.fl)} />
          <polygon points={poly(T.fl, T.fr, T.br, T.bl)} />
        </g>
        <g
          stroke="var(--color-steel-300)"
          strokeWidth="1.5"
          strokeDasharray="5 3.5"
          fill="none"
          vectorEffect="non-scaling-stroke"
        >
          <path d={`M${B.bl[0]},${B.bl[1]} L${B.fl[0]},${B.fl[1]}`} />
          <path d={`M${B.bl[0]},${B.bl[1]} L${B.br[0]},${B.br[1]}`} />
          <path d={`M${B.bl[0]},${B.bl[1]} L${T.bl[0]},${T.bl[1]}`} />
        </g>

        {/* ——— лабиринтные кассеты ——— */}
        <g stroke="var(--color-steel-100)" strokeWidth="1.9" vectorEffect="non-scaling-stroke">
          {[0, 1, 2, 3, 4].map((i) => {
            const x = 198 + i * 44;
            return (
              <g key={i}>
                <polygon
                  points={poly([x, 286], [x + 28, 286], [x + 46, 262], [x + 18, 262])}
                  fill="var(--color-sheet)"
                />
                <path
                  d={`M${x + 8},284 L${x + 22},264 M${x + 16},284 L${x + 30},264`}
                  stroke="var(--color-steel-300)"
                  strokeWidth="1.3"
                  fill="none"
                  vectorEffect="non-scaling-stroke"
                />
              </g>
            );
          })}
        </g>

        {/* ——— ванночка ——— */}
        <polygon
          points={poly([150, 300], [430, 300], [430, 314], [150, 314])}
          fill="var(--color-steel-800)"
          stroke="var(--color-steel-100)"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />

        {/* ——— врезка ——— */}
        <g stroke="var(--color-steel-100)" strokeWidth="2.1" vectorEffect="non-scaling-stroke">
          <ellipse cx="327" cy="169" rx="30" ry="11" fill="var(--color-sheet)" />
          <path d="M297,169 L297,128" fill="none" />
          <path d="M357,169 L357,128" fill="none" />
          <rect x="297" y="128" width="60" height="41" fill="rgba(60,50,42,0.1)" stroke="none" />
          <ellipse cx="327" cy="128" rx="30" ry="11" fill="var(--color-steel-800)" />
        </g>

        {/*
          Потоки: низ — рыжие, наконечник строго вертикально (A≡B);
          блок низа чуть опущен — зазор под ванночкой. Верх — по касательной.
        */}
        <g transform="translate(0, 14)">
          <FlowArrow
            color="var(--color-extract)"
            width={intakeW}
            tipSize={intakeTip}
            tipVertical
            p0={[228, 390]}
            p1={[208, 365]}
            p2={[244, 348]}
            p3={[238, 328]}
          />
          <FlowArrow
            color="var(--color-extract)"
            width={intakeW}
            tipSize={intakeTip}
            tipVertical
            p0={[292, 396]}
            p1={[274, 368]}
            p2={[308, 350]}
            p3={[300, 328]}
          />
          <FlowArrow
            color="var(--color-extract)"
            width={intakeW}
            tipSize={intakeTip}
            tipVertical
            p0={[362, 390]}
            p1={[382, 365]}
            p2={[356, 348]}
            p3={[352, 328]}
          />
        </g>
        <g>
          <FlowArrow
            color="var(--color-supply)"
            width={exhaustW}
            tipSize={exhaustTip}
            p0={[315, 118]}
            p1={[308, 94]}
            p2={[310, 70]}
            p3={[312, 56]}
          />
          <FlowArrow
            color="var(--color-supply)"
            width={exhaustW}
            tipSize={exhaustTip}
            p0={[327, 116]}
            p1={[327, 92]}
            p2={[327, 68]}
            p3={[327, 54]}
          />
          <FlowArrow
            color="var(--color-supply)"
            width={exhaustW}
            tipSize={exhaustTip}
            p0={[339, 118]}
            p1={[346, 94]}
            p2={[344, 70]}
            p3={[342, 56]}
          />
        </g>

        {supply && (
          <>
            <g
              stroke="var(--color-supply)"
              strokeWidth="2"
              fill="rgba(61,122,140,.16)"
              vectorEffect="non-scaling-stroke"
            >
              <rect x="468" y="116" width="42" height="22" rx="2" />
              <path d="M489,138 L489,166" fill="none" />
            </g>
            <g stroke="var(--color-supply)" strokeWidth="2.2" vectorEffect="non-scaling-stroke">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <path key={i} d={`M${168 + i * 46},296 L${192 + i * 46},296`} />
              ))}
            </g>
            <FlowArrow
              color="var(--color-supply)"
              width={exhaustW}
              tipSize={exhaustTip}
              p0={[178, 318]}
              p1={[170, 345]}
              p2={[166, 365]}
              p3={[164, 378]}
            />
            <FlowArrow
              color="var(--color-supply)"
              width={exhaustW}
              tipSize={exhaustTip}
              p0={[412, 318]}
              p1={[420, 345]}
              p2={[424, 365]}
              p3={[426, 378]}
            />
          </>
        )}

        {/* ——— габариты ——— */}
        <g
          stroke="var(--color-steel-200)"
          strokeWidth="1.7"
          fill="none"
          vectorEffect="non-scaling-stroke"
        >
          <path
            d={`M196,${lengthY} L396,${lengthY}`}
            markerStart={`url(#${tipStart})`}
            markerEnd={`url(#${tip})`}
          />
          {/* Вылет: параллельно ребру B.fr→B.br, вынесен наружу */}
          <path
            d={`M${B.fr[0] + 28},${B.fr[1] + 28} L${B.br[0] + 28},${B.br[1] + 28}`}
            markerStart={`url(#${tipStart})`}
            markerEnd={`url(#${tip})`}
          />
          {/* Высота: строго между выносными на крыше и задней кромке дна */}
          <path
            d={`M582,${T.br[1]} L582,${B.br[1]}`}
            markerStart={`url(#${tipStart})`}
            markerEnd={`url(#${tip})`}
          />
          <g stroke="var(--color-steel-400)" strokeWidth="1.3">
            <path d={`M196,182 L196,${lengthY}`} />
            <path d={`M396,182 L396,${lengthY}`} />
            <path d={`M${B.fr[0]},${B.fr[1]} L${B.fr[0] + 28},${B.fr[1] + 28}`} />
            <path d={`M${B.br[0]},${B.br[1]} L${B.br[0] + 28},${B.br[1] + 28}`} />
            <path d={`M${T.br[0]},${T.br[1]} L588,${T.br[1]}`} />
            <path d={`M${B.br[0]},${B.br[1]} L588,${B.br[1]}`} />
          </g>
        </g>
        <g
          fontFamily="var(--font-mono)"
          fontSize="13.5"
          fontWeight="600"
          fill="var(--color-steel-100)"
          stroke="var(--color-sheet)"
          strokeWidth="3.5"
          paintOrder="stroke fill"
        >
          <text x="296" y={lengthY - 10} textAnchor="middle">
            Длина
          </text>
          <text
            x={(B.fr[0] + B.br[0]) / 2 + 52}
            y={(B.fr[1] + B.br[1]) / 2 + 48}
            textAnchor="middle"
            dominantBaseline="middle"
          >
            Вылет
          </text>
          <text
            x="594"
            y={(T.br[1] + B.br[1]) / 2}
            textAnchor="start"
            dominantBaseline="middle"
          >
            Высота
          </text>
        </g>

        {/*
          Выноски: прямые полки в узлы. «Врезка» на высоте K — без «зю».
        */}
        <g
          stroke="var(--color-steel-200)"
          strokeWidth="1.8"
          fill="none"
          markerEnd={`url(#${tipS})`}
          vectorEffect="non-scaling-stroke"
        >
          {/* Врезка → точка K (основание патрубка), одна горизонталь */}
          <path d={`M${labelStub.collar},${collarK[1]} H${collarK[0]}`} />
          {/* Фильтры: вниз снаружи проёма, горизонталь в первую кассету */}
          <path d={`M${Math.min(labelStub.filters, 155)},260 V278 H208`} />
          {/* Ванночка: полка вдоль низа, вверх к кромке лотка */}
          <path d={`M${labelStub.tray},378 H150 V312`} />
          {supply && <path d="M612,104 H530 V128" />}
          {supply && <path d="M612,348 H430 V302" />}
        </g>
        <g
          fontFamily="var(--font-mono)"
          fontSize="12.5"
          fontWeight="600"
          fill="var(--color-steel-100)"
          stroke="var(--color-sheet)"
          strokeWidth="3.5"
          paintOrder="stroke fill"
        >
          <text x={labelL} y={collarK[1] + 4} textAnchor="start">
            Врезка присоединительная
          </text>
          <text x={labelL} y="252" textAnchor="start">
            Лабиринтные фильтры
          </text>
          <text x={labelL} y="268" textAnchor="start">
            (жироуловители)
          </text>
          <text x={labelL} y="378" textAnchor="start">
            Ванночка
          </text>
          {supply && (
            <text x="636" y="100" textAnchor="end">
              Врезка притока
            </text>
          )}
          {supply && (
            <text x="636" y="344" textAnchor="end">
              Щелевые решётки притока
            </text>
          )}
        </g>
      </svg>

      <figcaption className="hint mt-3" style={{ color: 'var(--color-steel-300)' }}>
        {title}. Схема объясняет названия узлов; пропорции вашего изделия считает конфигуратор,
        размеры — чертёж.
      </figcaption>
    </figure>
  );
}
