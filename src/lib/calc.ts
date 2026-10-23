/**
 * Расчётное ядро конфигуратора.
 *
 * Расход воздуха:
 *   L = 3600 · v · S_захвата, м³/ч
 * v — скорость в сечении захвата (0,4…0,7 м/с, по умолчанию 0,5);
 * S — площадь нижнего проёма (не крышки): ТИП 2/3 — W·D;
 * ТИП 1 — наклонная плоскость W·√(D²+rise²);
 * ×2 только у островного ТИП 1 (ЗВО-1 / ЗПВО-1); у ТИП 2/3 низ монолитный.
 *
 * Цена нестандартного габарита — ОЦЕНКА по площади материала.
 * Масса — ориентир по площади листа 0,8 мм с коэффициентом на
 * жироуловители, рамы и крепёж.
 * Всё, что помечено estimate: true, на сайте показывается с бейджем
 * «предварительная оценка» и не выдаётся за прайс.
 */

export type Family = 'ЗВП' | 'ЗВО' | 'ЗПВП' | 'ЗПВО' | 'ЗВПГ' | 'ЗВОГ' | 'ПИР' | 'ГФ' | 'АВТ';

export interface FamilyTraits {
  island: boolean;
  supply: boolean;
  hydro: boolean;
}

export interface Dims {
  h: number;
  w: number;
  d: number;
}

/** Допустимые скорости в сечении захвата, м/с. */
export const CAPTURE_VELOCITIES = [0.4, 0.5, 0.6, 0.7] as const;
export type CaptureVelocity = (typeof CAPTURE_VELOCITIES)[number];
/** Дефолт: общепит. */
export const DEFAULT_CAPTURE_VELOCITY: CaptureVelocity = 0.5;

/** Подписи режимов для UI (без лишнего текста про пересчёт). */
export const CAPTURE_VELOCITY_LABELS: Record<CaptureVelocity, string> = {
  0.4: 'бытовой',
  0.5: 'общепит',
  0.6: 'открытый огонь',
  0.7: 'усиленный',
};

export type HoodProfile = 'triangle' | 'trapezoid' | 'rect';

/** Профиль из подписи «ТИП n» (как в geometry.hoodProfileOf). */
export function hoodProfileOf(typeLabel: string | null | undefined): HoodProfile {
  const n = typeLabel?.match(/(\d)/)?.[1];
  if (n === '1') return 'triangle';
  if (n === '2') return 'trapezoid';
  if (n === '3') return 'rect';
  return 'rect';
}

/** Передняя вертикаль «сотка» — для подъёма низа ТИП 1 (мм). */
const FRONT_BOARD_H = 100;

export interface AirflowOpts {
  captureVelocity?: number;
  typeLabel?: string | null;
}

/** Ряд диаметров врезок из таблицы производства, мм. */
export const DUCT_SIZES = [200, 250, 315, 355, 400] as const;

type ExhaustRow = { w: number; count: number; diameter: number };

/**
 * Сетка вытяжных врезок (Excel «количество врезок»).
 * Ключ — длина зонта W; остров / пристен; H 350 или 450.
 * Пристенные 350 и 450 совпадают; островные отличаются на W=1000.
 */
const EXHAUST_WALL: ExhaustRow[] = [
  { w: 800, count: 1, diameter: 200 },
  { w: 1000, count: 1, diameter: 200 },
  { w: 1200, count: 1, diameter: 250 },
  { w: 1400, count: 1, diameter: 250 },
  { w: 1600, count: 2, diameter: 200 },
  { w: 1800, count: 2, diameter: 250 },
  { w: 2000, count: 2, diameter: 250 },
  { w: 2500, count: 2, diameter: 315 },
];

const EXHAUST_ISLAND_350: ExhaustRow[] = [
  { w: 800, count: 1, diameter: 250 },
  { w: 1000, count: 1, diameter: 315 },
  { w: 1200, count: 2, diameter: 250 },
  { w: 1400, count: 2, diameter: 250 },
  { w: 1600, count: 2, diameter: 250 },
  { w: 1800, count: 2, diameter: 315 },
  { w: 2000, count: 2, diameter: 315 },
  { w: 2500, count: 2, diameter: 355 },
];

