/**
 * Генератор чертежа изделия.
 *
 * Лист и все координаты — в миллиметрах листа, поэтому SVG рендерится
 * один в один (viewBox = размер листа), а из тех же полилиний на этапе 6
 * собирается DXF без повторного пересчёта.
 *
 * Геометрия берётся из той же компоновки, что и 3D-сцена (`geometry.ts`),
 * поэтому чертёж не может разойтись с моделью.
 */

import type { Dims, FamilyTraits, Calculation } from './calc.ts';
import { ru, dec } from './calc.ts';
import { buildLayout, BUILD, supplyType2Chamfer, islandSupplyType2Chamfer, islandSupplyType1Seam, type Layout } from './geometry.ts';

export type Point = [number, number];

export interface Polyline {
  pts: Point[];
  closed?: boolean;
  /** solid — видимый контур, dashed — невидимый/осевой, thin — вспомогательный */
  style?: 'solid' | 'dashed' | 'thin';
}

export interface Circle {
  c: Point;
  r: number;
  style?: 'solid' | 'dashed' | 'thin';
}

export interface Dimension {
  axis: 'h' | 'v';
  /** Границы размера в координатах вида, мм изделия. */
  from: Point;
  to: Point;
  /** Вынос размерной линии от контура, мм листа. */
  offset: number;
  text: string;
}

export interface View {
  key: 'front' | 'side' | 'plan';
  title: string;
  /** Точка привязки на листе (центр вида по X, низ вида по Y), мм листа. */
  origin: Point;
  polys: Polyline[];
  circles: Circle[];
  dims: Dimension[];
}

export interface StampRow {
  label: string;
  value: string;
}

export interface Sheet {
  format: 'A3';
  width: number;
  height: number;
  margin: { left: number; other: number };
  scale: number;
  scaleLabel: string;
  views: View[];
  stamp: StampRow[];
  notes: string[];
  designation: string;
  title: string;
}

/** Ряд масштабов уменьшения по ГОСТ 2.302. */
export const SCALE_SERIES = [1 / 2, 1 / 2.5, 1 / 4, 1 / 5, 1 / 10, 1 / 15, 1 / 20, 1 / 25, 1 / 40, 1 / 50];

export function chooseScale(required: number): number {
  const fit = SCALE_SERIES.find((s) => s <= required);
  return fit ?? SCALE_SERIES[SCALE_SERIES.length - 1];
}

export function scaleLabel(scale: number): string {
  const denominator = 1 / scale;
  const rounded = Math.abs(denominator - Math.round(denominator)) < 0.01
    ? String(Math.round(denominator))
    : dec(denominator, 1);
  return `1:${rounded}`;
}

/** Поля листа A3 и посадочные места видов. */
const A3 = { width: 420, height: 297, left: 20, other: 5 };
const STAMP = { width: 185, height: 55 };

const FIELDS = {
  front: { x: 25, y: 20, w: 190, h: 105 },
  side: { x: 245, y: 20, w: 155, h: 105 },
  plan: { x: 25, y: 145, w: 190, h: 72 },
};

/** Контур корпуса спереди: торцы вертикальные — прямоугольник по W. */
function frontOutline(layout: Layout): Polyline[] {
  const { dims, gutterHeight, lip } = layout;
  const hw = dims.w / 2;
  const h = dims.h;

  return [
    { pts: [[-hw, 0], [hw, 0], [hw, h], [-hw, h]], closed: true, style: 'solid' },
    // отбортовка по нижней кромке
    { pts: [[-hw - lip, 0], [hw + lip, 0]], style: 'solid' },
    { pts: [[-hw - lip, 0], [-hw - lip, 12]], style: 'solid' },
    { pts: [[hw + lip, 0], [hw + lip, 12]], style: 'solid' },
    // верхняя кромка жёлоба — невидимая линия
    { pts: [[-hw + 40, gutterHeight], [hw - 40, gutterHeight]], style: 'dashed' },
    // крышка-фланец
    { pts: [[-hw, h], [hw, h], [hw, h + 8], [-hw, h + 8]], closed: true, style: 'solid' },
  ];
}

/**
 * Контур сбоку по типу:
 * ТИП 1 — верх полный, скос низа вверх; ТИП 2 — низ полный, скос сверху; ТИП 3 — прямоугольник.
 */
