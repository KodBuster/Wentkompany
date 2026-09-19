/**
 * Сборка PDF на сервере: лист чертежа и коммерческое предложение.
 *
 * Векторная графика берётся из того же генератора, что и SVG на экране,
 * поэтому печатный лист повторяет то, что видел инженер, один в один.
 * Кириллица — встроенным DejaVu Sans Mono (public/fonts), без него
 * в PDF нет русских глифов.
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { PDFDocument, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { buildSheet, toSheet, STAMP_BOX, type DrawingInput, type Point } from './drawing.ts';
import { buildLayout } from './geometry.ts';
import { ru, rub, dec } from './calc.ts';

/** 1 мм в пунктах PDF. */
const MM = 72 / 25.4;

const INK = rgb(0.08, 0.13, 0.16);
const THIN = rgb(0.42, 0.48, 0.52);
const DIM = rgb(0.12, 0.43, 0.58);
const ACCENT = rgb(0.76, 0.27, 0.1);
const PAPER = rgb(1, 1, 1);

let cache: { regular: Uint8Array; bold: Uint8Array } | null = null;

async function fonts() {
  if (!cache) {
    const dir = path.join(process.cwd(), 'public', 'fonts');
    const [regular, bold] = await Promise.all([
      readFile(path.join(dir, 'DejaVuSansMono.ttf')),
      readFile(path.join(dir, 'DejaVuSansMono-Bold.ttf')),
    ]);
    cache = { regular: new Uint8Array(regular), bold: new Uint8Array(bold) };
  }
  return cache;
}

interface Ctx {
  page: PDFPage;
  font: PDFFont;
  bold: PDFFont;
  /** Высота листа в мм — для инверсии оси Y. */
  sheetHeight: number;
}

const X = (mm: number) => mm * MM;
const Y = (ctx: Ctx, mm: number) => (ctx.sheetHeight - mm) * MM;

function drawLine(ctx: Ctx, a: Point, b: Point, color = INK, width = 0.25, dashed = false) {
  ctx.page.drawLine({
    start: { x: X(a[0]), y: Y(ctx, a[1]) },
    end: { x: X(b[0]), y: Y(ctx, b[1]) },
    thickness: width * MM,
    color,
    dashArray: dashed ? [3 * MM, 2 * MM] : undefined,
  });
}

function drawText(
  ctx: Ctx,
  value: string,
  at: Point,
  size: number,
  color = INK,
  opts: { bold?: boolean; align?: 'left' | 'center' | 'right'; rotate?: number } = {},
) {
  const font = opts.bold ? ctx.bold : ctx.font;
  const pt = size * MM;
  const width = font.widthOfTextAtSize(value, pt);
  let x = X(at[0]);
  if (opts.align === 'center') x -= width / 2;
  if (opts.align === 'right') x -= width;
  ctx.page.drawText(value, { x, y: Y(ctx, at[1]), size: pt, font, color });
}

/* ------------------------------------------------------------------ */
/* Лист чертежа                                                        */
/* ------------------------------------------------------------------ */

