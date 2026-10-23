import pricesJson from '../../data/prices.json';

/** Факторы прайса: сначала −discount%, затем +markup% к результату. */
export type PriceFactors = {
  discountPct: number;
  markupPct: number;
};

export type PricesFile = {
  version: number;
  updatedAt: string | null;
  factors: PriceFactors;
  /** Их (исходные) цены по артикулу — до формулы. */
  sources: Record<string, number>;
};

/**
 * Прайс из `data/prices.json` в репозитории.
 * На Amvera: правите файл в кабинете → пересборка (~1 мин). Без админки и токенов.
 */
const DEFAULT: PricesFile = pricesJson as PricesFile;

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
  return {
    version: typeof o.version === 'number' ? o.version : 1,
    updatedAt: typeof o.updatedAt === 'string' ? o.updatedAt : null,
    factors: isFactors(o.factors)
      ? {
          discountPct: o.factors.discountPct,
          markupPct: o.factors.markupPct,
        }
      : { ...DEFAULT.factors },
    sources: Object.keys(sources).length ? sources : { ...DEFAULT.sources },
  };
}

/**
 * Наша цена с витрины.
 * Строго по шагам: 1) отнять discount% от их цены; 2) к результату прибавить markup%.
 */
export function sellPriceFromSource(
  source: number,
  factors: PriceFactors = DEFAULT.factors,
): number {
  const afterDiscount = source - source * (factors.discountPct / 100);
  const withMarkup = afterDiscount + afterDiscount * (factors.markupPct / 100);
  return Math.round(withMarkup);
}

export function loadPricesFile(): PricesFile {
  return normalize(DEFAULT);
}

/** Витринная цена артикула или null. */
export function displayPrice(article: string, file?: PricesFile): number | null {
  const data = file ?? loadPricesFile();
  const src = data.sources[article];
  if (src == null || !Number.isFinite(src) || src <= 0) return null;
  return sellPriceFromSource(src, data.factors);
}

/** Карта артикул → витринная цена. */
export function displayPriceMap(file?: PricesFile): Record<string, number> {
  const data = file ?? loadPricesFile();
  const out: Record<string, number> = {};
  for (const article of Object.keys(data.sources)) {
    const p = displayPrice(article, data);
    if (p != null) out[article] = p;
  }
  return out;
}
