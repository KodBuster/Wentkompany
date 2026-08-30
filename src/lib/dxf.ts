/**
 * Экспорт чертежа в DXF.
 *
 * Формат — AC1009 (R12): минимальный, открывается любым CAD и nanoCAD/AutoCAD
 * без плясок с секциями. Плата за совместимость — отсутствие Unicode: R12
 * не поддерживает \U+ escape, поэтому подписи транслитерируются в латиницу.
 * Геометрия при этом полноценная и в натуральную величину 1:1 — масштаб
 * назначается при печати из CAD, а не зашивается в файл.
 *
 * Полилинии берутся из того же генератора, что и SVG-лист (`drawing.ts`),
 * поэтому чертёж и выгрузка не могут разойтись.
 */

import { buildSheet, type DrawingInput, type Point, type View } from './drawing.ts';

const LAYERS = {
  contour: 'CONTOUR',
  hidden: 'HIDDEN',
  axis: 'AXIS',
  dim: 'DIM',
  text: 'TEXT',
} as const;

const TRANSLIT: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i',
  й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't',
  у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '',
  э: 'e', ю: 'yu', я: 'ya',
};

/** Кириллица → латиница: R12 не умеет Unicode в TEXT. */
export function translit(text: string): string {
  return text
    .split('')
    .map((ch) => {
      const lower = ch.toLowerCase();
      const mapped = TRANSLIT[lower];
      if (mapped === undefined) return ch;
      return ch === lower ? mapped : mapped.toUpperCase();
    })
    .join('')
    .replace(/[³²]/g, (m) => (m === '³' ? '3' : '2'))
    .replace(/Ø/g, 'D')
    .replace(/[«»„“”]/g, '"')
    .replace(/[—–]/g, '-')
    .replace(/\u00A0/g, ' ')   // неразрывный пробел из toLocaleString
    .replace(/×/g, 'x')
    .replace(/±/g, '+/-')
    .replace(/°/g, ' deg')
    .replace(/≥/g, '>=')
    .replace(/≤/g, '<=')
    .replace(/№/g, 'No')
    .replace(/[^\x20-\x7E]/g, '');
}

interface Cursor {
  out: string[];
}

const pair = (c: Cursor, code: number, value: string | number) => {
  c.out.push(String(code), String(value));
};

function line(c: Cursor, layer: string, a: Point, b: Point) {
  pair(c, 0, 'LINE');
  pair(c, 8, layer);
  pair(c, 10, a[0].toFixed(3));
  pair(c, 20, a[1].toFixed(3));
  pair(c, 30, '0.0');
  pair(c, 11, b[0].toFixed(3));
  pair(c, 21, b[1].toFixed(3));
  pair(c, 31, '0.0');
}

function circle(c: Cursor, layer: string, center: Point, r: number) {
  pair(c, 0, 'CIRCLE');
  pair(c, 8, layer);
  pair(c, 10, center[0].toFixed(3));
  pair(c, 20, center[1].toFixed(3));
  pair(c, 30, '0.0');
  pair(c, 40, r.toFixed(3));
}

function text(c: Cursor, layer: string, at: Point, height: number, value: string, align: 'left' | 'center' = 'left') {
  pair(c, 0, 'TEXT');
  pair(c, 8, layer);
  pair(c, 10, at[0].toFixed(3));
  pair(c, 20, at[1].toFixed(3));
  pair(c, 30, '0.0');
  pair(c, 40, height.toFixed(2));
  pair(c, 1, translit(value));
  if (align === 'center') {
    pair(c, 72, 1);
    pair(c, 11, at[0].toFixed(3));
    pair(c, 21, at[1].toFixed(3));
    pair(c, 31, '0.0');
  }
}

const layerOf = (style: string | undefined) =>
  style === 'dashed' ? LAYERS.hidden : style === 'thin' ? LAYERS.axis : LAYERS.contour;

/** Раскладка видов в натуральную величину: виды разносятся по габаритам изделия. */
function placement(view: View, dims: { w: number; d: number; h: number }): Point {
  const gapX = Math.max(dims.w, dims.d) * 0.35 + 300;
  const gapY = dims.h + 600;
  if (view.key === 'front') return [0, 0];
  if (view.key === 'side') return [dims.w / 2 + dims.d / 2 + gapX, 0];
  return [0, -(dims.d / 2 + gapY)];
}

