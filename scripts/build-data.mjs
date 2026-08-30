#!/usr/bin/env node
/**
 * Нормализация выгрузки WooCommerce в data-слой сайта.
 * Вход:  ../wk-data/40a0a82a-catalog.json  (выгрузка от 30.08.2026)
 * Выход: src/data/catalog.json, src/data/redirects.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const SRC = process.argv[2] || '/home/claude/wk-data/40a0a82a-catalog.json';
const IMAGES = process.argv[3] || '/home/claude/wk-data/9b74747e-images.csv';

const raw = JSON.parse(fs.readFileSync(SRC, 'utf8'));

/** Семейства изделий: конструктивные признаки, от которых зависит расчёт. */
const FAMILIES = {
  'ЗВП':  { island: false, supply: false, hydro: false, title: 'Зонты вытяжные пристенные' },
  'ЗВО':  { island: true,  supply: false, hydro: false, title: 'Зонты вытяжные островные' },
  'ЗПВП': { island: false, supply: true,  hydro: false, title: 'Зонты приточно-вытяжные пристенные' },
  'ЗПВО': { island: true,  supply: true,  hydro: false, title: 'Зонты приточно-вытяжные островные' },
  'ЗВПГ': { island: false, supply: false, hydro: true,  title: 'Зонты пристенные с гидрозатвором' },
  'ЗВОГ': { island: true,  supply: false, hydro: true,  title: 'Зонты островные с гидрозатвором' },
  'ПИР':  { island: false, supply: false, hydro: false, title: 'Зонты купольные «Пирамида»' },
  'ГФ':   { island: false, supply: false, hydro: true,  title: 'Гидрофильтры' },
  'АВТ':  { island: false, supply: false, hydro: true,  title: 'Автоматика для гидрофильтров' },
};

/** Артикул → семейство. У «Пирамиды», гидрофильтра и щита артикула в выгрузке нет. */
function familyOf(p) {
  const a = (p.article || '').toUpperCase();
  if (a.startsWith('ЗПВО')) return 'ЗПВО';
  if (a.startsWith('ЗПВП')) return 'ЗПВП';
  if (a.startsWith('ЗВОГ')) return 'ЗВОГ';
  if (a.startsWith('ЗВПГ')) return 'ЗВПГ';
  if (a.startsWith('ЗВО'))  return 'ЗВО';
  if (a.startsWith('ЗВП'))  return 'ЗВП';
  if (/пирамида/i.test(p.name)) return 'ПИР';
  if (/^гидрофильтр$/i.test(p.name.trim())) return 'ГФ';
  if (/щит управления/i.test(p.name)) return 'АВТ';
  return null;
}

/** «450/1200/600 мм» → { h, w, d } */
function parseSize(s) {
  const m = String(s || '').match(/(\d{2,4})\s*[\/×x]\s*(\d{2,4})\s*[\/×x]\s*(\d{2,4})/);
  return m ? { h: +m[1], w: +m[2], d: +m[3] } : null;
}

function typeOf(name) {
  const m = name.match(/ТИП\s*(\d)/i);
  return m ? `ТИП ${m[1]}` : null;
}

function slugOf(p) {
  return p.slug;
}

/**
 * Чистим короткое описание: список опций, промокод и оговорка про оферту
 * выводятся на сайте отдельными блоками, в тексте они дублируются.
 */
