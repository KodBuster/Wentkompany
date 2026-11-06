import pricesJson from '../../data/prices.json' with { type: 'json' };
import type { Dims } from './calc';

/** Факторы прайса. Скидка — только для legacy sources; матрица ЗВП/ЗВО — только markup. */
export type PriceFactors = {
  discountPct: number;
  markupPct: number;
};

export type PricesFile = {
  version: number;
  updatedAt: string | null;
  factors: PriceFactors;
  /**
   * Надбавки доп. оборудования к витринной цене, ₽ (уже «наши», без factors).
   * «Врезка присоединительная» — за один патрубок;
   * «Точечные светодиодные светильники» — за штуку.
   */
  options: Record<string, number>;
  /** Одиночные исходные цены (ПИР, ГФ, ЗВПГ, ЗВОГ) — до −discount/+markup. */
  sources: Record<string, number>;
  /**
   * Матрица ЗВП/ЗВО: артикул → ключ `H|D|W` → исходная цена, ₽.
   * Витрина = source × (1+markupPct/100), без скидки, до сотни.
   */
  matrix: Record<string, Record<string, number>>;
};

const DEFAULT: PricesFile = pricesJson as PricesFile;

/** Артикулы с матрицей размеров из Excel. */
export const MATRIX_ARTICLES = [
  'ЗВП-1',
  'ЗВП-2',
  'ЗВП-3',
  'ЗВО-1',
  'ЗВО-2',
  'ЗВО-3',
] as const;

export type MatrixArticle = (typeof MATRIX_ARTICLES)[number];

export function isMatrixArticle(article: string): article is MatrixArticle {
  return (MATRIX_ARTICLES as readonly string[]).includes(article);
}

function isFactors(v: unknown): v is PriceFactors {
  if (!v || typeof v !== 'object') return false;
  const f = v as PriceFactors;
  return typeof f.discountPct === 'number' && typeof f.markupPct === 'number';
}

function normalize(raw: unknown): PricesFile {
  if (!raw || typeof raw !== 'object') return structuredClone(DEFAULT);
  const o = raw as Partial<PricesFile>;
  const sources: Record<string, number> = {};
  if (o.sources && typeof o.sources === 'object') {
    for (const [k, v] of Object.entries(o.sources)) {
      const n = Number(v);
      if (Number.isFinite(n) && n > 0) sources[k] = Math.round(n);
    }
  }
  const options: Record<string, number> = {};
  if (o.options && typeof o.options === 'object') {
    for (const [k, v] of Object.entries(o.options)) {
      const n = Number(v);
      if (Number.isFinite(n) && n >= 0) options[k] = Math.round(n);
    }
  }
  const matrix: Record<string, Record<string, number>> = {};
  if (o.matrix && typeof o.matrix === 'object') {
    for (const [art, table] of Object.entries(o.matrix)) {
      if (!table || typeof table !== 'object') continue;
      const row: Record<string, number> = {};
      for (const [key, v] of Object.entries(table)) {
        const n = Number(v);
        if (Number.isFinite(n) && n > 0) row[key] = Math.round(n);
      }
      if (Object.keys(row).length) matrix[art] = row;
    }
  }
  return {
    version: typeof o.version === 'number' ? o.version : 1,
    updatedAt: typeof o.updatedAt === 'string' ? o.updatedAt : null,
    factors: isFactors(o.factors)
      ? {
          discountPct: o.factors.discountPct,
          markupPct: o.factors.markupPct,
        }
      : { ...DEFAULT.factors },
    options: Object.keys(options).length ? options : { ...DEFAULT.options },
    sources: Object.keys(sources).length ? sources : { ...DEFAULT.sources },
    matrix: Object.keys(matrix).length ? matrix : { ...DEFAULT.matrix },
  };
}

/** Витринная цена: к ближайшей сотне рублей. */
export function roundPriceRub(value: number): number {
  return Math.round(value / 100) * 100;
}

/** Legacy: −discount% затем +markup%, округление. */
export function sellPriceLegacy(
  source: number,
  factors: PriceFactors = DEFAULT.factors,
): number {
  const afterDiscount = source - source * (factors.discountPct / 100);
  const withMarkup = afterDiscount + afterDiscount * (factors.markupPct / 100);
  return roundPriceRub(withMarkup);
}

