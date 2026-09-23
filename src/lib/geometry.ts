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
    /** Зазор ряда/ванночки от боковины корпуса по W, мм (почти встык). */
    sideClear: 2,
  },
  /** Габарит лабиринтной кассеты (алиас ядра — для чертежа/IFC). */
  filter: { w: 500, h: 280, t: 40 },
  /** Угол кассеты (алиас ядра). */
  filterTilt: 38,
  /** Отступ верха кассеты от обшивки при поджиме, мм. */
  filterClearance: 40,
  /**
   * Вытяжная камера ① (ЗПВП) — ядро у задника, не тянется за вылетом D.
   * Зона ② (свободный захват) растёт между жировиком и перегородкой притока.
   */
  exhaustChamber: {
    /** Отступ задняя плоскость → стенка Ø вытяжного патрубка, мм */
    rearClear: 56,
    /** Зазор Ø вытяжки → верх кассеты (P), мм */
    pMin: 22,
    /** Зазор верх кассеты → перегородка притока, мм */
    bridge: 52,
    /** Зазор ванночки от задней стенки, мм */
    wallGap: 22,
  },
  /**
   * Приточная камера ③ (ЗПВП) — фурнитура, не тянется за габаритом заказа.
   * depth = dia + 2×edge: край → зазор → Ø → такой же зазор → перегородка.
   */
  supplyChamber: {
    /** Глубина короба: передняя плоскость → перегородка, мм (ТИП 1/3) */
    depth: 160,
    /**
     * ТИП 2: чуть мельче ТИП 1/3 — больше зона ②.
     * Не меньше dia + 2×edgeMin, иначе патрубок наезжает на шов.
     */
    /**
     * ТИП 2: глубина камеры ③, мм.
     * Меньше → перегородка ближе к фронту → больше свободная зона ② (горячий воздух).
     */
    /**
     * ТИП 2: глубина камеры ③, мм.
     * Меньше → больше зона ②; минимум ≈ Ø + 2×зазор, иначе ломается крыша.
     */
    /**
     * ТИП 2: глубина камеры ③, мм.
     * Чуть меньше ТИП 1/3 (160) → больше зона ②; не жать — иначе патрубки сходятся и жировик уезжает.
     */
    depthType2: 125,
    /** ТИП 2: высота нижнего вертикального бортика, мм — const (часть камеры ③) */
    type2VertDy: 84,
    /** Отступ от переднего края крыши до стенки патрубка (и такой же до шва), мм */
    edge: 35,
    /** Ø приточного патрубка (пока const; таблица по расходу — позже) */
    dia: 90,
  },
  /** Глубина камеры ③, мм (= supplyChamber.depth). */
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
  /** Высота выпускного патрубка (шейка/врезка) над крышкой, мм — 50…100 по каталогу. */
  spigot: 100,
  /** Диаметр шпильки подвеса и её длина над крышкой, мм (чуть выше шейки). */
  hanger: { d: 12, len: 160 },
  /** Светильник: диаметр и глубина посадки, мм. */
  lamp: { d: 90, h: 40 },
  /** Шаг форсунок гидроконтура, мм. */
  nozzleStep: 260,
  /** Подвод воды на крышке (ЗВПГ/ЗВОГ): Ø и высота — const. */
  hydroInlet: { d: 28, h: 55 },
  /** Слив с ванночки (ЗВПГ/ЗВОГ): компактный Ø, длина внутрь, отступ от левого края ванны. */
  hydroDrain: { d: 18, len: 36, edge: 10 },
  /**
   * ЗПВО: фиксированные узлы (не от габарита заказа).
   * Корыто (вылет) растёт в зоне «моста» между коробом и жироуловителем.
   */
  zpvo: {
    /** Глубина приточного короба с каждой стороны, мм — константа. */
    plenumDepth: 95,
    /** Мин. зазор по D: внутренняя стенка короба → верх кассеты. */
    minBridge: 55,
    /**
     * ТИП 1: высота приточного короба (крыша → нижняя горизонтальная плоскость), мм.
     */
    type1PlenumH: 100,
    /**
     * ТИП 2: угол скоса «абажура» к вертикали, ° — const (не от D).
     */
    type2AlphaDeg: 30,
    /** ТИП 2: высота нижней вертикали (передний бортик), мм — const. */
    type2VertDy: 84,
    /**
     * ТИП 2: глубина приточной полости (нормаль к обшивке), мм — const.
     * Узкая полость: низ перегородки почти у внешней стенки, стенки // скосу.
     */
    type2PlenumDepth: 48,
    /** ТИП 2: поле от ребра крыши до наружного края врезки притока, мм — const. */
    type2EdgeConst: 16,
    /**
     * N / P со схемы ЗПВО (общие для типов): const, не от D.
     * N — верх жироуловителя → внутренний край врезки притока (на D=600 читается).
     * P — край вытяжки → верх жироуловителя (склейка верхов).
     */
    type2NMin: 45,
    type2PMin: 22,
    /** ТИП 2: Ø вытяжки для отображения — const. */
    type2DisplayExhaust: 120,
    /** ТИП 2: Ø притока для отображения, мм (≤ полости − зазоры). */
    type2DisplaySupply: 36,
    /** ТИП 2: мост шов → верх кассеты, мм (меньше — читаемее N на мин. D). */
    type2Bridge: 30,
    /**
     * ТИП 3 (прямоугольник): Ø вытяжки для отображения — const.
     * Иначе расчётный Ø на мин. D заезжает на шов/приклейку.
     */
    type3DisplayExhaust: 120,
    /** ТИП 3: Ø притока для отображения, мм. */
    type3DisplaySupply: 55,
    /** ТИП 3: мост шов → верх кассеты, мм (N/P — type2NMin / type2PMin). */
    type3Bridge: 40,
  },
} as const;

