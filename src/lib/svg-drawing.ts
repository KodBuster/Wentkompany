/**
 * Векторный SVG листа чертежа — тот же buildSheet, что на экране и в PDF.
 */

import {
  buildSheet,
  toSheet,
  STAMP_BOX,
  type DrawingInput,
  type Polyline,
  type View,
  type Dimension,
} from './drawing.ts';

const PAPER = '#F3EEE6';
const INK = '#14202A';
const THIN = '#6B7A85';
const DIM = '#1E6E93';
const ACCENT = '#C2461A';

function esc(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function strokeOf(style: Polyline['style']) {
  if (style === 'dashed') return `stroke="${THIN}" stroke-width="0.4" stroke-dasharray="3 2" fill="none"`;
  if (style === 'thin') return `stroke="${THIN}" stroke-width="0.25" stroke-dasharray="6 1.5 1 1.5" fill="none"`;
  return `stroke="${INK}" stroke-width="0.7" fill="none"`;
}

function pathD(view: View, poly: Polyline, scale: number) {
  const pts = poly.pts.map((p) => toSheet(view, p, scale));
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(' ');
  return poly.closed ? `${d} Z` : d;
}

function dimSvg(view: View, dim: Dimension, scale: number) {
  const a = toSheet(view, dim.from, scale);
  const b = toSheet(view, dim.to, scale);
  const tick = 1.6;
  if (dim.axis === 'h') {
    const y = Math.max(a[1], b[1]) + dim.offset;
    return [
      `<line x1="${a[0]}" y1="${a[1]}" x2="${a[0]}" y2="${y + 2}" stroke="${DIM}" stroke-width="0.25"/>`,
      `<line x1="${b[0]}" y1="${b[1]}" x2="${b[0]}" y2="${y + 2}" stroke="${DIM}" stroke-width="0.25"/>`,
      `<line x1="${a[0]}" y1="${y}" x2="${b[0]}" y2="${y}" stroke="${DIM}" stroke-width="0.35"/>`,
      `<line x1="${a[0] - tick}" y1="${y + tick}" x2="${a[0] + tick}" y2="${y - tick}" stroke="${DIM}" stroke-width="0.4"/>`,
      `<line x1="${b[0] - tick}" y1="${y + tick}" x2="${b[0] + tick}" y2="${y - tick}" stroke="${DIM}" stroke-width="0.4"/>`,
      `<text x="${(a[0] + b[0]) / 2}" y="${y - 1.4}" text-anchor="middle" fill="${DIM}" font-size="4.2" font-family="monospace">${esc(dim.text)}</text>`,
    ].join('');
  }
  const x = Math.max(a[0], b[0]) + dim.offset;
  const midY = (a[1] + b[1]) / 2;
  return [
    `<line x1="${a[0]}" y1="${a[1]}" x2="${x + 2}" y2="${a[1]}" stroke="${DIM}" stroke-width="0.25"/>`,
    `<line x1="${b[0]}" y1="${b[1]}" x2="${x + 2}" y2="${b[1]}" stroke="${DIM}" stroke-width="0.25"/>`,
    `<line x1="${x}" y1="${a[1]}" x2="${x}" y2="${b[1]}" stroke="${DIM}" stroke-width="0.35"/>`,
    `<line x1="${x - tick}" y1="${a[1] + tick}" x2="${x + tick}" y2="${a[1] - tick}" stroke="${DIM}" stroke-width="0.4"/>`,
    `<line x1="${x - tick}" y1="${b[1] + tick}" x2="${x + tick}" y2="${b[1] - tick}" stroke="${DIM}" stroke-width="0.4"/>`,
    `<text x="${x - 1.4}" y="${midY}" text-anchor="middle" fill="${DIM}" font-size="4.2" font-family="monospace" transform="rotate(-90 ${x - 1.4} ${midY})">${esc(dim.text)}</text>`,
  ].join('');
}

/** Собирает SVG-лист чертежа (мм в user units). */
export function buildDrawingSvg(input: DrawingInput): { svg: string; designation: string } {
  const sheet = buildSheet(input);
  const stampX = sheet.width - sheet.margin.other - STAMP_BOX.width;
  const stampY = sheet.height - sheet.margin.other - STAMP_BOX.height;
  const rowH = STAMP_BOX.height / 4;

  const views = sheet.views
    .map((view) => {
      const polys = view.polys
        .map((poly) => `<path d="${pathD(view, poly, sheet.scale)}" ${strokeOf(poly.style)}/>`)
        .join('');
      const circles = view.circles
        .map((circle) => {
          const c = toSheet(view, circle.c, sheet.scale);
          return `<circle cx="${c[0]}" cy="${c[1]}" r="${circle.r * sheet.scale}" ${strokeOf(circle.style ?? 'solid')}/>`;
        })
        .join('');
      const dims = view.dims.map((dim) => dimSvg(view, dim, sheet.scale)).join('');
      const titleY = view.key === 'plan' ? view.origin[1] + 44 : view.origin[1] + 22;
      const title = `<text x="${view.origin[0]}" y="${titleY}" text-anchor="middle" fill="${THIN}" font-size="3.6" font-family="monospace" letter-spacing="0.4">${esc(view.title.toUpperCase())}</text>`;
      return `<g>${polys}${circles}${dims}${title}</g>`;
    })
    .join('');

  const notesTitle = `<text x="245" y="150" fill="${THIN}" font-size="3.6" font-family="monospace" font-weight="700">ТЕХНИЧЕСКИЕ ТРЕБОВАНИЯ</text>`;
  const notes = sheet.notes
    .map(
      (note, i) =>
        `<text x="245" y="${157 + i * 5}" fill="${INK}" font-size="3.3" font-family="monospace">${esc(note)}</text>`,
    )
    .join('');

  const stampLines = [1, 2, 3]
    .map(
      (i) =>
        `<line x1="${stampX}" y1="${stampY + rowH * i}" x2="${stampX + STAMP_BOX.width}" y2="${stampY + rowH * i}" stroke="${INK}" stroke-width="0.3"/>`,
    )
    .join('');
  const stampCells = sheet.stamp
    .map((row, i) => {
      const col = i % 2;
      const line = Math.floor(i / 2);
      const x = stampX + 3 + col * (STAMP_BOX.width / 2);
      const y = stampY + rowH * line;
      const fill = row.label === 'Статус' ? ACCENT : INK;
      const size = row.value.length > 26 ? 3.4 : 4.1;
      return [
        `<text x="${x}" y="${y + 5}" fill="${THIN}" font-size="2.9" font-family="monospace" letter-spacing="0.3">${esc(row.label.toUpperCase())}</text>`,
        `<text x="${x}" y="${y + 11}" fill="${fill}" font-size="${size}" font-family="monospace">${esc(row.value)}</text>`,
      ].join('');
    })
    .join('');

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${sheet.width} ${sheet.height}" width="${sheet.width}mm" height="${sheet.height}mm">
  <rect width="100%" height="100%" fill="${PAPER}"/>
  <rect x="${sheet.margin.left}" y="${sheet.margin.other}" width="${sheet.width - sheet.margin.left - sheet.margin.other}" height="${sheet.height - sheet.margin.other * 2}" fill="none" stroke="${INK}" stroke-width="0.7"/>
  ${views}
  ${notesTitle}
  ${notes}
  <g>
    <rect x="${stampX}" y="${stampY}" width="${STAMP_BOX.width}" height="${STAMP_BOX.height}" fill="none" stroke="${INK}" stroke-width="0.7"/>
    ${stampLines}
    <line x1="${stampX + STAMP_BOX.width / 2}" y1="${stampY}" x2="${stampX + STAMP_BOX.width / 2}" y2="${stampY + STAMP_BOX.height}" stroke="${INK}" stroke-width="0.3"/>
    ${stampCells}
  </g>
</svg>`;

  return { svg, designation: sheet.designation };
}