/** Матрица ЗВП/ЗВО: только +markup%, округление. */
export function sellPriceMatrix(
  source: number,
  factors: PriceFactors = DEFAULT.factors,
): number {
  const withMarkup = source + source * (factors.markupPct / 100);
  return roundPriceRub(withMarkup);
}

/** @deprecated используйте sellPriceLegacy / sellPriceMatrix */
export function sellPriceFromSource(
  source: number,
  factors: PriceFactors = DEFAULT.factors,
): number {
  return sellPriceLegacy(source, factors);
}

export function loadPricesFile(): PricesFile {
  return normalize(DEFAULT);
}

export function dimsKey(dims: Pick<Dims, 'h' | 'd' | 'w'>): string {
  return `${dims.h}|${dims.d}|${dims.w}`;
}

/** Исходная цена ячейки матрицы или null. */
export function matrixSource(
  article: string,
  dims: Pick<Dims, 'h' | 'd' | 'w'>,
  file?: PricesFile,
): number | null {
  const data = file ?? loadPricesFile();
  const table = data.matrix[article];
  if (!table) return null;
  const src = table[dimsKey(dims)];
  return src != null && Number.isFinite(src) && src > 0 ? src : null;
}

/** Витрина по точным H/D/W (матрица) или null. */
export function displayPriceForDims(
  article: string,
  dims: Pick<Dims, 'h' | 'd' | 'w'>,
  file?: PricesFile,
): number | null {
  const data = file ?? loadPricesFile();
  const src = matrixSource(article, dims, data);
  if (src == null) return null;
  return sellPriceMatrix(src, data.factors);
}

/** Минимальная витринная цена по матрице артикула («от …»). */
export function displayPriceMin(article: string, file?: PricesFile): number | null {
  const data = file ?? loadPricesFile();
  const table = data.matrix[article];
  if (!table) return null;
  let minSrc: number | null = null;
  for (const v of Object.values(table)) {
    if (!Number.isFinite(v) || v <= 0) continue;
    if (minSrc == null || v < minSrc) minSrc = v;
  }
  return minSrc == null ? null : sellPriceMatrix(minSrc, data.factors);
}

/**
 * Витринная цена артикула для списков:
 * матрица → минимум по сетке; legacy sources → −10%/+20%; иначе null.
 */
export function displayPrice(article: string, file?: PricesFile): number | null {
  const data = file ?? loadPricesFile();
  if (isMatrixArticle(article) || data.matrix[article]) {
    return displayPriceMin(article, data);
  }
  const src = data.sources[article];
  if (src == null || !Number.isFinite(src) || src <= 0) return null;
  return sellPriceLegacy(src, data.factors);
}

/** Карта артикул → витринная цена (для списков / «от»). */
export function displayPriceMap(file?: PricesFile): Record<string, number> {
  const data = file ?? loadPricesFile();
  const out: Record<string, number> = {};
  const articles = new Set([
    ...Object.keys(data.sources),
    ...Object.keys(data.matrix),
  ]);
  for (const article of articles) {
    const p = displayPrice(article, data);
    if (p != null) out[article] = p;
  }
  return out;
}

/**
 * Стартовая ячейка матрицы: минимальные H → D → W с ценой
 * (свободный вход в конфигуратор, без deep-link из каталога).
 */
export function matrixStartDims(article: string, file?: PricesFile): Dims | null {
  const data = file ?? loadPricesFile();
  const table = data.matrix[article];
  if (!table) return null;
  let best: Dims | null = null;
  let bestScore = Number.POSITIVE_INFINITY;
  for (const key of Object.keys(table)) {
    const [h, d, w] = key.split('|').map(Number);
    if (![h, d, w].every((n) => Number.isFinite(n))) continue;
    const score = h * 1e8 + d * 1e4 + w;
    if (score < bestScore) {
      bestScore = score;
      best = { h, d, w };
    }
  }
  return best;
}

/**
 * Ближайшая ячейка матрицы к заданным габаритам (если точного hit нет).
 * Нужна, когда каталожный base вне Excel-сетки (например ЗВО D от 700).
 */