function sideOutline(layout: Layout): Polyline[] {
  const { dims, top, bottom, gutterHeight, supplyPlenum, bottomRise, profile } = layout;
  const hd = dims.d / 2;
  const h = dims.h;

  if (supplyPlenum) {
    const island = layout.filters.some((f) => f.kind === 'front' || f.kind === 'back');
    const yR = supplyPlenum.frontRise;
    const zP = hd - supplyPlenum.depth;
    const type2 = profile === 'trapezoid';
    const type1 = profile === 'triangle';
    const ch = type2
      ? (island
          ? islandSupplyType2Chamfer(dims.h, dims.d, supplyPlenum.depth)
          : supplyType2Chamfer(dims.h, dims.d, supplyPlenum.depth))
      : null;
    const chamferMm = ch?.chamferZ ?? 0;

    if (island) {
      /* ЗПВО: симметричный контур + два шва */
      let outline: [number, number][];
      const seam1 = islandSupplyType1Seam(dims.h, dims.d, supplyPlenum.depth);
      if (type2 && ch) {
        outline = [
          [-hd, 0],
          [hd, 0],
          [hd, ch.vertDy],
          [hd - chamferMm, h],
          [-hd + chamferMm, h],
          [-hd, ch.vertDy],
        ];
      } else if (type1) {
        /* Полный контур боковины-монодетали */
        outline = [
          [-seam1.zBot, seam1.yB],
          [-seam1.zSeam, seam1.ySeam],
          [-hd, seam1.ySeam],
          [-hd, h],
          [hd, h],
          [hd, seam1.ySeam],
          [seam1.zSeam, seam1.ySeam],
          [seam1.zBot, seam1.yB],
        ];
      } else {
        outline = [
          [-hd, 0],
          [hd, 0],
          [hd, h],
          [-hd, h],
        ];
      }
      return [
        { pts: outline, closed: true, style: 'solid' },
        { pts: [[zP, 0], [zP, h]], style: 'dashed' },
        { pts: [[-zP, 0], [-zP, h]], style: 'dashed' },
        {
          pts: [
            [type2 ? -hd + chamferMm : -hd, h],
            [type2 ? hd - chamferMm : hd, h],
            [type2 ? hd - chamferMm : hd, h + 8],
            [type2 ? -hd + chamferMm : -hd, h + 8],
          ],
          closed: true,
          style: 'solid',
        },
      ];
    }

    let outline: [number, number][];
    if (type2 && ch) {
      /* Зелёный профиль: низ прямой, вертикаль + скос // фильтру */
      outline = [
        [-hd, 0],
        [hd, 0],
        [hd, ch.vertDy],
        [hd - chamferMm, h],
        [-hd, h],
      ];
    } else if (yR < 1) {
      outline = [
        [-hd, 0],
        [hd, 0],
        [hd, h],
        [-hd, h],
      ];
    } else {
      outline = [
        [-hd, 0],
        [hd, yR],
        [hd, h],
        [-hd, h],
      ];
    }

    /* Шов камеры ③: глубина const; ТИП 2 — // скосу, иначе вертикаль */
    let seamPts: [number, number][];
    if (type2 && ch) {
      const zBot = hd - supplyPlenum.depth;
      const zTop = hd - chamferMm - supplyPlenum.depth;
      seamPts = [
        [zBot, 0],
        [zTop, h],
      ];
    } else {
      const ySeam0 = yR < 1 ? 0 : (yR * (zP + hd)) / (2 * hd);
      seamPts = [
        [zP, ySeam0],
        [zP, h],
      ];
    }

    return [
      { pts: outline, closed: true, style: 'solid' },
      { pts: seamPts, style: 'dashed' },
      { pts: [[-hd, h], [hd - chamferMm, h]], style: 'thin' },
      {
        pts: [
          [-hd, h],
          [hd - chamferMm, h],
          [hd - chamferMm, h + 8],
          [-hd, h + 8],
        ],
        closed: true,
        style: 'solid',
      },
    ];
  }

  if (profile === 'triangle' && bottomRise > 0) {
    const yR = bottomRise;
    const island = layout.filters.some((f) => f.kind === 'front' || f.kind === 'back');
    if (island) {
      /* ЗВО ТИП 1: скос снизу к обоим торцам */
      return [
        {
          pts: [
            [-hd, yR],
            [0, 0],
            [hd, yR],
            [hd, h],
            [-hd, h],
          ],
          closed: true,
          style: 'solid',
        },
        { pts: [[-40, gutterHeight], [40, gutterHeight]], style: 'dashed' },
        {
          pts: [
            [-hd, h],
            [hd, h],
            [hd, h + 8],
            [-hd, h + 8],
          ],
          closed: true,
          style: 'solid',
        },
      ];
    }
    return [
      {
        pts: [
          [-hd, 0],
          [hd, yR],
          [hd, h],
          [-hd, h],
        ],
        closed: true,
        style: 'solid',
      },
      { pts: [[-hd + 40, Math.min(gutterHeight, yR * 0.3)], [hd - 40, yR * 0.85]], style: 'dashed' },
      {
        pts: [
          [-hd, h],
          [hd, h],
          [hd, h + 8],
          [-hd, h + 8],
        ],
        closed: true,
        style: 'solid',
      },
    ];
  }

  const zBotB = bottom.z - bottom.d / 2;
  const zBotF = bottom.z + bottom.d / 2;
  const zTopB = top.z - top.d / 2;
  const zTopF = top.z + top.d / 2;

  return [
    {
      pts: [
        [zBotB, 0],
        [zBotF, 0],
        [zTopF, h],
        [zTopB, h],
      ],
      closed: true,
      style: 'solid',
    },
    { pts: [[zBotB + 40, gutterHeight], [zBotF - 40, gutterHeight]], style: 'dashed' },
    {
      pts: [
        [zTopB, h],
        [zTopF, h],
        [zTopF, h + 8],
        [zTopB, h + 8],
      ],
      closed: true,
      style: 'solid',
    },
  ];
}