export function buildDxf(input: DrawingInput): string {
  const sheet = buildSheet(input);
  const { dims } = input;
  const c: Cursor = { out: [] };

  /* ---- заголовок ---- */
  pair(c, 0, 'SECTION');
  pair(c, 2, 'HEADER');
  pair(c, 9, '$ACADVER');
  pair(c, 1, 'AC1009');
  pair(c, 9, '$INSUNITS');
  pair(c, 70, 4); // миллиметры
  pair(c, 0, 'ENDSEC');

  /* ---- слои ---- */
  pair(c, 0, 'SECTION');
  pair(c, 2, 'TABLES');
  pair(c, 0, 'TABLE');
  pair(c, 2, 'LAYER');
  pair(c, 70, Object.keys(LAYERS).length);
  const colors: Record<string, number> = {
    [LAYERS.contour]: 7,
    [LAYERS.hidden]: 8,
    [LAYERS.axis]: 4,
    [LAYERS.dim]: 5,
    [LAYERS.text]: 3,
  };
  for (const name of Object.values(LAYERS)) {
    pair(c, 0, 'LAYER');
    pair(c, 2, name);
    pair(c, 70, 0);
    pair(c, 62, colors[name]);
    pair(c, 6, name === LAYERS.hidden ? 'DASHED' : 'CONTINUOUS');
  }
  pair(c, 0, 'ENDTAB');
  pair(c, 0, 'ENDSEC');

  /* ---- геометрия ---- */
  pair(c, 0, 'SECTION');
  pair(c, 2, 'ENTITIES');

  for (const view of sheet.views) {
    const [ox, oy] = placement(view, dims);
    const at = (p: Point): Point => [ox + p[0], oy + p[1]];

    for (const poly of view.polys) {
      const pts = poly.pts.map(at);
      for (let i = 0; i < pts.length - 1; i++) line(c, layerOf(poly.style), pts[i], pts[i + 1]);
      if (poly.closed && pts.length > 2) line(c, layerOf(poly.style), pts[pts.length - 1], pts[0]);
    }

    for (const ci of view.circles) circle(c, layerOf(ci.style), at(ci.c), ci.r);

    /* размерные цепи: линии + надписи (полноценные DIMENSION в R12 требуют блоков) */
    for (const dim of view.dims) {
      const a = at(dim.from);
      const b = at(dim.to);
      const off = dim.offset / sheet.scale; // вынос листа → натуральная величина
      if (dim.axis === 'h') {
        const y = Math.min(a[1], b[1]) - off;
        line(c, LAYERS.dim, [a[0], a[1]], [a[0], y - 20]);
        line(c, LAYERS.dim, [b[0], b[1]], [b[0], y - 20]);
        line(c, LAYERS.dim, [a[0], y], [b[0], y]);
        text(c, LAYERS.dim, [(a[0] + b[0]) / 2, y + 20], 35, dim.text, 'center');
      } else {
        const x = Math.max(a[0], b[0]) + off;
        line(c, LAYERS.dim, [a[0], a[1]], [x + 20, a[1]]);
        line(c, LAYERS.dim, [b[0], b[1]], [x + 20, b[1]]);
        line(c, LAYERS.dim, [x, a[1]], [x, b[1]]);
        text(c, LAYERS.dim, [x + 30, (a[1] + b[1]) / 2], 35, dim.text);
      }
    }

    text(c, LAYERS.text, [ox, oy - dims.h * 0.5 - 260], 40, view.title, 'center');
  }

  /* ---- штамп и технические требования текстом ---- */
  const stampX = dims.w / 2 + dims.d + 1200;
  let stampY = 0;
  text(c, LAYERS.text, [stampX, stampY], 55, sheet.designation);
  stampY -= 90;
  text(c, LAYERS.text, [stampX, stampY], 40, sheet.title);
  for (const row of sheet.stamp) {
    stampY -= 70;
    text(c, LAYERS.text, [stampX, stampY], 35, `${row.label}: ${row.value}`);
  }
  stampY -= 120;
  text(c, LAYERS.text, [stampX, stampY], 40, 'TEHNICHESKIE TREBOVANIYA');
  for (const note of sheet.notes) {
    stampY -= 60;
    text(c, LAYERS.text, [stampX, stampY], 32, note);
  }

  pair(c, 0, 'ENDSEC');
  pair(c, 0, 'EOF');

  return c.out.join('\r\n') + '\r\n';
}