function cleanShort(text) {
  return String(text || '')
    .replace(/Вытяжные зонты по желанию заказчика[\s\S]*$/i, '')
    .replace(/Скидка\s*10\s*%[\s\S]*$/i, '')
    .replace(/Стоимость товара носит[\s\S]*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/* --- изображения --- */
const images = {};
if (fs.existsSync(IMAGES)) {
  const lines = fs.readFileSync(IMAGES, 'utf8').replace(/^﻿/, '').split(/\r?\n/).slice(1);
  for (const line of lines) {
    if (!line.trim()) continue;
    const cols = line.split(',');
    const id = cols[0], url = cols[4];
    if (!id || !url) continue;
    (images[id] ||= []).push(url);
  }
}

const OPTIONS = [
  { key: 'врезка',      name: 'Врезка присоединительная', price: null },
  { key: 'проушины',    name: 'Проушины для монтажа',     price: null },
  { key: 'кран',        name: 'Кран для слива жира и конденсата', price: null },
  { key: 'светильники', name: 'Точечные светодиодные светильники', price: null },
];

const products = [];
for (const p of raw.products) {
  const family = familyOf(p);
  if (!family) continue; // нейтральное оборудование в каталог нового сайта не идёт
  const size = parseSize(p.base_size_mm);
  products.push({
    id: p.id,
    slug: slugOf(p),
    article: p.article || family,
    family,
    type: typeOf(p.name),
    name: p.name,
    price: p.price_rub || null,
    base: size,
    greaseTraps: !/без жироуловител/i.test(p.short_description || ''),
    materials: ['AISI 430', 'AISI 304'],
    options: OPTIONS.map((o) => o.name),
    short: cleanShort(p.short_description),
    description: (p.description || '').trim(),
    images: images[String(p.id)] || (p.image_main ? [p.image_main] : []),
    legacyUrl: new URL(p.permalink).pathname,
  });
}

products.sort((a, b) => (a.family + (a.type || '')).localeCompare(b.family + (b.type || ''), 'ru'));

/** Латинские слаги семейств — в URL кириллица не нужна. */
const FAMILY_SLUGS = {
  'ЗВП': 'zvp', 'ЗВО': 'zvo', 'ЗПВП': 'zpvp', 'ЗПВО': 'zpvo',
  'ЗВПГ': 'zvpg', 'ЗВОГ': 'zvog', 'ПИР': 'pir', 'ГФ': 'gf', 'АВТ': 'avt',
};

const families = Object.entries(FAMILIES).map(([code, f]) => {
  const items = products.filter((p) => p.family === code);
  const priced = items.filter((p) => p.price);
  return {
    code,
    ...f,
    slug: FAMILY_SLUGS[code],
    count: items.length,
    priceFrom: priced.length ? Math.min(...priced.map((p) => p.price)) : null,
  };
}).filter((f) => f.count > 0);

/* --- карта 301: старые URL WooCommerce → новые --- */
const CATEGORY_MAP = {
  'zonty-vytjazhnye-pristennye-zvp': 'zvp',
  'zonty-vytjazhnye-ostrovnye-zvo': 'zvo',
  'zonty-pritochno-vytjazhnye-pristennye': 'zpvp',
  'zonty-pritochno-vytjazhnye-ostrovnye-zpvo': 'zpvo',
  'zonty-vytjazhnye-pristennye-s-gidrozatvorom-zvpg': 'zvpg',
  'zonty-vytjazhnye-ostrovnye-s-gidrozatvorom-zvog': 'zvog',
  'zonty-vytjazhnye-kupolnye-piramida': 'pir',
  'gidrofiltr': 'gf',
  'avtomatika-dlja-gidrofiltrov': 'avt',
};

const redirects = [
  ...products.map((p) => ({ source: p.legacyUrl.replace(/\/$/, ''), destination: `/catalog/${p.slug}`, permanent: true })),
  ...Object.entries(CATEGORY_MAP).map(([oldSlug, code]) => ({
    source: `/product-category/${oldSlug}`, destination: `/catalog/${code}`, permanent: true,
  })),
  { source: '/shop', destination: '/catalog', permanent: true },
  { source: '/product-category/nejtralnoe-oborudovanie', destination: '/catalog', permanent: true },
];

fs.mkdirSync(path.join(ROOT, 'src/data'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'src/data/catalog.json'),
  JSON.stringify({ generatedAt: '2026-08-30', source: 'wentkompany.ru WooCommerce Store API', families, products }, null, 2));
fs.writeFileSync(path.join(ROOT, 'src/data/redirects.json'), JSON.stringify(redirects, null, 2));

console.log(`catalog.json: ${products.length} товаров, ${families.length} семейств`);
console.log(`redirects.json: ${redirects.length} правил`);
for (const f of families) console.log(`  ${f.code.padEnd(5)} ${String(f.count).padStart(2)} шт · от ${f.priceFrom ?? '—'} ₽`);
