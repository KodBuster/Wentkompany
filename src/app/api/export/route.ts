import { NextResponse } from 'next/server';
import { resolveDrawingInput, type DrawingRequest } from '@/lib/catalog-drawing';
import { buildDxf, translit } from '@/lib/dxf';
import { buildDrawingPdf, buildQuotePdf } from '@/lib/pdf';
import { buildIfc } from '@/lib/ifc';
import { buildDrawingSvg } from '@/lib/svg-drawing';
import { site } from '@/lib/site';

/**
 * Выгрузка конфигурации: чертёж PDF/SVG, DXF и коммерческое предложение.
 *
 * Клиент присылает выбор — модель, габариты, опции, опционально марку стали.
 * Без марки берётся дефолт линейки (304 для гидро, 430 для сухих).
 * Цена, расход и состав пересчитываются здесь, на сервере, из каталога:
 * подменить цену в КП со стороны браузера нельзя.
 */

export const runtime = 'nodejs';

const KINDS = ['pdf', 'svg', 'dxf', 'quote', 'ifc'] as const;
type Kind = (typeof KINDS)[number];

interface Body extends DrawingRequest {
  kind?: string;
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

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Некорректный запрос' }, { status: 400 });
  }

  const kind = (KINDS as readonly string[]).includes(body.kind ?? '') ? (body.kind as Kind) : null;
  if (!kind) return NextResponse.json({ error: 'Неизвестный тип выгрузки' }, { status: 400 });

  const resolved = resolveDrawingInput(body);
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }
  const { input, designation } = resolved;
  const options = input.options ?? [];

  try {
    if (kind === 'svg') {
      const { svg, designation: name } = buildDrawingSvg(input);
      return new NextResponse(svg, {
        headers: {
          'Content-Type': 'image/svg+xml; charset=utf-8',
          'Content-Disposition': contentDisposition(`${name}.svg`),
          'Cache-Control': 'no-store',
        },
      });
    }

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
