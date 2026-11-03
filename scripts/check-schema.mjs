#!/usr/bin/env node
/**
 * Offer карточки: стандарт под заказ, витринная цена гидрофильтра 129600,
 * оговорка в Offer совпадает с бейджем на странице.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const prices = JSON.parse(readFileSync(new URL('../data/prices.json', import.meta.url), 'utf8'));
const source = prices.sources['ГФ'];
assert.equal(source, 120000, 'исходная цена ГФ в прайсе');
const afterDiscount = source - source * (prices.factors.discountPct / 100);
const sell = Math.round(afterDiscount + afterDiscount * (prices.factors.markupPct / 100));
assert.equal(sell, 129600, 'витрина ГФ: −10% затем +20%');

const page = readFileSync(new URL('../src/app/catalog/[slug]/page.tsx', import.meta.url), 'utf8');
assert.match(page, /schema\.org\/MadeToOrder/);
assert.match(page, /цена стандартного типоразмера/);
assert.doesNotMatch(page, /InStock/);
assert.match(page, /name: 'Каталог', path: '\/#catalog'/);

for (const file of [
  'normy-mchs/page.tsx',
  'dlya-obshchepita/page.tsx',
  'chastnyy-dom/page.tsx',
  'nestandartnyy-zont/page.tsx',
]) {
  const src = readFileSync(new URL(`../src/app/${file}`, import.meta.url), 'utf8');
  assert.match(src, /<JsonLd data=\{faqJsonLd\} \/>/, `${file}: FAQ через JsonLd`);
  assert.doesNotMatch(src, /JSON\.stringify\(faqJsonLd\)/, `${file}: сырой stringify`);
}

console.log('OK · Offer: MadeToOrder, оговорка стандарта, витрина ГФ 129600, FAQ через JsonLd');
