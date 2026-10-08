/**
 * Расчётное ядро конфигуратора.
 *
 * Расход воздуха — по формуле производства:
 *   L = 3600 · 0,4 · S_захвата, м³/ч
 * где S_захвата = W·D в м² (площадь проёма зонта в плане).
 * Не по тепловыделению оборудования и не по периметру × высоте сечения.
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

/** Скорость в сечении захвата по методике производства, м/с. */
const CAPTURE_VELOCITY = 0.4;

/** Рабочая скорость в патрубке, м/с. */
const DUCT_VELOCITY = 8;

/** Ряд диаметров патрубков, мм. */
export const DUCT_SIZES = [250, 315, 400] as const;

/** Толщина стали по умолчанию, м (0,8 мм) и плотность нержавейки, кг/м³. */
const STEEL_THICKNESS = 0.0008;
const STEEL_DENSITY = 7900;

/** Надбавка на жироуловители, рамы, крепёж. */
const HARDWARE_FACTOR = 1.35;

/** Показатель степени в оценке цены по площади (экономия масштаба). */
const PRICE_EXPONENT = 0.6;

/** Оценочная надбавка за AISI 304 — до подтверждения производством. */
const AISI304_FACTOR = 1.18;

/** Площадь захвата (проём зонта в плане), м². */
export function captureArea(dims: Dims): number {
  return (dims.w / 1000) * (dims.d / 1000);
}

/** Периметр захвата, м. Пристенный зонт открыт с трёх сторон. Справочно. */
export function capturePerimeter(dims: Dims, traits: FamilyTraits): number {
  const w = dims.w / 1000;
  const d = dims.d / 1000;
  return traits.island ? 2 * (w + d) : w + 2 * d;
}

/** Расход удаляемого воздуха, м³/ч. Формула производства: L = 3600 · 0,4 · S. */
export function airflow(dims: Dims, _traits?: FamilyTraits): number {
  return 3600 * CAPTURE_VELOCITY * captureArea(dims);
}

export interface DuctPick {
  count: number;
  diameter: number;
  velocity: number;
}

/** Подбор числа и диаметра патрубков под рабочую скорость. */
export function pickDucts(air: number): DuctPick {
  for (let count = 1; count <= 4; count++) {
    for (const diameter of DUCT_SIZES) {
      const area = Math.PI * (diameter / 2000) ** 2;
      if (air <= count * area * DUCT_VELOCITY * 3600) {
        return { count, diameter, velocity: air / 3600 / (count * area) };
      }
    }
  }
  const area = Math.PI * (0.4 / 2) ** 2;
  return { count: 4, diameter: 400, velocity: air / 3600 / (4 * area) };
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
 * Цена изделия. Совпадение с эталонным типоразмером → прайс.
 * Отклонение → оценка по площади материала.
 */
export function price(
  dims: Dims,
  base: Dims | null,
  basePrice: number | null,
  material: '430' | '304' = '430',
): PriceResult | null {
  if (!basePrice || !base) return null;
  const isBase = dims.h === base.h && dims.w === base.w && dims.d === base.d;
  const ratio = steelArea(dims) / steelArea(base);
  let value = isBase ? basePrice : basePrice * ratio ** PRICE_EXPONENT;
  if (material === '304') value *= AISI304_FACTOR;
  const estimate = !isBase || material === '304';
  return {
    value: Math.round(value / 50) * 50,
    estimate,
    note: estimate
      ? 'Предварительная оценка по площади материала. Точную цену рассчитывает производство.'
      : 'Цена для эталонного типоразмера по прайсу.',
  };
}

export interface Calculation {
  /** Площадь захвата W×D, м² — входит в формулу расхода. */
  captureArea: number;
  /** Периметр открытого контура, м — справочно. */
  perimeter: number;
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
  material: '430' | '304' = '430',
): Calculation {
  const air = airflow(dims, traits);
  const ducts = pickDucts(air);
  const warnings: string[] = [];

  if (ducts.velocity > 9) warnings.push('Скорость в патрубке выше 9 м/с — проверьте шумность.');
  if (base && (dims.w !== base.w || dims.d !== base.d || dims.h !== base.h)) {
    warnings.push('Нестандартный габарит: срок изготовления увеличивается.');
  }
  if (traits.hydro) {
    warnings.push('п. 5.30 СП 7.13130.2013 — нужен щит автоматики и питание по 1-й категории надёжности.');
  }

  return {
    captureArea: captureArea(dims),
    perimeter: capturePerimeter(dims, traits),
    airflow: air,
    ducts,
    area: steelArea(dims),
    mass: mass(dims),
    price: price(dims, base, basePrice, material),
    warnings,
  };
}

/* ---------- форматирование ---------- */

export const ru = (n: number) => Math.round(n).toLocaleString('ru-RU');
export const rub = (n: number) => `${ru(n)} ₽`;
export const dec = (n: number, digits = 1) => n.toFixed(digits).replace('.', ',');