/** Низ приточного короба ТИП 1 (мм по Y): горизонтальная плоскость с решётками. */
export function islandSupplyType1FloorY(h: number) {
  return Math.max(h - BUILD.zpvo.type1PlenumH, Math.round(h * 0.62));
}

/**
 * Шов А («фиолетовая точка» на макете): пересечение лица-скоса с перегородкой.
 * Меняется с H/D — не жёсткая константа. Пол короба (К) и низ перегородки = ySeam.
 */
export function islandSupplyType1Seam(h: number, d: number, plenumDepth: number) {
  const zSeam = d / 2 - plenumDepth;
  const yFloorMax = islandSupplyType1FloorY(h);
  const yB = 2 + Math.min(BUILD.core.trayH, 22) + 1;
  const zBot = BUILD.core.vGap;
  const tilt = (BUILD.core.tilt * Math.PI) / 180;
  /* Y, где скос с углом кассеты от зоны ванночки пересекает плоскость перегородки */
  const yFromTilt = yB + (zSeam - zBot) / Math.tan(tilt);
  const ySeam = Math.max(yB + 50, Math.min(yFromTilt, yFloorMax, h - 36));
  return { ySeam, zSeam, yB, zBot };
}

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

/** Высота низа у притока: ТИП 1 — как у ЗВП (L=¼V); ТИП 2/3 — низ прямой. */
function supplyFrontRise(profile: Layout['profile'], height: number) {
  if (profile === 'triangle') {
    return Math.min(
      Math.round(height * 0.75),
      height - Math.max(80, Math.round(height / 4)),
    );
  }
  return 0;
}

/**
 * ТИП 2 ЗПВП = ЗВП + камера ③.
 * Наружный бортик/угол как у ЗВП; плоская крыша длиннее на мост + ③ (const).
 * С ростом D растёт только скос (зона ②).
 */