/** Патрубки в виде спереди и сбоку. */
function spigotsFront(layout: Layout): Polyline[] {
  const h = layout.dims.h + 8;
  return layout.spigots.map((s) => ({
    pts: [
      [s.x - s.diameter / 2, h],
      [s.x - s.diameter / 2, h + BUILD.spigot],
      [s.x + s.diameter / 2, h + BUILD.spigot],
      [s.x + s.diameter / 2, h],
    ] as Point[],
    style: 'solid' as const,
  }));
}

/** План: габарит, контур крышки, патрубки, точки подвеса, оси. */
function planGeometry(layout: Layout, traits: FamilyTraits) {
  const { dims, top, spigots, hangers } = layout;
  const hw = dims.w / 2;
  const hd = dims.d / 2;

  const polys: Polyline[] = [
    { pts: [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]], closed: true, style: 'solid' },
    {
      pts: [
        [-top.w / 2, top.z - top.d / 2],
        [top.w / 2, top.z - top.d / 2],
        [top.w / 2, top.z + top.d / 2],
        [-top.w / 2, top.z + top.d / 2],
      ],
      closed: true,
      style: 'dashed',
    },
    // осевые линии
    { pts: [[-hw - 15, 0], [hw + 15, 0]], style: 'thin' },
    { pts: [[0, -hd - 15], [0, hd + 15]], style: 'thin' },
  ];

  if (!traits.island) {
    // пристенное исполнение: стена по задней стороне
    polys.push({ pts: [[-hw - 30, -hd], [hw + 30, -hd]], style: 'solid' });
    polys.push({ pts: [[-hw - 30, -hd - 10], [hw + 30, -hd - 10]], style: 'thin' });
  }

  const circles: Circle[] = spigots.map((s) => ({ c: [s.x, top.z + s.z] as Point, r: s.diameter / 2 }));
  for (const h of hangers) {
    circles.push({ c: [h.x, h.z] as Point, r: 14, style: 'thin' });
  }

  return { polys, circles };
}

export interface DrawingInput {
  dims: Dims;
  traits: FamilyTraits;
  calc: Calculation;
  article: string;
  productName: string;
  material: '430' | '304';
  lamps?: boolean;
  /** Подпись типа из каталога — профиль сечения на чертеже. */
  typeLabel?: string | null;
}

