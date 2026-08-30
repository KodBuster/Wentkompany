'use client';

import { useMemo, useRef } from 'react';
import {
  buildSheet, toSheet, STAMP_BOX,
  type DrawingInput, type Point, type Polyline, type View, type Dimension,
} from '@/lib/drawing';

const PAPER = '#F7F9FA';
const INK = '#14202A';
const THIN = '#6B7A85';
const DIM = '#1E6E93';
const ACCENT = '#C2461A';

const strokeOf = (style: Polyline['style']) => {
  if (style === 'dashed') return { stroke: THIN, strokeWidth: 0.4, strokeDasharray: '3 2' };
  if (style === 'thin') return { stroke: THIN, strokeWidth: 0.25, strokeDasharray: '6 1.5 1 1.5' };
  return { stroke: INK, strokeWidth: 0.7 };
};

function path(view: View, poly: Polyline, scale: number) {
  const pts = poly.pts.map((p) => toSheet(view, p, scale));
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(' ');
  return poly.closed ? `${d} Z` : d;
}

/** Размерная линия с засечками и выносными линиями — как на чертеже. */
function DimLine({ view, dim, scale }: { view: View; dim: Dimension; scale: number }) {
  const a = toSheet(view, dim.from, scale);
  const b = toSheet(view, dim.to, scale);
  const tick = 1.6;

  if (dim.axis === 'h') {
    const y = Math.max(a[1], b[1]) + dim.offset;
    return (
      <g>
        <line x1={a[0]} y1={a[1]} x2={a[0]} y2={y + 2} stroke={DIM} strokeWidth={0.25} />
        <line x1={b[0]} y1={b[1]} x2={b[0]} y2={y + 2} stroke={DIM} strokeWidth={0.25} />
        <line x1={a[0]} y1={y} x2={b[0]} y2={y} stroke={DIM} strokeWidth={0.35} />
        <line x1={a[0] - tick} y1={y + tick} x2={a[0] + tick} y2={y - tick} stroke={DIM} strokeWidth={0.4} />
        <line x1={b[0] - tick} y1={y + tick} x2={b[0] + tick} y2={y - tick} stroke={DIM} strokeWidth={0.4} />
        <text x={(a[0] + b[0]) / 2} y={y - 1.4} textAnchor="middle" fill={DIM} fontSize={4.2} fontFamily="var(--font-mono)">
          {dim.text}
        </text>
      </g>
    );
  }

  const x = Math.max(a[0], b[0]) + dim.offset;
  return (
    <g>
      <line x1={a[0]} y1={a[1]} x2={x + 2} y2={a[1]} stroke={DIM} strokeWidth={0.25} />
      <line x1={b[0]} y1={b[1]} x2={x + 2} y2={b[1]} stroke={DIM} strokeWidth={0.25} />
      <line x1={x} y1={a[1]} x2={x} y2={b[1]} stroke={DIM} strokeWidth={0.35} />
      <line x1={x - tick} y1={a[1] + tick} x2={x + tick} y2={a[1] - tick} stroke={DIM} strokeWidth={0.4} />
      <line x1={x - tick} y1={b[1] + tick} x2={x + tick} y2={b[1] - tick} stroke={DIM} strokeWidth={0.4} />
      <text
        x={x - 1.4}
        y={(a[1] + b[1]) / 2}
        textAnchor="middle"
        fill={DIM}
        fontSize={4.2}
        fontFamily="var(--font-mono)"
        transform={`rotate(-90 ${x - 1.4} ${(a[1] + b[1]) / 2})`}
      >
        {dim.text}
      </text>
    </g>
  );
}

