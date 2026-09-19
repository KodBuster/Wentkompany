/**
 * Компоновка изделия: из габаритов H/W/D считаем размещение узлов.
 * Чистые функции без Three.js — их проверяет `npm run check`,
 * а сцена только рисует то, что здесь посчитано. Все величины в миллиметрах.
 */

import type { Dims, FamilyTraits, DuctPick } from './calc.ts';

/** Конструктивные константы изделия. Уточняются по чертежам производства. */
export const BUILD = {
  /**
   * Завал фронта внутрь кверху (доля от глубины).
   * Умеренный — чтобы статичное ядро V+ванночка влезало при типичном вылете ≥600.
   */
  taper: 0.18,
  /** Максимальный завал фронта (и тыла у острова) на сторону, мм. */
  taperMax: 160,
  /** Высота жиросборного жёлоба по нижней кромке, мм. */
  gutter: 60,
  /** Вылет нижней отбортовки наружу, мм. */
  lip: 12,
  /**
   * Ядро «ванночка + жироуловители» — статичный бак и V над ним (каталог).
   * Вылет (D) растёт → больше воздуха вокруг ядра; при малом D кассеты чуть поджимаются.
   */
  core: {
    /** Угол кассеты к вертикали, °. */
    tilt: 38,
    /** Номинальная высота кассеты, мм (не растёт с вылетом). */
    filterH: 280,
    /** Толщина кассеты, мм. */
    filterT: 40,
    /** Ширина одной кассеты вдоль ряда, мм. */
    filterW: 500,
    /** Полузазор между низами рядов у ванночки, мм. */
    vGap: 28,
    /** Глубина ванночки по D, мм — статичный бак. */
    trayD: 70,
    /** Высота ванночки, мм. */
    trayH: 26,
  },
  /** Габарит лабиринтной кассеты (алиас ядра — для чертежа/IFC). */
  filter: { w: 500, h: 280, t: 40 },
  /** Угол кассеты (алиас ядра). */
  filterTilt: 38,
  /** Отступ верха кассеты от обшивки при поджиме, мм. */
  filterClearance: 40,
  /** Глубина приточной камеры спереди, мм (ЗПВП/ЗПВО) — отдельный объём. */
  supplyPlenumDepth: 160,
  /** Решётки притока на рамке камеры (панели с ламелями, не «щели-бруски»). */
  supplySlot: {
    /** Ширина одной панели на фронте, мм. */
    panelW: 140,
    /** Высота фронтальной панели, мм. */
    panelH: 70,
    /** Число панелей на фронте (в ряд). */
    frontCount: 3,
    /** Зазор между панелями, мм. */
    gap: 18,
    /** Высота боковой панели, мм. */
    sideH: 95,
    /** Число боковых панелей столбиком. */
    sideCount: 2,
    /** Число ламелей в панели. */
    louvers: 7,
    /** Толщина решётки наружу, мм. */
    t: 8,
  },
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
  /** Смещение по глубине крышки (локальный Z), мм. Вытяжка назад, приток вперёд. */
  z: number;
  diameter: number;
  /** Вытяжка или врезка притока (ЗПВП/ЗПВО). */
  role: 'exhaust' | 'supply';
}

export interface FilterRow {
  /**
   * Раскладка по схемам каталога:
   * rear — пристенный (один ряд у задней стенки);
   * front/back — островной V (два ряда к центру).
   */
  kind: 'rear' | 'front' | 'back';
  count: number;
  /** Шаг между кассетами, мм. */
  step: number;
  /** Длина ряда, мм. */
  span: number;
}

export interface Layout {
  dims: Dims;
  /**
   * Крышка: w×d и смещение центра по Z (к стене у пристенных).
   * Торцы по W без завала — top.w = dims.w; завал только по глубине.
   */
  top: { w: number; d: number; z: number };
  /** Нижний проём (может быть короче крышки у ТИП 2 — нет; у ТИП 1 план полный). */
  bottom: { w: number; d: number; z: number };
  /**
   * Величина скоса по глубине, мм (ТИП 2 — сверху; ТИП 1 — 0 в плане, скос через bottomRise).
   */
  taper: number;
  /**
   * ТИП 1: подъём передней кромки скошенного низа, мм (зад y=0 → фронт y=bottomRise).
   * У ТИП 2/3 = 0.
   */
  bottomRise: number;
  /**
   * Профиль корпуса по типу конструкции:
   * triangle (ТИП 1) — верх прямой, скос снизу вверх к фронту;
   * trapezoid (ТИП 2) — низ прямой, скос сверху вниз;
   * rect (ТИП 3) — прямоугольник.
   */
  profile: 'triangle' | 'trapezoid' | 'rect';
  spigots: Spigot[];
  filters: FilterRow[];
  hangers: { x: number; z: number }[];
  lamps: { x: number; z: number }[];
  nozzles: number;
  supplySlot: {
    frontCount: number;
    sideCount: number;
    faces: 'front' | 'both';
  } | null;
  supplyPlenum: { depth: number; frontRise: number } | null;
  gutterHeight: number;
  lip: number;
}

