import { NextResponse } from 'next/server';
import { calculate, type Dims } from '@/lib/calc';
import { productBySlug, productsOf, traitsOf, familyByCode } from '@/lib/catalog';
import { buildDxf, translit } from '@/lib/dxf';
import { buildDrawingPdf, buildQuotePdf } from '@/lib/pdf';
import { buildIfc } from '@/lib/ifc';
import { buildSheet } from '@/lib/drawing';
import { site } from '@/lib/site';

/**
 * Выгрузка конфигурации: чертёж PDF, DXF и коммерческое предложение.
 *
 * Клиент присылает только выбор пользователя — модель, габариты, опции.
 * Цена, расход и состав пересчитываются здесь, на сервере, из каталога:
 * подменить цену в КП со стороны браузера нельзя.
 */

export const runtime = 'nodejs';

const LIMITS = {
  w: [600, 3000],
  d: [600, 1600],
  h: [300, 700],
} as const;

const KINDS = ['pdf', 'dxf', 'quote', 'ifc'] as const;
type Kind = (typeof KINDS)[number];

const OPTIONS = [
  'Врезка присоединительная',
  'Проушины для монтажа',
  'Кран для слива жира и конденсата',
  'Точечные светодиодные светильники',
];

interface Body {
  kind?: string;
  slug?: string;
  dims?: { h?: unknown; w?: unknown; d?: unknown };
  material?: string;
  options?: unknown;
}

/**
 * Имя файла для Content-Disposition. В заголовке допустим только ASCII,
 * поэтому кириллица уходит в filename* (RFC 5987), а транслит остаётся
 * запасным вариантом для старых клиентов.
 */
function contentDisposition(name: string): string {
  const ascii = translit(name).replace(/[^\x20-\x7E]/g, '_').replace(/"/g, '');
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : NaN);

function validateDims(raw: Body['dims']): Dims | null {
  const h = num(raw?.h);
  const w = num(raw?.w);
  const d = num(raw?.d);
  if ([h, w, d].some(Number.isNaN)) return null;
  if (h < LIMITS.h[0] || h > LIMITS.h[1]) return null;
  if (w < LIMITS.w[0] || w > LIMITS.w[1]) return null;
  if (d < LIMITS.d[0] || d > LIMITS.d[1]) return null;
  return { h: Math.round(h), w: Math.round(w), d: Math.round(d) };
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Некорректный запрос' }, { status: 400 });
  }

  const kind = (KINDS as readonly string[]).includes(body.kind ?? '') ? (body.kind as Kind) : null;
  if (!kind) return NextResponse.json({ error: 'Неизвестный тип выгрузки' }, { status: 400 });

  const product = body.slug ? productBySlug(body.slug) : undefined;
  if (!product || !product.base) {
    return NextResponse.json({ error: 'Изделие не найдено в каталоге' }, { status: 404 });
  }

  const dims = validateDims(body.dims);
  if (!dims) {
    return NextResponse.json(
      { error: 'Некорректные габариты: укажите H/W/D в допустимых пределах' },
      { status: 400 },
    );
  }
  const material = body.material === '304' ? '304' : '430';
  const options = Array.isArray(body.options)
    ? body.options.filter((o): o is string => typeof o === 'string' && OPTIONS.includes(o))
    : [];

  const traits = traitsOf(product.family);
  const family = familyByCode(product.family);

  /* Базовая цена — из каталога, а не из запроса. */
  const basePrice = product.price ?? productsOf(product.family).find((p) => p.price)?.price ?? null;
  const calc = calculate(dims, traits, product.base, basePrice, material);

  const input = {
    dims,
    traits,
    calc,
    article: product.article,
    productName: family?.title ?? product.name,
    material: material as '430' | '304',
    lamps: options.includes(OPTIONS[3]),
  };
  const designation = buildSheet(input).designation;

  try {
    if (kind === 'ifc') {
      const ifc = buildIfc({ ...input, designation });
      return new NextResponse(ifc, {
        headers: {
          'Content-Type': 'application/x-step; charset=utf-8',
          'Content-Disposition': contentDisposition(`${designation}.ifc`),
          'Cache-Control': 'no-store',
        },
      });
    }

    if (kind === 'dxf') {
      const dxf = buildDxf(input);
      return new NextResponse(dxf, {
        headers: {
          'Content-Type': 'application/dxf; charset=utf-8',
          'Content-Disposition': contentDisposition(`${designation}.dxf`),
          'Cache-Control': 'no-store',
        },
      });
    }

    const bytes =
      kind === 'pdf'
        ? await buildDrawingPdf(input)
        : await buildQuotePdf({
            ...input,
            options,
            company: {
              name: site.name,
              phone: site.phone,
              email: site.email,
              address: site.address,
              promo: site.promo,
            },
            leadTimeDays: '10–14 рабочих дней (уточняется производством)',
          });

    const suffix = kind === 'pdf' ? 'чертёж' : 'КП';
    return new NextResponse(Buffer.from(bytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': contentDisposition(`${designation}-${suffix}.pdf`),
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('[export] не удалось собрать файл', error);
    return NextResponse.json({ error: 'Не удалось собрать файл' }, { status: 500 });
  }
}