export function HoodDrawing({ input }: { input: DrawingInput }) {
  const sheet = useMemo(() => buildSheet(input), [input]);
  const svgRef = useRef<SVGSVGElement>(null);

  const stampX = sheet.width - sheet.margin.other - STAMP_BOX.width;
  const stampY = sheet.height - sheet.margin.other - STAMP_BOX.height;
  const rowH = STAMP_BOX.height / 4;

  function downloadSvg() {
    const node = svgRef.current;
    if (!node) return;
    const source = new XMLSerializer().serializeToString(node);
    const blob = new Blob([`<?xml version="1.0" encoding="UTF-8"?>\n${source}`], {
      type: 'image/svg+xml;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sheet.designation}.svg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="drawing-wrap">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${sheet.width} ${sheet.height}`}
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label={`Чертёж ${sheet.designation}, три проекции, масштаб ${sheet.scaleLabel}`}
        className="drawing-sheet"
      >
        <rect x={0} y={0} width={sheet.width} height={sheet.height} fill={PAPER} />
        <rect
          x={sheet.margin.left}
          y={sheet.margin.other}
          width={sheet.width - sheet.margin.left - sheet.margin.other}
          height={sheet.height - sheet.margin.other * 2}
          fill="none"
          stroke={INK}
          strokeWidth={0.7}
        />

        {sheet.views.map((view) => (
          <g key={view.key}>
            {view.polys.map((poly, i) => (
              <path key={i} d={path(view, poly, sheet.scale)} fill="none" {...strokeOf(poly.style)} />
            ))}
            {view.circles.map((circle, i) => {
              const c = toSheet(view, circle.c, sheet.scale);
              return (
                <circle
                  key={i}
                  cx={c[0]}
                  cy={c[1]}
                  r={circle.r * sheet.scale}
                  fill="none"
                  {...strokeOf(circle.style ?? 'solid')}
                />
              );
            })}
            {view.dims.map((dim, i) => (
              <DimLine key={i} view={view} dim={dim} scale={sheet.scale} />
            ))}
            <text
              x={view.origin[0]}
              y={view.key === 'plan' ? view.origin[1] + 44 : view.origin[1] + 22}
              textAnchor="middle"
              fill={THIN}
              fontSize={3.8}
              fontFamily="var(--font-mono)"
              letterSpacing={0.4}
            >
              {view.title.toUpperCase()}
            </text>
          </g>
        ))}

        {/* технические требования */}
        <g>
          <text x={245} y={150} fill={THIN} fontSize={4} fontFamily="var(--font-mono)" letterSpacing={0.3}>
            ТЕХНИЧЕСКИЕ ТРЕБОВАНИЯ
          </text>
          {sheet.notes.map((note, i) => (
            <text key={i} x={245} y={157 + i * 5} fill={INK} fontSize={3.7} fontFamily="var(--font-mono)">
              {note}
            </text>
          ))}
        </g>

        {/* штамп */}
        <g>
          <rect x={stampX} y={stampY} width={STAMP_BOX.width} height={STAMP_BOX.height} fill="none" stroke={INK} strokeWidth={0.7} />
          {[1, 2, 3].map((i) => (
            <line
              key={i}
              x1={stampX}
              y1={stampY + rowH * i}
              x2={stampX + STAMP_BOX.width}
              y2={stampY + rowH * i}
              stroke={INK}
              strokeWidth={0.3}
            />
          ))}
          <line
            x1={stampX + STAMP_BOX.width / 2}
            y1={stampY}
            x2={stampX + STAMP_BOX.width / 2}
            y2={stampY + STAMP_BOX.height}
            stroke={INK}
            strokeWidth={0.3}
          />
          {sheet.stamp.map((row, i) => {
            const col = i % 2;
            const line = Math.floor(i / 2);
            const x = stampX + 3 + col * (STAMP_BOX.width / 2);
            const y = stampY + rowH * line;
            const isStatus = row.label === 'Статус';
            return (
              <g key={row.label}>
                <text x={x} y={y + 5} fill={THIN} fontSize={2.9} fontFamily="var(--font-mono)" letterSpacing={0.3}>
                  {row.label.toUpperCase()}
                </text>
                <text
                  x={x}
                  y={y + 11}
                  fill={isStatus ? ACCENT : INK}
                  fontSize={row.value.length > 26 ? 3.4 : 4.1}
                  fontFamily="var(--font-mono)"
                >
                  {row.value}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      <div className="drawing-actions">
        <span className="lbl">
          Лист {sheet.format} · масштаб {sheet.scaleLabel} · {sheet.designation}
        </span>
        <button type="button" className="btn btn-ghost" onClick={downloadSvg}>
          Скачать SVG
        </button>
      </div>
    </div>
  );
}
