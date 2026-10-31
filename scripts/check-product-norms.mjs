#!/usr/bin/env node
/**
 * Нормативный блок карточек: у отдельного гидрофильтра не должно быть
 * формулировок про встроенный гидрозатвор; пп. 5.31–5.32 — по типу изделия.
 * Запуск: npm run check:norms
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  assertGfNormsHaveNoBuiltInSealCopy,
  productNormCards,
} from '../src/lib/product-norms.ts';

assertGfNormsHaveNoBuiltInSealCopy();

const hood = productNormCards('ЗВПГ');
assert.ok(hood.some((c) => c.id === '5.31' && /гидрозатвор внутри/i.test(c.text)));

const gf = productNormCards('ГФ');
assert.equal(gf.length, 4);
assert.ok(!productNormCards('АВТ').length);
assert.ok(!productNormCards('ЗВП').length);

// Страница каталога должна брать тексты из product-norms, а не держать единый шаблон
const page = readFileSync(new URL('../src/app/catalog/[slug]/page.tsx', import.meta.url), 'utf8');
assert.match(page, /productNormCards/);
assert.doesNotMatch(
  page,
  /Гидрозатвор внутри зонта — участка/,
  'единый шаблон п. 5.31 снова вшит в page.tsx',
);

console.log('OK · нормативные тексты ГФ / гидрозонт разделены, запрещённые формулировки на ГФ отсутствуют');
