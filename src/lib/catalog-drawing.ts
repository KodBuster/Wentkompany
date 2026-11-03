/**
 * Сборка листа чертежа по каталожному изделию.
 * Цена и геометрия считаются здесь, из каталога, а не из браузера.
 * Тот же вход использует выгрузка (/api/export) и заявка (/api/lead).
 */

import { calculate, resolveMaterialGrade, type Dims } from '@/lib/calc';
import {
  familyByCode,
  productBySlug,
  productsOf,
  supportsParametricDrawing,
  traitsOf,
} from '@/lib/catalog';
import { buildSheet, type DrawingInput } from '@/lib/drawing';

export const DRAWING_LIMITS = {
  w: [600, 3000],
  d: [600, 1600],
  h: [300, 700],
} as const;

export const DRAWING_OPTIONS = [
  'Врезка присоединительная',
  'Проушины для монтажа',
  'Кран для слива жира и конденсата',
  'Точечные светодиодные светильники',
] as const;

export interface DrawingRequest {
  slug?: string;
  dims?: { h?: unknown; w?: unknown; d?: unknown };
  material?: unknown;
  options?: unknown;
  captureVelocity?: unknown;
}

export type ResolvedDrawing =
  | { ok: true; input: DrawingInput; designation: string }
  | { ok: false; status: number; error: string };

const num = (v: unknown) => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return NaN;
};

function validateDims(raw: DrawingRequest['dims']): Dims | null {
  const h = num(raw?.h);
  const w = num(raw?.w);
  const d = num(raw?.d);
  if ([h, w, d].some(Number.isNaN)) return null;
  if (h < DRAWING_LIMITS.h[0] || h > DRAWING_LIMITS.h[1]) return null;
  if (w < DRAWING_LIMITS.w[0] || w > DRAWING_LIMITS.w[1]) return null;
  if (d < DRAWING_LIMITS.d[0] || d > DRAWING_LIMITS.d[1]) return null;
  return { h: Math.round(h), w: Math.round(w), d: Math.round(d) };
}

/** Изделие с габаритом → вход генератора чертежа. Без базы (ГФ, щит) чертежа нет. */
export function resolveDrawingInput(raw: DrawingRequest): ResolvedDrawing {
  const product = raw.slug ? productBySlug(raw.slug) : undefined;
  if (!product || !product.base) {
    return { ok: false, status: 404, error: 'Изделие не найдено в каталоге' };
  }

  if (!supportsParametricDrawing(product.family)) {
    return {
      ok: false,
      status: 422,
      error:
        'Для этой линейки параметрический чертёж короба не строится (другая геометрия). Чертёж — по запросу.',
    };
  }

  const dims = validateDims(raw.dims);
  if (!dims) {
    return {
      ok: false,
      status: 400,
      error: 'Некорректные габариты: укажите H/D/W в допустимых пределах',
    };
  }

  const options = Array.isArray(raw.options)
    ? raw.options.filter(
        (o): o is string => typeof o === 'string' && (DRAWING_OPTIONS as readonly string[]).includes(o),
      )
    : [];

  const traits = traitsOf(product.family);
  const family = familyByCode(product.family);
  const material = resolveMaterialGrade(raw.material, traits.hydro);
  const velocity = num(raw.captureVelocity);
  const basePrice = product.price ?? productsOf(product.family).find((p) => p.price)?.price ?? null;
  const calc = calculate(dims, traits, product.base, basePrice, material, {
    typeLabel: product.type,
    captureVelocity: Number.isFinite(velocity) ? velocity : undefined,
    options,
  });

  const input: DrawingInput = {
    dims,
    traits,
    calc,
    article: product.article,
    productName: family?.title ?? product.name,
    material,
    lamps: options.includes(DRAWING_OPTIONS[3]),
    options,
    typeLabel: product.type,
  };

  return { ok: true, input, designation: buildSheet(input).designation };
}