export function supplyType2Chamfer(h: number, d: number, plenumDepth: number) {
  const base = wallType2Chamfer(h, d);
  const plenum = Math.max(plenumDepth, BUILD.supplyChamber.depthType2);
  const bridge = BUILD.exhaustChamber.bridge;
  /* Крыша: зона ① (как у ЗВП) + мост + камера ③ */
  const flat = Math.min(d - 48, base.zone1 + bridge + plenum);
  const chamferZ = Math.max(0, d - flat);
  return {
    chamferZ,
    slantDy: base.slantDy,
    vertDy: base.vertDy,
    zone1: base.zone1,
    flat,
    plenum,
  };
}

/**
 * ТИП 2 ЗПВО «абажур»: α const; полость const по нормали к обшивке.
 * Скос (chamferZ) не растёт с D — иначе на старте от 600 Lv стоит, а α плывёт.
 * С ростом D увеличиваются Ln (=D) и Lv (= D − 2×chamfer) вместе.
 */
export function islandSupplyType2Chamfer(h: number, d: number, plenumDepth: number) {
  const frontH = Math.max(h, 80);
  const vertDy = Math.min(BUILD.zpvo.type2VertDy, Math.round(frontH * 0.28));
  const slantDy = frontH - vertDy;
  const alpha = (BUILD.zpvo.type2AlphaDeg * Math.PI) / 180;
  const byAlpha = Math.round(slantDy * Math.tan(alpha));
  const ex = BUILD.zpvo.type2DisplayExhaust;
  const pMin = BUILD.zpvo.type2PMin;
  const bridge = BUILD.zpvo.type2Bridge;
  const minFlat = 2 * plenumDepth + ex + 2 * pMin + 2 * bridge;
  /* Потолок скоса — по мин. каталожному D (600), не по текущему вылету */
  const dMin = 600;
  const roomAtMin = Math.max(0, Math.floor((dMin - minFlat) / 2));
  const roomNow = Math.max(0, Math.floor((d - minFlat) / 2));
  const chamferZ = Math.min(byAlpha, roomAtMin, roomNow);

  return { chamferZ, slantDy, vertDy };
}

/**
 * ТИП 2 ЗВП/ЗВО (без притока): бортик const + скос зоны ②.
 * Зона ① (x) — const (вытяжка + жировик); на мин. D=600: y/x ≈ 1.5.
 * Патрубок в центре зоны ① (A = B). С ростом D растёт только y.
 */
export function wallType2Chamfer(h: number, d: number) {
  const frontH = Math.max(h, 80);
  const vertDy = Math.min(BUILD.zpvo.type2VertDy, Math.round(frontH * 0.28));
  const slantDy = Math.max(frontH - vertDy, 40);
  const A = BUILD.zpvo.type2DisplayExhaust;
  const edge = 14;
  const dMin = 600;
  /** y/x на каталожном минимуме D */
  const yOverX = 1.5;
  const xFromRatio = Math.round(dMin / (1 + yOverX)); /* 240 при 600 и 1.5 */
  const xMinPipe = A + 2 * edge;
  const xConst = Math.max(xFromRatio, xMinPipe);
  const chamferZ = Math.max(0, d - xConst);
  return {
    chamferZ,
    slantDy,
    vertDy,
    /** Глубина зоны ① (плоская крыша), мм — const */
    zone1: xConst,
    /** Глубина зоны ② (скос), мм */
    zone2: chamferZ,
    A,
    edge,
    yOverX,
  };
}

/**
 * ТИП 2 ЗВО (остров без притока) = ЗПВО без камеры ③.
 * Зона ① по центру — const; скосы y с двух сторон; на D=600 сумма y / x ≈ 1.5.
 * Патрубок в центре (A = B).
 */
