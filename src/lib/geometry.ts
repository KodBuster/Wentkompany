/**
 * Компоновка изделия: из габаритов H/W/D считаем размещение узлов.
 * Чистые функции без Three.js — их проверяет `npm run check`,
 * а сцена только рисует то, что здесь посчитано. Все величины в миллиметрах.
 */

import type { Dims, FamilyTraits, DuctPick } from './calc.ts';

/** Конструктивные константы изделия. Уточняются по чертежам производства. */
export const BUILD = {
  /** Завал боковых стенок внутрь кверху, доля от габарита. */
  taper: 0.16,
  /** Максимальный завал на сторону, мм. */
  taperMax: 200,
  /** Высота жиросборного жёлоба по нижней кромке, мм. */
  gutter: 60,
  /** Вылет нижней отбортовки наружу, мм. */
  lip: 25,
  /** Габарит лабиринтной кассеты, мм. */
  filter: { w: 500, h: 400, t: 20 },
  /** Наклон кассет к вертикали, градусов (меньше — меньше прокол обшивки). */
  filterTilt: 12,
  /** Высота патрубка над крышкой, мм. */
  spigot: 300,
  /** Диаметр шпильки подвеса и её длина по умолчанию, мм. */
  hanger: { d: 12, len: 400 },
  /** Светильник: диаметр и глубина посадки, мм. */
  lamp: { d: 90, h: 40 },
  /** Шаг форсунок гидроконтура, мм. */
  nozzleStep: 260,
} as const;

export interface Spigot {
  /** Смещение центра патрубка от центра крышки по длинной стороне, мм. */
  x: number;
  diameter: number;
}

export interface FilterRow {
  /** Сторона, вдоль которой стоит ряд кассет. */
  side: 'front' | 'back' | 'left' | 'right';
  count: number;
  /** Шаг между кассетами, мм. */
  step: number;
  /** Длина ряда, мм. */
  span: number;
}

export interface Layout {
  dims: Dims;
  /** Размер крышки после завала стенок, мм. */
  top: { w: number; d: number };
  taper: number;
  spigots: Spigot[];
  filters: FilterRow[];
  /** Точки подвеса: смещения от центра, мм. */
  hangers: { x: number; z: number }[];
  lamps: { x: number; z: number }[];
  /** Форсунки гидроконтура (только для изделий с гидрозатвором). */
  nozzles: number;
  /** Щель приточной раздачи по фронту, мм. */
  supplySlot: { width: number; height: number } | null;
  gutterHeight: number;
  lip: number;
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Раскладка патрубков по длине крышки: симметрично, с зазором от края. */
export function layoutSpigots(topWidth: number, pick: DuctPick): Spigot[] {
  const count = clamp(pick.count, 1, 4);
  const usable = Math.max(topWidth - pick.diameter - 120, 0);
  return Array.from({ length: count }, (_, i) => ({
    diameter: pick.diameter,
    x: count === 1 ? 0 : -usable / 2 + (usable * i) / (count - 1),
  }));
}

/** Ряды жироулавливающих кассет по открытым сторонам изделия. */
export function layoutFilters(dims: Dims, traits: FamilyTraits): FilterRow[] {
  const { w, d } = dims;
  const sides: FilterRow['side'][] = traits.island
    ? ['front', 'back', 'left', 'right']
    : ['front', 'left', 'right'];

  return sides.map((side) => {
    const span = side === 'front' || side === 'back' ? w : d;
    const count = Math.max(1, Math.floor((span - 100) / BUILD.filter.w));
    return { side, count, step: span / count, span };
  });
}

/** Точки подвеса: четыре по углам крышки с отступом внутрь. */
export function layoutHangers(top: { w: number; d: number }, traits: FamilyTraits) {
  if (!traits.island) return [];
  const ix = top.w / 2 - 80;
  const iz = top.d / 2 - 80;
  return [
    { x: -ix, z: -iz }, { x: ix, z: -iz },
    { x: ix, z: iz }, { x: -ix, z: iz },
  ];
}

/** Светильники в один ряд по длине, шаг ~800 мм. */
export function layoutLamps(dims: Dims, enabled: boolean) {
  if (!enabled) return [];
  const count = clamp(Math.round(dims.w / 800), 1, 6);
  const usable = dims.w - 300;
  return Array.from({ length: count }, (_, i) => ({
    x: count === 1 ? 0 : -usable / 2 + (usable * i) / (count - 1),
    z: 0,
  }));
}

/** Полная компоновка изделия. */
export function buildLayout(
  dims: Dims,
  traits: FamilyTraits,
  pick: DuctPick,
  options: { lamps?: boolean } = {},
): Layout {
  const taper = Math.min(dims.w * BUILD.taper, dims.d * BUILD.taper, BUILD.taperMax);
  const top = {
    w: Math.max(dims.w - taper * 2, 200),
    d: Math.max(dims.d - taper * 2, 200),
  };

  return {
    dims,
    top,
    taper,
    spigots: layoutSpigots(top.w, pick),
    filters: layoutFilters(dims, traits),
    hangers: layoutHangers(top, traits),
    lamps: layoutLamps(dims, !!options.lamps),
    nozzles: traits.hydro ? Math.max(2, Math.round(dims.w / BUILD.nozzleStep)) : 0,
    supplySlot: traits.supply ? { width: dims.w - 200, height: 90 } : null,
    gutterHeight: Math.min(BUILD.gutter, dims.h * 0.25),
    lip: BUILD.lip,
  };
}