export function buildSheet(input: DrawingInput): Sheet {
  const { dims, traits, calc, article, productName, material } = input;
  const layout = buildLayout(dims, traits, calc.ducts, { lamps: input.lamps, typeLabel: input.typeLabel });

  const totalFrontHeight = dims.h + BUILD.spigot + 8;
  const required = Math.min(
    FIELDS.front.w / (dims.w + layout.lip * 2 + 60),
    FIELDS.front.h / (totalFrontHeight + 30),
    FIELDS.side.w / (dims.d + 60),
    FIELDS.side.h / (totalFrontHeight + 30),
    FIELDS.plan.w / (dims.w + 60),
    FIELDS.plan.h / (dims.d + 40),
  );
  const scale = chooseScale(required);

  const front: View = {
    key: 'front',
    title: 'Вид спереди',
    origin: [FIELDS.front.x + FIELDS.front.w / 2, FIELDS.front.y + FIELDS.front.h - 18],
    polys: [...frontOutline(layout), ...spigotsFront(layout)],
    circles: [],
    dims: [
      { axis: 'h', from: [-dims.w / 2, 0], to: [dims.w / 2, 0], offset: 12, text: String(dims.w) },
      { axis: 'v', from: [dims.w / 2, 0], to: [dims.w / 2, dims.h], offset: 14, text: String(dims.h) },
    ],
  };

  const side: View = {
    key: 'side',
    title: 'Вид сбоку',
    origin: [FIELDS.side.x + FIELDS.side.w / 2, FIELDS.side.y + FIELDS.side.h - 18],
    polys: sideOutline(layout),
    circles: [],
    dims: [{ axis: 'h', from: [-dims.d / 2, 0], to: [dims.d / 2, 0], offset: 12, text: String(dims.d) }],
  };

  const planGeo = planGeometry(layout, traits);
  const planDims: Dimension[] = [
    { axis: 'h', from: [-dims.w / 2, -dims.d / 2], to: [dims.w / 2, -dims.d / 2], offset: 12, text: String(dims.w) },
    { axis: 'v', from: [dims.w / 2, -dims.d / 2], to: [dims.w / 2, dims.d / 2], offset: 12, text: String(dims.d) },
  ];
  if (layout.spigots.length > 1) {
    const first = layout.spigots[0];
    const last = layout.spigots[layout.spigots.length - 1];
    planDims.push({
      axis: 'h',
      from: [first.x, dims.d / 2],
      to: [last.x, dims.d / 2],
      offset: 10,
      text: `${ru(Math.abs(last.x - first.x))}`,
    });
  }

  const plan: View = {
    key: 'plan',
    title: 'План',
    origin: [FIELDS.plan.x + FIELDS.plan.w / 2, FIELDS.plan.y + FIELDS.plan.h / 2],
    polys: planGeo.polys,
    circles: planGeo.circles,
    dims: planDims,
  };

  const designation = `ВК.${article}.${dims.h}-${dims.w}-${dims.d}`;

  const notes = [
    `1. Расход воздуха расчётный ${ru(calc.airflow)} м³/ч.`,
    `2. Патрубки ${calc.ducts.count} × Ø${calc.ducts.diameter}, скорость ${dec(calc.ducts.velocity)} м/с.`,
    `3. Сталь AISI ${material}, сварка инверторная аргонодуговая.`,
    `4. Жироуловители лабиринтные съёмные — ${layout.filters.reduce((s, r) => s + r.count, 0)} шт.`,
    ...(traits.hydro ? ['5. Гидрозатвор: обвязка и автоматика по п. 5.30 СП 7.13130.'] : []),
    `${traits.hydro ? 6 : 5}. Размеры для справок, чертёж предварительный.`,
  ];

  const stamp: StampRow[] = [
    { label: 'Наименование', value: productName },
    { label: 'Обозначение', value: designation },
    { label: 'Материал', value: `Сталь AISI ${material}` },
    { label: 'Масса, кг', value: ru(calc.mass) },
    { label: 'Масштаб', value: scaleLabel(scale) },
    { label: 'Лист', value: '1 из 1' },
    { label: 'Организация', value: 'WENTKOMPANY' },
    { label: 'Статус', value: 'Предварительно' },
  ];

  return {
    format: 'A3',
    width: A3.width,
    height: A3.height,
    margin: { left: A3.left, other: A3.other },
    scale,
    scaleLabel: scaleLabel(scale),
    views: [front, side, plan],
    stamp,
    notes,
    designation,
    title: productName,
  };
}

export const STAMP_BOX = STAMP;
export const SHEET_FIELDS = FIELDS;

/** Перевод точки вида в координаты листа: масштаб + инверсия оси Y. */
export function toSheet(view: View, p: Point, scale: number): Point {
  return [view.origin[0] + p[0] * scale, view.origin[1] - p[1] * scale];
}