const EXHAUST_ISLAND_450: ExhaustRow[] = [
  { w: 800, count: 1, diameter: 250 },
  { w: 1000, count: 1, diameter: 250 },
  { w: 1200, count: 2, diameter: 250 },
  { w: 1400, count: 2, diameter: 250 },
  { w: 1600, count: 2, diameter: 250 },
  { w: 1800, count: 2, diameter: 315 },
  { w: 2000, count: 2, diameter: 315 },
  { w: 2500, count: 2, diameter: 355 },
];

/** Ближайшая высота сетки производства. */
function exhaustTableH(h: number): 350 | 450 {
  return h < 400 ? 350 : 450;
}

/** Строка сетки по W: ближайшая длина; при ничьей — больший W (запас). */
function nearestExhaustRow(rows: ExhaustRow[], w: number): ExhaustRow {
  let best = rows[0]!;
  let bestDist = Math.abs(best.w - w);
  for (const row of rows) {
    const dist = Math.abs(row.w - w);
    if (dist < bestDist || (dist === bestDist && row.w > best.w)) {
      best = row;
      bestDist = dist;
    }
  }
  return best;
}

/** Толщина стали по умолчанию, м (0,8 мм) и плотность нержавейки, кг/м³. */
const STEEL_THICKNESS = 0.0008;
const STEEL_DENSITY = 7900;

/** Надбавка на жироуловители, рамы, крепёж. */
const HARDWARE_FACTOR = 1.35;

/** Оценочная надбавка за AISI 304 — до подтверждения производством. */
const AISI304_FACTOR = 1.18;

/**
 * Марка по умолчанию: 304 — для гидроконтура и водяных сред,
 * 430 — для обычных зонтов без воды.
 */
export function defaultMaterialGrade(hydro: boolean): '430' | '304' {
  return hydro ? '304' : '430';
}

/** Явный выбор клиента или дефолт по типу линейки. */
export function resolveMaterialGrade(raw: unknown, hydro: boolean): '430' | '304' {
  if (raw === '304' || raw === '430') return raw;
  return defaultMaterialGrade(hydro);
}

/**
 * Площадь захвата — нижний проём, м².
 * ТИП 1: наклонная плоскость; ТИП 2/3: горизонталь W×D.
 * ×2 — только островной ТИП 1 (две плоскости V); иначе низ как одна плоскость.
 */
export function captureArea(
  dims: Dims,
  traits: FamilyTraits = { island: false, supply: false, hydro: false },
  typeLabel?: string | null,
): number {
  const w = dims.w / 1000;
  const d = dims.d / 1000;
  const profile = hoodProfileOf(typeLabel);
  let s: number;
  if (profile === 'triangle') {
    const rise = Math.max(0, dims.h - FRONT_BOARD_H) / 1000;
    s = w * Math.hypot(d, rise);
  } else {
    s = w * d;
  }
  if (traits.island && profile === 'triangle') s *= 2;
  return s;
}

/** Периметр захвата, м. Пристенный зонт открыт с трёх сторон. Справочно. */
export function capturePerimeter(dims: Dims, traits: FamilyTraits): number {
  const w = dims.w / 1000;
  const d = dims.d / 1000;
  return traits.island ? 2 * (w + d) : w + 2 * d;
}

/** Нормализация скорости захвата к ряду 0,4…0,7. */
export function resolveCaptureVelocity(raw?: number): CaptureVelocity {
  if (raw === 0.4 || raw === 0.5 || raw === 0.6 || raw === 0.7) return raw;
  return DEFAULT_CAPTURE_VELOCITY;
}

/** Расход удаляемого воздуха, м³/ч: L = 3600 · v · S. */
export function airflow(
  dims: Dims,
  traits: FamilyTraits = { island: false, supply: false, hydro: false },
  opts?: AirflowOpts,
): number {
  const v = resolveCaptureVelocity(opts?.captureVelocity);
  return 3600 * v * captureArea(dims, traits, opts?.typeLabel);
}

export interface DuctPick {
  count: number;
  diameter: number;
  velocity: number;
}

/**
 * Подбор вытяжных врезок по таблице производства (W × пристен/остров × H).
 * Скорость — справочно из нашего L; раскладка 1–2 шт симметрично по ширине.
 */