export function nearestMatrixDims(
  article: string,
  dims: Pick<Dims, 'h' | 'd' | 'w'>,
  file?: PricesFile,
): Dims | null {
  const data = file ?? loadPricesFile();
  const table = data.matrix[article];
  if (!table) return null;
  let best: Dims | null = null;
  let bestScore = Number.POSITIVE_INFINITY;
  for (const key of Object.keys(table)) {
    const [h, d, w] = key.split('|').map(Number);
    if (![h, d, w].every((n) => Number.isFinite(n))) continue;
    const score =
      Math.abs(h - dims.h) + Math.abs(d - dims.d) + Math.abs(w - dims.w);
    if (score < bestScore) {
      bestScore = score;
      best = { h, d, w };
    }
  }
  return best;
}

/**
 * Риски слайдера: значения оси, для которых есть цена при текущих остальных.
 * Если тройка «редкая» и список пуст — запасной вариант по одной оси, затем полная ось.
 */
export function matrixTicksForAxis(
  article: string,
  axis: 'h' | 'd' | 'w',
  dims: Pick<Dims, 'h' | 'd' | 'w'>,
  file?: PricesFile,
): number[] {
  const data = file ?? loadPricesFile();
  if (axis === 'h') {
    const withBoth = matrixAllowedValues(article, { d: dims.d, w: dims.w }, 'h', data);
    if (withBoth.length) return withBoth;
    const withD = matrixAllowedValues(article, { d: dims.d }, 'h', data);
    if (withD.length) return withD;
    const withW = matrixAllowedValues(article, { w: dims.w }, 'h', data);
    if (withW.length) return withW;
  } else if (axis === 'd') {
    const withBoth = matrixAllowedValues(article, { h: dims.h, w: dims.w }, 'd', data);
    if (withBoth.length) return withBoth;
    const withH = matrixAllowedValues(article, { h: dims.h }, 'd', data);
    if (withH.length) return withH;
  } else {
    const withBoth = matrixAllowedValues(article, { h: dims.h, d: dims.d }, 'w', data);
    if (withBoth.length) return withBoth;
    const withH = matrixAllowedValues(article, { h: dims.h }, 'w', data);
    if (withH.length) return withH;
  }
  return matrixAxisValues(article, data)[axis];
}

/** Уникальные H / D / W в матрице артикула (для селекторов). */
export function matrixAxisValues(
  article: string,
  file?: PricesFile,
): { h: number[]; d: number[]; w: number[] } {
  const data = file ?? loadPricesFile();
  const table = data.matrix[article] ?? {};
  const hs = new Set<number>();
  const ds = new Set<number>();
  const ws = new Set<number>();
  for (const key of Object.keys(table)) {
    const [h, d, w] = key.split('|').map(Number);
    if ([h, d, w].every((n) => Number.isFinite(n))) {
      hs.add(h);
      ds.add(d);
      ws.add(w);
    }
  }
  const sort = (a: number, b: number) => a - b;
  return {
    h: [...hs].sort(sort),
    d: [...ds].sort(sort),
    w: [...ws].sort(sort),
  };
}

/**
 * Допустимые значения одной оси при зафиксированных остальных
 * (только комбинации с ценой в матрице).
 */
export function matrixAllowedValues(
  article: string,
  fixed: Partial<Pick<Dims, 'h' | 'd' | 'w'>>,
  axis: 'h' | 'd' | 'w',
  file?: PricesFile,
): number[] {
  const data = file ?? loadPricesFile();
  const table = data.matrix[article] ?? {};
  const out = new Set<number>();
  for (const key of Object.keys(table)) {
    const [h, d, w] = key.split('|').map(Number);
    if (fixed.h != null && h !== fixed.h) continue;
    if (fixed.d != null && d !== fixed.d) continue;
    if (fixed.w != null && w !== fixed.w) continue;
    out.add(axis === 'h' ? h : axis === 'd' ? d : w);
  }
  return [...out].sort((a, b) => a - b);
}

/**
 * Сумма надбавок выбранных опций, ₽.
 * qty — множитель по имени опции (врезка = патрубки, светильники = шт); иначе 1.
 */
export function optionSurchargeRub(
  selected?: readonly string[] | null,
  qty?: Readonly<Record<string, number>>,
  file?: PricesFile,
): number {
  if (!selected?.length) return 0;
  const table = (file ?? loadPricesFile()).options;
  let sum = 0;
  for (const name of selected) {
    const unit = table[name];
    if (typeof unit !== 'number' || !Number.isFinite(unit) || unit <= 0) continue;
    const n = qty?.[name];
    const count = typeof n === 'number' && Number.isFinite(n) && n > 0 ? Math.round(n) : 1;
    sum += unit * count;
  }
  return sum;
}
