#!/usr/bin/env node
/**
 * Собирает data/prices.json из tmp/hood-matrix.json (экспорт Excel).
 * Legacy sources (ПИР/ГФ/ЗВПГ/ЗВОГ) и options сохраняются.
 * ЗПВП/ЗПВО в sources не пишутся.
 *
 * Запуск: node scripts/import-hood-prices.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const matrixPath = join(root, 'tmp', 'hood-matrix.json');
const pricesPath = join(root, 'data', 'prices.json');

const entries = JSON.parse(readFileSync(matrixPath, 'utf8'));
const existing = JSON.parse(readFileSync(pricesPath, 'utf8'));

const matrix = {};
for (const e of entries) {
  if (!e?.article || e.source == null) continue;
  const key = `${e.h}|${e.d}|${e.w}`;
  if (!matrix[e.article]) matrix[e.article] = {};
  matrix[e.article][key] = Math.round(Number(e.source));
}

for (const art of Object.keys(matrix)) {
  const sorted = {};
  for (const key of Object.keys(matrix[art]).sort((a, b) => {
    const [ah, ad, aw] = a.split('|').map(Number);
    const [bh, bd, bw] = b.split('|').map(Number);
    return ah - bh || ad - bd || aw - bw;
  })) {
    sorted[key] = matrix[art][key];
  }
  matrix[art] = sorted;
}

const out = {
  version: 2,
  updatedAt: new Date().toISOString().slice(0, 10),
  notes: [
    'Раздел notes сайт не читает.',
    'factors.discountPct применяется только к legacy sources (ПИР, ГФ, ЗВПГ, ЗВОГ): сначала −%, затем +markup%.',
    'matrix — исходные цены ЗВП/ЗВО по H|D|W; витрина = source × (1+markupPct/100), без скидки, округление до 100 ₽.',
    'ЗПВП/ЗПВО в прайсе нет — цена по запросу.',
    'options — надбавки уже «наши», без factors.',
  ],
  factors: existing.factors ?? { discountPct: 10, markupPct: 20 },
  options: existing.options ?? {},
  sources: {
    ЗВПГ: existing.sources?.['ЗВПГ'] ?? 45000,
    ЗВОГ: existing.sources?.['ЗВОГ'] ?? 76000,
    ПИР: existing.sources?.['ПИР'] ?? 9600,
    ГФ: existing.sources?.['ГФ'] ?? 120000,
  },
  matrix,
};

writeFileSync(pricesPath, JSON.stringify(out, null, 2) + '\n', 'utf8');
const counts = Object.fromEntries(
  Object.entries(matrix).map(([k, v]) => [k, Object.keys(v).length]),
);
console.log('OK · prices.json matrix', counts);