export function pickDucts(dims: Dims, traits: FamilyTraits, opts?: AirflowOpts): DuctPick {
  const hKey = exhaustTableH(dims.h);
  const rows = traits.island
    ? hKey === 350
      ? EXHAUST_ISLAND_350
      : EXHAUST_ISLAND_450
    : EXHAUST_WALL;
  const { count, diameter } = nearestExhaustRow(rows, dims.w);
  const air = airflow(dims, traits, opts);
  const area = Math.PI * (diameter / 2000) ** 2;
  const velocity = air / 3600 / (count * area);
  return { count, diameter, velocity };
}

/** Площадь листа: верх и четыре стенки, низ открыт. м². */
export function steelArea({ h, w, d }: Dims): number {
  return (w / 1000) * (d / 1000) + 2 * ((w + d) / 1000) * (h / 1000);
}

/** Ориентировочная масса изделия, кг. */
export function mass(dims: Dims): number {
  return steelArea(dims) * STEEL_THICKNESS * STEEL_DENSITY * HARDWARE_FACTOR;
}

export interface PriceResult {
  value: number;
  estimate: boolean;
  note: string;
}

/**
 * Цена изделия только для эталонного типоразмера (прайс).
 * Нестандартный габарит → null (на витрине «запросить цену», без оценки).
 * Надбавка AISI 304 — только апгрейд сухого зонта на эталоне (у гидро 304 уже в прайсе).
 */
export function price(
  dims: Dims,
  base: Dims | null,
  basePrice: number | null,
  material: '430' | '304',
  hydro = false,
): PriceResult | null {
  if (!basePrice || !base) return null;
  const isBase = dims.h === base.h && dims.w === base.w && dims.d === base.d;
  if (!isBase) return null;
  let value = basePrice;
  const upgradedTo304 = material === '304' && !hydro;
  if (upgradedTo304) value *= AISI304_FACTOR;
  return {
    /* Прайс уже по формуле; до 50 ₽ не округляем — только целые рубли */
    value: Math.round(value),
    estimate: upgradedTo304,
    note: upgradedTo304
      ? 'Надбавка за AISI 304 к цене эталона. Точную сумму подтверждает производство.'
      : 'Цена для эталонного типоразмера по прайсу.',
  };
}

export interface Calculation {
  /** Площадь нижнего проёма захвата, м². */
  captureArea: number;
  /** Периметр открытого контура, м — справочно. */
  perimeter: number;
  /** Скорость в сечении захвата, м/с. */
  captureVelocity: CaptureVelocity;
  airflow: number;
  ducts: DuctPick;
  area: number;
  mass: number;
  price: PriceResult | null;
  warnings: string[];
}

export function calculate(
  dims: Dims,
  traits: FamilyTraits,
  base: Dims | null,
  basePrice: number | null,
  material?: '430' | '304',
  opts?: AirflowOpts,
): Calculation {
  const grade = material ?? defaultMaterialGrade(traits.hydro);
  const captureVelocity = resolveCaptureVelocity(opts?.captureVelocity);
  const airOpts: AirflowOpts = { captureVelocity, typeLabel: opts?.typeLabel };
  const air = airflow(dims, traits, airOpts);
  const ducts = pickDucts(dims, traits, airOpts);
  const warnings: string[] = [];

  if (ducts.velocity > 9) {
    warnings.push('Скорость в патрубке выше 9 м/с — сверьте с сетью объекта.');
  }
  if (base && (dims.w !== base.w || dims.d !== base.d || dims.h !== base.h)) {
    warnings.push('Нестандартный габарит: срок изготовления увеличивается.');
  }
  if (traits.hydro) {
    warnings.push('п. 5.30 СП 7.13130.2013 — нужен щит автоматики и питание по 1-й категории надёжности.');
  }

  return {
    captureArea: captureArea(dims, traits, opts?.typeLabel),
    perimeter: capturePerimeter(dims, traits),
    captureVelocity,
    airflow: air,
    ducts,
    area: steelArea(dims),
    mass: mass(dims),
    price: price(dims, base, basePrice, grade, traits.hydro),
    warnings,
  };
}

/* ---------- форматирование ---------- */

export const ru = (n: number) => Math.round(n).toLocaleString('ru-RU');
export const rub = (n: number) => `${ru(n)} ₽`;
export const dec = (n: number, digits = 1) => n.toFixed(digits).replace('.', ',');