/** Номер типа из подписи «ТИП 1» → профиль сечения. */
export function hoodProfileOf(typeLabel: string | null | undefined): Layout['profile'] {
  const n = typeLabel?.match(/(\d)/)?.[1];
  if (n === '1') return 'triangle';
  if (n === '3') return 'rect';
  return 'trapezoid';
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Высота низа у притока: ТИП 1 — скос низа; ТИП 2/3 — низ прямой (углы 90°). */
function supplyFrontRise(profile: Layout['profile'], height: number) {
  if (profile === 'triangle') return Math.round(height * 0.52);
  return 0;
}

/**
 * ТИП 2 ЗПВП: длинный верхний скос, короткая вертикаль снизу.
 * Вылет скоса ограничен — на плоской крыше должен целиком влезать приточный патрубок.
 */
export function supplyType2Chamfer(h: number, d: number, plenumDepth: number) {
  const frontH = Math.max(h, 80);
  const vertDy = Math.max(Math.round(frontH * 0.16), 36);
  const slantDy = frontH - vertDy;

  const supplyDia = Math.min(95, Math.max(80, plenumDepth - 70));
  /* Плоская крыша ≥ Ø патрубка + зазоры до шва и до кромки скоса */
  const needFlat = supplyDia + 72;
  const maxChamfer = Math.max(
    36,
    Math.min(plenumDepth * 0.38, d * 0.11, d / 2 - needFlat / 2, 64),
  );

  const tilt = (BUILD.filterTilt * Math.PI) / 180;
  const chamferZ = Math.min(Math.tan(tilt) * slantDy, maxChamfer);

  return { chamferZ, slantDy, vertDy };
}
/**
 * Завалы по глубине для типов ЗВП/ЗВО (не приток).
 * ТИП 1 — план полный, скос низа задаётся bottomRise в buildLayout;
 * ТИП 2 — скос сверху (короткая крышка); ТИП 3 — прямоугольник.
 */
function taperForProfile(
  profile: Layout['profile'],
  dims: Dims,
  island: boolean,
  supply: boolean,
) {
  const empty = { topFront: 0, topBack: 0, bottomFront: 0, bottomBack: 0 };
  if (supply) return empty;
  if (profile === 'rect' || profile === 'triangle') return empty;

  /* ТИП 2: низ прямой, верх со скосом вниз — плоский верх только над врезкой */
  const minFlat = Math.max(200, Math.round(dims.d * 0.34));
  const tMax = Math.max(0, dims.d - minFlat);
  const byDeg = (deg: number) =>
    Math.min(Math.round(dims.h * Math.tan((deg * Math.PI) / 180)), tMax);
  const t = Math.min(Math.max(byDeg(28), Math.round(dims.d * 0.4)), tMax);
  if (island) {
    const each = Math.min(Math.round(t * 0.5), Math.floor(tMax / 2));
    return { topFront: each, topBack: each, bottomFront: 0, bottomBack: 0 };
  }
  return {
    topFront: t,
    topBack: 0,
    bottomFront: 0,
    bottomBack: 0,
  };
}

/** Раскладка вытяжных патрубков: диаметр не больше глубины крышки (Φ ≤ L). */
export function layoutSpigots(
  topWidth: number,
  topDepth: number,
  pick: DuctPick,
  opts: { island?: boolean } = {},
): Spigot[] {
  const count = clamp(pick.count, 1, 4);
  const edge = 14;
  /*
   * На схемотехнике врезка не больше половины крыши — иначе «съедает» весь верх
   * и визуально сидит по центру короба. Расчётный Ø из pick сохраняем как потолок.
   */
  const diameter = Math.min(
    pick.diameter,
    Math.max(120, topDepth - 2 * edge - 20),
    Math.round(topDepth * 0.48),
  );
  const usable = Math.max(topWidth - diameter - 120, 0);
  /* Пристенный: у тыла крыши, чуть внутри. Остров: центр. */
  const z = opts.island
    ? 0
    : clamp(-topDepth / 2 + diameter / 2 + edge, -topDepth / 2 + edge, 0);
  return Array.from({ length: count }, (_, i) => ({
    diameter,
    x: count === 1 ? 0 : -usable / 2 + (usable * i) / (count - 1),
    z,
    role: 'exhaust' as const,
  }));
}

/**
 * Вытяжка + приток на крышке.
 * Вытяжка — над фильтрами (назад); приток — по центру между швом и передним краем/скосом.
 */
export function withSupplySpigot(
  spigots: Spigot[],
  top: { w: number; d: number },
  plenumDepth: number,
  opts?: { profile?: Layout['profile']; h?: number; frontRise?: number },
): Spigot[] {
  const edge = 40;
  const gapZ = 28;
  const half = top.d / 2;
  const exhaustDepth = Math.max(top.d - plenumDepth, 160);
  /* Вытяжка не шире своей камеры и не шире крышки */
  const exhaustMax = Math.min(
    Math.max(120, exhaustDepth - 100),
    Math.max(120, top.w - 2 * edge),
  );

  const n = spigots.length;
  const supplyDia = Math.min(95, Math.max(80, plenumDepth - 70));

  /* Верх шва и перед плоской крыши — приток у переднего фронта */
  const zF = half;
  const zP = zF - plenumDepth;
  let zSeamTop: number;
  let zFlatFront = zF;
  if (opts?.profile === 'trapezoid') {
    const ch = supplyType2Chamfer(opts.h ?? 350, top.d, plenumDepth);
    zFlatFront = zF - ch.chamferZ;
    const gap = Math.min(plenumDepth * 0.72, 100);
    zSeamTop = zFlatFront - gap;
  } else {
    const seamDz = Math.min(plenumDepth * 0.45, 100);
    zSeamTop = zP - seamDz * 0.55;
  }
  /* Патрубок на плоскости между швом и скосом */
  const zSup = clamp(
    (zSeamTop + zFlatFront) / 2,
    zSeamTop + supplyDia / 2 + 8,
    zFlatFront - supplyDia / 2 - 8,
  );

  /* Вытяжка — у тыла, но не вплотную к стенке */
  const rearClear = 56;
  const zExLimit = half - plenumDepth - gapZ;

  if (n === 1) {
    const dia = Math.min(spigots[0].diameter, exhaustMax);
    const zEx = clamp(-half + dia / 2 + rearClear, -half + rearClear, zExLimit - dia / 2);
    return [
      { x: 0, z: zEx, diameter: dia, role: 'exhaust' },
      { x: 0, z: zSup, diameter: Math.min(supplyDia, dia), role: 'supply' },
    ];
  }

  const dia = Math.min(Math.max(...spigots.map((s) => s.diameter)), exhaustMax);
  const zEx = clamp(-half + dia / 2 + rearClear, -half + rearClear, zExLimit - dia / 2);
  const usable = Math.max(top.w - dia - 2 * edge, 0);
  const exhaust = spigots.map((s, i) => ({
    x: -usable / 2 + (usable * i) / (n - 1),
    z: zEx,
    diameter: Math.min(s.diameter, dia),
    role: 'exhaust' as const,
  }));
  return [...exhaust, { x: 0, z: zSup, diameter: supplyDia, role: 'supply' }];
}

/**
 * Ряды жироулавливающих кассет.
 * Не по периметру обшивки, а внутри купола — как на схемах ЗВП/ЗВО.
 */
export function layoutFilters(dims: Dims, traits: FamilyTraits): FilterRow[] {
  const span = Math.max(dims.w - 120, BUILD.filter.w);
  const count = Math.max(1, Math.floor(span / BUILD.filter.w));
  const step = span / count;
  if (traits.island) {
    return [
      { kind: 'front', count, step, span },
      { kind: 'back', count, step, span },
    ];
  }
  return [{ kind: 'rear', count, step, span }];
}

/**
 * Щели/панели притока: число по ширине (как кассеты), боковые — для острова.
 */
export function layoutSupplySlot(
  dims: Dims,
  traits: FamilyTraits,
): Layout['supplySlot'] {
  if (!traits.supply) return null;
  const { panelW, gap, frontCount: minN, sideCount } = BUILD.supplySlot;
  const usable = Math.max(dims.w - 80, panelW);
  const frontCount = Math.max(minN, Math.floor((usable + gap) / (panelW + gap)));
  return {
    frontCount,
    sideCount: traits.island ? sideCount : 0,
    faces: traits.island ? 'both' : 'front',
  };
}

/** Точки подвеса: углы крышки, вне зоны патрубков. */
export function layoutHangers(
  top: { w: number; d: number; z: number },
  traits: FamilyTraits,
  spigots: Spigot[] = [],
) {
  if (!traits.island) return [];
  const ix = top.w / 2 - 50;
  const iz = Math.max(top.d / 2 - 40, 28);
  const pts = [
    { x: -ix, z: top.z - iz },
    { x: ix, z: top.z - iz },
    { x: ix, z: top.z + iz },
    { x: -ix, z: top.z + iz },
  ];

  const xMin = -top.w / 2 + 30;
  const xMax = top.w / 2 - 30;
  const zMin = top.z - top.d / 2 + 25;
  const zMax = top.z + top.d / 2 - 25;

  return pts.map((p) => {
    let { x, z } = p;
    for (const s of spigots) {
      /* Мировая Z патрубка = центр крышки + локальный z */
      const sz = top.z + s.z;
      const need = s.diameter / 2 + 45;
      const dx = x - s.x;
      const dz = z - sz;
      const dist = Math.hypot(dx, dz);
      if (dist < need) {
        if (dist < 1e-3) {
          /* Центр совпал — уводим к ближнему углу крышки */
          x = x < 0 ? xMin : xMax;
          z = z < top.z ? zMin : zMax;
        } else {
          const k = need / dist;
          x = s.x + dx * k;
          z = sz + dz * k;
        }
        x = clamp(x, xMin, xMax);
        z = clamp(z, zMin, zMax);
      }
    }
    return { x, z };
  });
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
  options: { lamps?: boolean; typeLabel?: string | null } = {},
): Layout {
  const profile = hoodProfileOf(options.typeLabel);
  const insets = taperForProfile(profile, dims, traits.island, traits.supply);
  const top = {
    w: dims.w,
    d: Math.max(dims.d - insets.topFront - insets.topBack, 160),
    z: (insets.topBack - insets.topFront) / 2,
  };
  const bottom = {
    w: dims.w,
    d: Math.max(dims.d - insets.bottomFront - insets.bottomBack, 160),
    z: (insets.bottomBack - insets.bottomFront) / 2,
  };
  /* ТИП 1: скос низа вверх к фронту (план полный) */
  const bottomRise =
    profile === 'triangle' && !traits.supply
      ? Math.min(Math.round(dims.h * 0.34), dims.h - 80)
      : 0;
  const taper = insets.topFront + insets.bottomFront + bottomRise;

  const plenumDepth = traits.supply
    ? Math.min(BUILD.supplyPlenumDepth, Math.max(100, dims.d * 0.28))
    : 0;
  const frontRise = traits.supply
    ? Math.min(supplyFrontRise(profile, dims.h), dims.h - BUILD.gutter - 80)
    : 0;

  const spigots0 = layoutSpigots(top.w, top.d, pick, { island: traits.island });
  const spigots = traits.supply
    ? withSupplySpigot(spigots0, top, plenumDepth, { profile, h: dims.h, frontRise })
    : spigots0;

  return {
    dims,
    top,
    bottom,
    taper,
    bottomRise,
    profile,
    spigots,
    filters: layoutFilters(dims, traits),
    hangers: layoutHangers(top, traits, spigots),
    lamps: layoutLamps(dims, !!options.lamps),
    nozzles: traits.hydro ? Math.max(2, Math.round(dims.w / BUILD.nozzleStep)) : 0,
    supplySlot: layoutSupplySlot(dims, traits),
    supplyPlenum: traits.supply ? { depth: plenumDepth, frontRise } : null,
    gutterHeight: Math.min(BUILD.gutter, dims.h * 0.25),
    lip: BUILD.lip,
  };
}