export async function buildDrawingPdf(input: DrawingInput): Promise<Uint8Array> {
  const sheet = buildSheet(input);
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const { regular, bold } = await fonts();
  const font = await doc.embedFont(regular, { subset: true });
  const boldFont = await doc.embedFont(bold, { subset: true });

  const page = doc.addPage([sheet.width * MM, sheet.height * MM]);
  const ctx: Ctx = { page, font, bold: boldFont, sheetHeight: sheet.height };

  page.drawRectangle({ x: 0, y: 0, width: sheet.width * MM, height: sheet.height * MM, color: PAPER });

  // рамка листа
  const frame: Point[] = [
    [sheet.margin.left, sheet.margin.other],
    [sheet.width - sheet.margin.other, sheet.margin.other],
    [sheet.width - sheet.margin.other, sheet.height - sheet.margin.other],
    [sheet.margin.left, sheet.height - sheet.margin.other],
  ];
  for (let i = 0; i < frame.length; i++) {
    drawLine(ctx, frame[i], frame[(i + 1) % frame.length], INK, 0.7);
  }

  for (const view of sheet.views) {
    for (const poly of view.polys) {
      const pts = poly.pts.map((p) => toSheet(view, p, sheet.scale));
      const dashed = poly.style === 'dashed' || poly.style === 'thin';
      const color = poly.style === 'solid' || !poly.style ? INK : THIN;
      const width = poly.style === 'solid' || !poly.style ? 0.6 : 0.3;
      for (let i = 0; i < pts.length - 1; i++) drawLine(ctx, pts[i], pts[i + 1], color, width, dashed);
      if (poly.closed && pts.length > 2) drawLine(ctx, pts[pts.length - 1], pts[0], color, width, dashed);
    }

    for (const ci of view.circles) {
      const c = toSheet(view, ci.c, sheet.scale);
      page.drawCircle({
        x: X(c[0]),
        y: Y(ctx, c[1]),
        size: ci.r * sheet.scale * MM,
        borderColor: ci.style === 'thin' ? THIN : INK,
        borderWidth: (ci.style === 'thin' ? 0.25 : 0.6) * MM,
      });
    }

    for (const dim of view.dims) {
      const a = toSheet(view, dim.from, sheet.scale);
      const b = toSheet(view, dim.to, sheet.scale);
      const tick = 1.6;
      if (dim.axis === 'h') {
        const y = Math.max(a[1], b[1]) + dim.offset;
        drawLine(ctx, [a[0], a[1]], [a[0], y + 2], DIM, 0.2);
        drawLine(ctx, [b[0], b[1]], [b[0], y + 2], DIM, 0.2);
        drawLine(ctx, [a[0], y], [b[0], y], DIM, 0.3);
        drawLine(ctx, [a[0] - tick, y + tick], [a[0] + tick, y - tick], DIM, 0.35);
        drawLine(ctx, [b[0] - tick, y + tick], [b[0] + tick, y - tick], DIM, 0.35);
        drawText(ctx, dim.text, [(a[0] + b[0]) / 2, y - 1.6], 3.6, DIM, { align: 'center' });
      } else {
        const x = Math.max(a[0], b[0]) + dim.offset;
        drawLine(ctx, [a[0], a[1]], [x + 2, a[1]], DIM, 0.2);
        drawLine(ctx, [b[0], b[1]], [x + 2, b[1]], DIM, 0.2);
        drawLine(ctx, [x, a[1]], [x, b[1]], DIM, 0.3);
        drawText(ctx, dim.text, [x + 2.5, (a[1] + b[1]) / 2 + 1.2], 3.6, DIM);
      }
    }

    drawText(
      ctx,
      view.title.toUpperCase(),
      [view.origin[0], view.key === 'plan' ? view.origin[1] + 44 : view.origin[1] + 22],
      3.4,
      THIN,
      { align: 'center' },
    );
  }

  // технические требования
  drawText(ctx, 'ТЕХНИЧЕСКИЕ ТРЕБОВАНИЯ', [245, 150], 3.6, THIN, { bold: true });
  sheet.notes.forEach((note, i) => drawText(ctx, note, [245, 157 + i * 5], 3.3, INK));

  // штамп
  const sx = sheet.width - sheet.margin.other - STAMP_BOX.width;
  const sy = sheet.height - sheet.margin.other - STAMP_BOX.height;
  const rowH = STAMP_BOX.height / 4;
  const box: Point[] = [
    [sx, sy], [sx + STAMP_BOX.width, sy],
    [sx + STAMP_BOX.width, sy + STAMP_BOX.height], [sx, sy + STAMP_BOX.height],
  ];
  for (let i = 0; i < box.length; i++) drawLine(ctx, box[i], box[(i + 1) % box.length], INK, 0.6);
  for (let i = 1; i < 4; i++) {
    drawLine(ctx, [sx, sy + rowH * i], [sx + STAMP_BOX.width, sy + rowH * i], INK, 0.25);
  }
  drawLine(ctx, [sx + STAMP_BOX.width / 2, sy], [sx + STAMP_BOX.width / 2, sy + STAMP_BOX.height], INK, 0.25);

  sheet.stamp.forEach((row, i) => {
    const col = i % 2;
    const lineIndex = Math.floor(i / 2);
    const x = sx + 3 + col * (STAMP_BOX.width / 2);
    const y = sy + rowH * lineIndex;
    drawText(ctx, row.label.toUpperCase(), [x, y + 5], 2.6, THIN);
    drawText(ctx, row.value, [x, y + 11], row.value.length > 26 ? 3 : 3.6, row.label === 'Статус' ? ACCENT : INK, {
      bold: row.label === 'Обозначение',
    });
  });

  return doc.save();
}

/* ------------------------------------------------------------------ */
/* Коммерческое предложение                                            */
/* ------------------------------------------------------------------ */

export interface QuoteInput extends DrawingInput {
  options: string[];
  company: { name: string; phone: string; email: string; address: string; promo: string };
  leadTimeDays: string;
}