export function islandType2Chamfer(h: number, d: number) {
  const frontH = Math.max(h, 80);
  const vertDy = Math.min(BUILD.zpvo.type2VertDy, Math.round(frontH * 0.28));
  const slantDy = Math.max(frontH - vertDy, 40);
  const A = BUILD.zpvo.type2DisplayExhaust;
  const edge = 14;
  const dMin = 600;
  const yOverX = 1.5;
  const xFromRatio = Math.round(dMin / (1 + yOverX));
  const xConst = Math.max(xFromRatio, A + 2 * edge);
  const each = Math.max(0, Math.floor((d - xConst) / 2));
  return {
    chamferZ: each,
    slantDy,
    vertDy,
    zone1: d - 2 * each,
    zone2Each: each,
    A,
    edge,
    yOverX,
  };
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
  hydro = false,
) {
  const empty = { topFront: 0, topBack: 0, bottomFront: 0, bottomBack: 0 };
  if (supply) return empty;
  if (profile === 'rect' || profile === 'triangle') return empty;

  /* ТИП 2 пристенный ЗВП */
  if (!island && !hydro) {
    const ch = wallType2Chamfer(dims.h, dims.d);
    return { topFront: ch.chamferZ, topBack: 0, bottomFront: 0, bottomBack: 0 };
  }

  /* ТИП 2 островной ЗВО: симметрия, зона ① const */
  if (island && !hydro) {
    const ch = islandType2Chamfer(dims.h, dims.d);
    return {
      topFront: ch.chamferZ,
      topBack: ch.chamferZ,
      bottomFront: 0,
      bottomBack: 0,
    };
  }

  /*
   * Гидро (ЗВПГ/ЗВОГ): крыша шире — место патрубку, шпилькам и форсункам под крышкой.
   */
  const minFlat = Math.max(320, Math.round(dims.d * 0.72));
  const tMax = Math.max(0, dims.d - minFlat);
  const byDeg = (degV: number) =>
    Math.min(Math.round(dims.h * Math.tan((degV * Math.PI) / 180)), tMax);
  const t = Math.min(byDeg(14), Math.round(dims.d * 0.14), tMax);
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
 * Вытяжка + приток на крышке (ЗПВП).
 * ЗПВП = ЗВП + камера ③: вытяжка A=B в зоне ①; приток в ③ у фронта крыши.
 */
export function withSupplySpigot(
  spigots: Spigot[],
  top: { w: number; d: number },
  plenumDepth: number,
  opts?: { profile?: Layout['profile']; h?: number; frontRise?: number },
): Spigot[] {
  const { dia: supplyDia } = BUILD.supplyChamber;
  const depth = Math.max(plenumDepth, supplyDia + 2 * 12);
  const edge = Math.min(
    BUILD.supplyChamber.edge,
    Math.max(12, (depth - supplyDia) / 2),
  );
  const half = top.d / 2;
  const profile = opts?.profile;
  const h = opts?.h ?? 350;

  /* ТИП 2: наружный профиль как ЗВП; вытяжка в центре зоны ① */
  if (profile === 'trapezoid') {
    const ch = supplyType2Chamfer(h, top.d, depth);
    const A = BUILD.zpvo.type2DisplayExhaust;
    const zFlatFront = half - ch.chamferZ;
    const zEx = -half + ch.zone1 / 2;
    const zSup = zFlatFront - edge - supplyDia / 2;
    const n = spigots.length;
    if (n === 1) {
      return [
        { x: 0, z: zEx, diameter: A, role: 'exhaust' },
        { x: 0, z: zSup, diameter: Math.min(supplyDia, A), role: 'supply' },
      ];
    }
    const usable = Math.max(top.w - A - 80, 0);
    const exhaust = spigots.map((_, i) => ({
      x: -usable / 2 + (usable * i) / (n - 1),
      z: zEx,
      diameter: A,
      role: 'exhaust' as const,
    }));
    return [...exhaust, { x: 0, z: zSup, diameter: supplyDia, role: 'supply' }];
  }

  const zF = half;
  const zSup = zF - edge - supplyDia / 2;
  const zSeamTop = zF - depth;

  const A =
    profile === 'rect'
      ? BUILD.zpvo.type3DisplayExhaust
      : BUILD.zpvo.type2DisplayExhaust;
  const rearClear = BUILD.exhaustChamber.rearClear;
  const gapZ = BUILD.exhaustChamber.bridge;
  const minPipeGap = 90;
  const exhaustDepth = Math.max(top.d - depth, 160);
  const exhaustMaxByGap =
    zSup - supplyDia / 2 + half - rearClear - minPipeGap;
  const exhaustMax = Math.min(
    A,
    Math.max(120, exhaustDepth - 100),
    Math.max(120, top.w - 2 * 40),
    Math.max(120, exhaustMaxByGap),
  );
  const zExLimit = Math.min(half - depth - gapZ, zSeamTop - 20);
  const n = spigots.length;

  if (n === 1) {
    const dia = Math.min(spigots[0].diameter, exhaustMax, A);
    const zEx = clamp(
      -half + dia / 2 + rearClear,
      -half + rearClear,
      zExLimit - dia / 2,
    );
    return [
      { x: 0, z: zEx, diameter: dia, role: 'exhaust' },
      { x: 0, z: zSup, diameter: Math.min(supplyDia, dia), role: 'supply' },
    ];
  }

  const dia = Math.min(Math.max(...spigots.map((s) => s.diameter)), exhaustMax, A);
  const zEx = clamp(-half + dia / 2 + rearClear, -half + rearClear, zExLimit - dia / 2);
  const usable = Math.max(top.w - dia - 80, 0);
  const exhaust = spigots.map((s, i) => ({
    x: -usable / 2 + (usable * i) / (n - 1),
    z: zEx,
    diameter: Math.min(s.diameter, dia),
    role: 'exhaust' as const,
  }));
  return [...exhaust, { x: 0, z: zSup, diameter: supplyDia, role: 'supply' }];
}

/**
 * ЗПВО: вытяжка по центру, две врезки притока.
 * ТИП 2 (схема): Ø вытяжки const для отображения; поле до ребра крыши const;
 * мин. N при мин. D; рост D расширяет зону между трубой и швом (P).
 */
export function withIslandSupplySpigots(
  spigots: Spigot[],
  top: { w: number; d: number },
  plenumDepth: number,
  opts?: { profile?: Layout['profile']; h?: number },
): Spigot[] {
  const edge = 40;
  const half = top.d / 2;
  const type2 = opts?.profile === 'trapezoid';

  let zFlat = half;
  if (type2) {
    const ch = islandSupplyType2Chamfer(opts.h ?? 350, top.d, plenumDepth);
    zFlat = half - ch.chamferZ;
  }

  if (type2) {
    const exD = BUILD.zpvo.type2DisplayExhaust;
    const sDia = BUILD.zpvo.type2DisplaySupply;
    const edgeC = BUILD.zpvo.type2EdgeConst;
    const zP = zFlat - plenumDepth;
    /*
     * Шов на крыше = верх наклонной перегородки (zFlat − полость).
     * Врезка на полке между швом и ребром скоса.
     */
    const edgeSeam = sDia / 2 + 14;
    const edgeOut = sDia / 2 + edgeC;
    let zSup = (zP + zFlat) / 2;
    if (zP + edgeSeam <= zFlat - edgeOut) {
      zSup = clamp(zSup, zP + edgeSeam, zFlat - edgeOut);
    } else {
      zSup = (zP + zFlat) / 2;
    }
    const n = spigots.length;
    if (n === 1) {
      return [
        { x: 0, z: 0, diameter: exD, role: 'exhaust' },
        { x: 0, z: zSup, diameter: sDia, role: 'supply' },
        { x: 0, z: -zSup, diameter: sDia, role: 'supply' },
      ];
    }
    const usable = Math.max(top.w - exD - 2 * edge, 0);
    const exhaust = spigots.map((_, i) => ({
      x: -usable / 2 + (usable * i) / (n - 1),
      z: 0,
      diameter: exD,
      role: 'exhaust' as const,
    }));
    return [
      ...exhaust,
      { x: 0, z: zSup, diameter: sDia, role: 'supply' },
      { x: 0, z: -zSup, diameter: sDia, role: 'supply' },
    ];
  }

  /* ТИП 1 / ТИП 3: Ø const для отображения, полость с каждой стороны */
  const type3 = opts?.profile === 'rect';
  const exD = type3
    ? BUILD.zpvo.type3DisplayExhaust
    : BUILD.zpvo.type2DisplayExhaust; /* ТИП 1: тоже const — статика камеры ① */
  const supplyDia = type3
    ? BUILD.zpvo.type3DisplaySupply
    : Math.min(85, Math.max(70, plenumDepth - 15));
  const zP = half - plenumDepth;
  const zSup = clamp(
    (zP + half) / 2,
    zP + supplyDia / 2 + 14,
    half - supplyDia / 2 - 16,
  );
  const dia = exD;

  const n = spigots.length;
  if (n === 1) {
    return [
      { x: 0, z: 0, diameter: dia, role: 'exhaust' },
      { x: 0, z: zSup, diameter: supplyDia, role: 'supply' },
      { x: 0, z: -zSup, diameter: supplyDia, role: 'supply' },
    ];
  }
  const usable = Math.max(top.w - dia - 2 * edge, 0);
  const exhaust = spigots.map((_, i) => ({
    x: -usable / 2 + (usable * i) / (n - 1),
    z: 0,
    diameter: dia,
    role: 'exhaust' as const,
  }));
  return [
    ...exhaust,
    { x: 0, z: zSup, diameter: supplyDia, role: 'supply' },
    { x: 0, z: -zSup, diameter: supplyDia, role: 'supply' },
  ];
}

/** Глубина приточной полости ЗПВО — const (не от D). ТИП 2 — type2PlenumDepth. */
export function islandSupplyPlenumDepth(d: number, profile?: Layout['profile']) {
  const fixed =
    profile === 'trapezoid' ? BUILD.zpvo.type2PlenumDepth : BUILD.zpvo.plenumDepth;
  const maxEach = Math.max(90, Math.floor((d - 200) / 2));
  return Math.min(fixed, maxEach);
}

/**
 * Ряды жироулавливающих кассет.
 * Не по периметру обшивки, а внутри купола — как на схемах ЗВП/ЗВО.
 */
export function layoutFilters(dims: Dims, traits: FamilyTraits): FilterRow[] {
  /* Ряд почти во всю W — иначе по бокам «дыры» у корпуса */
  const span = Math.max(dims.w - 2 * BUILD.core.sideClear, 200);
  const count = Math.max(1, Math.round(span / BUILD.filter.w));
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

/** Точки подвеса: углы плоской крыши, вне зоны патрубков. */
export function layoutHangers(
  top: { w: number; d: number; z: number },
  traits: FamilyTraits,
  spigots: Spigot[] = [],
  opts?: { roofInsetZ?: number },
) {
  if (!traits.island) return [];
  /* На ТИП 2 крыша уже скоса — шпильки только на плоском верху */
  const insetZ = Math.max(0, opts?.roofInsetZ ?? 0);
  const roofD = Math.max(top.d - 2 * insetZ, 120);
  const ix = top.w / 2 - 50;
  const iz = Math.max(roofD / 2 - 40, 28);
  const pts = [
    { x: -ix, z: top.z - iz },
    { x: ix, z: top.z - iz },
    { x: ix, z: top.z + iz },
    { x: -ix, z: top.z + iz },
  ];

  const xMin = -top.w / 2 + 30;
  const xMax = top.w / 2 - 30;
  const zMin = top.z - roofD / 2 + 25;
  const zMax = top.z + roofD / 2 - 25;

  return pts.map((p) => {
    let { x, z } = p;
    for (const s of spigots) {
      const sz = top.z + s.z;
      const need = s.diameter / 2 + 45;
      const dx = x - s.x;
      const dz = z - sz;
      const dist = Math.hypot(dx, dz);
      if (dist < need) {
        if (dist < 1e-3) {
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
  /*
   * ЗВПГ / ЗВОГ без «ТИП n» — прямоугольный короб (фронт 90°).
   * Иначе hoodProfileOf(null) → trapezoid и передняя стенка скошена.
   */
  const typed = !!options.typeLabel?.match(/\d/);
  const profile =
    traits.hydro && !typed ? 'rect' : hoodProfileOf(options.typeLabel);
  const insets = taperForProfile(profile, dims, traits.island, traits.supply, traits.hydro);
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
  /*
   * ТИП 1: скос низа вверх к фронту (план полный).
   * Передняя вертикаль L = ¼V const → подъём низа = ¾H.
   */
  const bottomRise =
    profile === 'triangle' && !traits.supply
      ? Math.min(Math.round(dims.h * 0.75), dims.h - Math.max(80, Math.round(dims.h / 4)))
      : 0;
  const taper = insets.topFront + insets.bottomFront + bottomRise;

  const plenumDepth = traits.supply
    ? traits.island
      ? islandSupplyPlenumDepth(dims.d, profile)
      : profile === 'trapezoid'
        ? BUILD.supplyChamber.depthType2 /* ТИП 2: камера чуть вперёд → больше зона ② */
        : BUILD.supplyPlenumDepth
    : 0;
  /* У ЗПВО скос — наружные грани; frontRise у ЗПВП ТИП 1 = bottomRise ЗВП (L=¼V) */
  const frontRise =
    traits.supply && !traits.island
      ? profile === 'triangle'
        ? supplyFrontRise(profile, dims.h)
        : Math.min(supplyFrontRise(profile, dims.h), dims.h - BUILD.gutter - 80)
      : 0;

  const spigots0 = layoutSpigots(top.w, top.d, pick, { island: traits.island });
  let spigots = traits.supply
    ? traits.island
      ? withIslandSupplySpigots(spigots0, top, plenumDepth, { profile, h: dims.h })
      : withSupplySpigot(spigots0, top, plenumDepth, { profile, h: dims.h, frontRise })
    : spigots0;

  /*
   * ЗВП/ЗВО/гидро без притока: Ø вытяжки const (как на схеме).
   * ТИП 2: центр зоны ① (A = B). ТИП 1/3 и гидро: z пересчитать под фактический Ø —
   * иначе остаётся поза от расчётного 250 при отрисовке 120 (патрубок «висит» впереди).
   */
  if (!traits.supply) {
    const A =
      profile === 'rect'
        ? BUILD.zpvo.type3DisplayExhaust
        : BUILD.zpvo.type2DisplayExhaust;
    const edge = 14;
    const half = top.d / 2;
    spigots = spigots.map((s) => {
      const dia = Math.min(s.diameter, A);
      if (profile === 'trapezoid') {
        return { ...s, diameter: dia, z: 0 };
      }
      if (traits.island) {
        return { ...s, diameter: dia, z: 0 };
      }
      const z = clamp(-half + dia / 2 + edge, -half + edge, 0);
      return { ...s, diameter: dia, z };
    });
  }

  const roofInsetZ =
    traits.island && profile === 'trapezoid'
      ? traits.supply
        ? islandSupplyType2Chamfer(dims.h, dims.d, plenumDepth).chamferZ
        : islandType2Chamfer(dims.h, dims.d).chamferZ
      : 0;

  return {
    dims,
    top,
    bottom,
    taper,
    bottomRise,
    profile,
    spigots,
    filters: layoutFilters(dims, traits),
    hangers: layoutHangers(top, traits, spigots, { roofInsetZ }),
    lamps: layoutLamps(dims, !!options.lamps),
    nozzles: traits.hydro ? Math.max(2, Math.round(dims.w / BUILD.nozzleStep)) : 0,
    supplySlot: layoutSupplySlot(dims, traits),
    supplyPlenum: traits.supply ? { depth: plenumDepth, frontRise } : null,
    gutterHeight: Math.min(BUILD.gutter, dims.h * 0.25),
    lip: BUILD.lip,
  };
}
