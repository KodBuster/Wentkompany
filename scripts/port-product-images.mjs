/**
 * Порт галерей с wentkompany.ru → public/catalog + обновление catalog.json.
 * Порядок фото как на старых карточках; файлы без правок содержимого.
 *
 * Запуск: node scripts/port-product-images.mjs
 */
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
} from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'public', 'catalog');
const CATALOG = join(ROOT, 'src', 'data', 'catalog.json');
const GALLERIES = join(ROOT, 'scripts', '.cache', 'product-galleries.json');
const BUILD = join(ROOT, 'scripts', 'build-data.mjs');

const FILE_STEM = {
  АВТ: 'avt',
  ГФ: 'gf',
  ЗВОГ: 'zvog',
  'ЗВО-1': 'zvo-1',
  'ЗВО-2': 'zvo-2',
  'ЗВО-3': 'zvo-3',
  ЗВПГ: 'zvpg',
  'ЗВП-1': 'zvp-1',
  'ЗВП-2': 'zvp-2',
  'ЗВП-3': 'zvp-3',
  'ЗПВО-1': 'zpvo-1',
  'ЗПВО-2': 'zpvo-2',
  'ЗПВО-3': 'zpvo-3',
  'ЗПВП-1': 'zpvp-1',
  'ЗПВП-2': 'zpvp-2',
  'ЗПВП-3': 'zpvp-3',
  ПИР: 'pir',
};

function encodeUrl(url) {
  // Кириллица в path → percent-encoding по сегментам
  const u = new URL(url);
  u.pathname = u.pathname
    .split('/')
    .map((seg) => encodeURIComponent(decodeURIComponent(seg)))
    .join('/');
  return u.toString();
}

mkdirSync(OUT_DIR, { recursive: true });
const galleries = JSON.parse(readFileSync(GALLERIES, 'utf8'));
const catalog = JSON.parse(readFileSync(CATALOG, 'utf8'));
const localMap = {}; // article → ['/catalog/...']

let saved = 0;
let failed = 0;

for (const [article, entry] of Object.entries(galleries)) {
  const stem = FILE_STEM[article];
  if (!stem) {
    console.warn('нет stem для', article);
    continue;
  }
  const paths = [];
  let i = 0;
  for (const url of entry.images || []) {
    i += 1;
    const ext = (extname(new URL(url).pathname).toLowerCase() || '.jpg').replace(
      /[^a-z0-9.]/g,
      '',
    ) || '.jpg';
    const file = entry.images.length === 1 ? `${stem}${ext}` : `${stem}-${i}${ext}`;
    const dest = join(OUT_DIR, file);
    try {
      const res = await fetch(encodeUrl(url), {
        headers: { 'User-Agent': 'WentkompanyLocalPort/1.0' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 1024) throw new Error(`мало байт: ${buf.length}`);
      writeFileSync(dest, buf);
      paths.push(`/catalog/${file}`);
      saved += 1;
      console.log(`✓ ${article} → ${file} (${Math.round(buf.length / 1024)} КБ)`);
    } catch (e) {
      failed += 1;
      console.error(`✗ ${article} ${url} — ${e.message}`);
    }
  }
  localMap[article] = paths;
}

for (const p of catalog.products) {
  if (localMap[p.article]?.length) p.images = localMap[p.article];
}
writeFileSync(CATALOG, JSON.stringify(catalog, null, 2) + '\n');

// Обновляем LOCAL_IMAGES в build-data.mjs
let buildSrc = readFileSync(BUILD, 'utf8');
const block = Object.entries(localMap)
  .map(([k, arr]) => `  '${k}': ${JSON.stringify(arr)},`)
  .join('\n');
const next = `const LOCAL_IMAGES = {\n${block}\n};`;
if (!/const LOCAL_IMAGES = \{[\s\S]*?\n\};/.test(buildSrc)) {
  throw new Error('не найден блок LOCAL_IMAGES в build-data.mjs');
}
buildSrc = buildSrc.replace(/const LOCAL_IMAGES = \{[\s\S]*?\n\};/, next);
writeFileSync(BUILD, buildSrc);

console.log(`\nГотово: скачано ${saved}, ошибок ${failed}`);
console.log('Обновлены: src/data/catalog.json, scripts/build-data.mjs');