export async function buildQuotePdf(input: QuoteInput): Promise<Uint8Array> {
  const sheet = buildSheet(input);
  const layout = buildLayout(input.dims, input.traits, input.calc.ducts, {
    lamps: input.lamps,
    typeLabel: input.typeLabel,
  });
  const { calc, dims, material, company } = input;

  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const { regular, bold } = await fonts();
  const font = await doc.embedFont(regular, { subset: true });
  const boldFont = await doc.embedFont(bold, { subset: true });

  const W = 210;
  const H = 297;
  const page = doc.addPage([W * MM, H * MM]);
  const ctx: Ctx = { page, font, bold: boldFont, sheetHeight: H };
  page.drawRectangle({ x: 0, y: 0, width: W * MM, height: H * MM, color: PAPER });

  const left = 18;
  const right = W - 18;
  let y = 22;

  // шапка
  drawText(ctx, 'WENTKOMPANY', [left, y], 6, INK, { bold: true });
  drawText(ctx, new Date().toLocaleDateString('ru-RU'), [right, y], 3.4, THIN, { align: 'right' });
  y += 6;
  drawText(ctx, company.phone + ' · ' + company.email, [left, y], 3.2, THIN);
  drawText(ctx, sheet.designation, [right, y], 3.4, ACCENT, { align: 'right' });
  y += 4;
  drawText(ctx, company.address, [left, y], 3.2, THIN);
  y += 6;
  drawLine(ctx, [left, y], [right, y], INK, 0.5);

  y += 12;
  drawText(ctx, 'КОММЕРЧЕСКОЕ ПРЕДЛОЖЕНИЕ', [left, y], 7, INK, { bold: true });
  y += 8;
  drawText(ctx, sheet.title, [left, y], 4, INK);
  y += 6;
  drawText(ctx, `Габарит H/W/D: ${dims.h} / ${dims.w} / ${dims.d} мм · сталь AISI ${material}`, [left, y], 3.6, THIN);

  // спецификация
  y += 12;
  drawText(ctx, 'СОСТАВ', [left, y], 3.4, THIN, { bold: true });
  y += 3;
  drawLine(ctx, [left, y], [right, y], THIN, 0.25);
  y += 6;

  const rows: [string, string][] = [
    [`${input.article} · ${dims.h}/${dims.w}/${dims.d}`, '1 шт'],
    ['Жироуловители лабиринтные', `${layout.filters.reduce((sum, r) => sum + r.count, 0)} шт`],
    [`Сталь AISI ${material}, площадь ${dec(calc.area)} м²`, ''],
    [`Патрубки Ø${calc.ducts.diameter}`, `${calc.ducts.count} шт`],
    ...input.options.map((o) => [o, 'по запросу'] as [string, string]),
    ...(input.traits.hydro
      ? ([
          ['Щит управления и диспетчеризации', '1 шт'],
          ['Воздуховод EI 45 после изделия', 'по проекту'],
        ] as [string, string][])
      : []),
    ...(input.traits.island ? ([['Подвес к перекрытию', '4 точки']] as [string, string][]) : []),
  ];

  for (const [name, qty] of rows) {
    drawText(ctx, name, [left, y], 3.4, INK);
    drawText(ctx, qty, [right, y], 3.4, THIN, { align: 'right' });
    y += 5.5;
  }

  // расчёт
  y += 6;
  drawText(ctx, 'РАСЧЁТНЫЕ ПАРАМЕТРЫ', [left, y], 3.4, THIN, { bold: true });
  y += 3;
  drawLine(ctx, [left, y], [right, y], THIN, 0.25);
  y += 6;
  const params: [string, string][] = [
    ['Расход воздуха', `${ru(calc.airflow)} м³/ч`],
    ['Патрубки', `${calc.ducts.count} × Ø${calc.ducts.diameter}, ${dec(calc.ducts.velocity)} м/с`],
    ['Периметр захвата', `${dec(calc.perimeter)} м`],
    ['Масса, ориентир', `${ru(calc.mass)} кг`],
  ];
  for (const [k, v] of params) {
    drawText(ctx, k, [left, y], 3.4, THIN);
    drawText(ctx, v, [right, y], 3.4, INK, { align: 'right' });
    y += 5.5;
  }

  // цена
  y += 8;
  const price = calc.price;
  drawLine(ctx, [left, y], [right, y], INK, 0.5);
  y += 9;
  drawText(ctx, 'ЦЕНА', [left, y], 3.4, THIN, { bold: true });
  drawText(
    ctx,
    price ? `${price.estimate ? '≈ ' : ''}${rub(price.value)}` : 'по запросу',
    [right, y + 2],
    9,
    ACCENT,
    { align: 'right', bold: true },
  );
  y += 8;
  if (price) drawText(ctx, price.note, [left, y], 3.1, THIN);
  y += 6;
  drawText(ctx, `Срок изготовления: ${input.leadTimeDays}`, [left, y], 3.4, INK);
  y += 5.5;
  drawText(ctx, `Скидка 10 % на первый заказ по промокоду ${company.promo}`, [left, y], 3.4, INK);

  // примечания
  y += 12;
  drawText(ctx, 'ПРИМЕЧАНИЯ', [left, y], 3.4, THIN, { bold: true });
  y += 3;
  drawLine(ctx, [left, y], [right, y], THIN, 0.25);
  y += 6;
  const notes = [
    ...sheet.notes,
    'Стоимость носит информационный характер и не является публичной офертой.',
  ];
  for (const note of notes) {
    drawText(ctx, note, [left, y], 3.1, THIN);
    y += 4.6;
  }

  // подвал
  drawLine(ctx, [left, H - 24], [right, H - 24], THIN, 0.25);
  drawText(ctx, `${company.name} · ${company.phone} · ${company.email}`, [left, H - 18], 3.2, THIN);
  drawText(ctx, `Чертёж прилагается отдельно, масштаб ${sheet.scaleLabel}`, [left, H - 13], 3.2, THIN);

  return doc.save();
}
