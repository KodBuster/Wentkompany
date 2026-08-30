/**
 * Перенос картинок со старого сайта в public/catalog.
 *
 * ВАЖНО: запускать ДО переключения домена на новый сайт. Сейчас карточки
 * товаров тянут изображения с wentkompany.ru; в момент, когда домен начнёт
 * указывать на новый сайт, эти адреса перестанут существовать, и картинки
 * пропадут. Скрипт снимает эту зависимость.
 *
 * Что делает:
 *   1. читает адреса изображений из src/data/catalog.json;
 *   2. скачивает каждое в public/catalog/ под транслитерированным именем
 *      (в исходных URL кириллица — она ломает часть CDN и кэшей);
 *   3. переписывает пути в catalog.json на локальные;
 *   4. печатает список того, что не скачалось, — молча ничего не теряем.
 *
 * Запуск:  node scripts/fetch-images.mjs
 *          node scripts/fetch-images.mjs --dry   (только показать план)
 *
 * После успешного прогона можно убрать images.remotePatterns из next.config.ts.
 */

import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const OUT_DIR = join(ROOT, 'public', 'catalog');
const CATALOG = join(ROOT, 'src', 'data', 'catalog.json');
const DRY = process.argv.includes('--dry');

/** Кириллица в имени файла → латиница. Совпадает с транслитерацией в src/lib/dxf.ts. */
const MAP = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i',
  й: 'j', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't',
  у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'shh', ъ: '', ы: 'y', ь: '',
  э: 'e', ю: 'ju', я: 'ja',
};

function slugFile(name) {
  const lower = decodeURIComponent(name).toLowerCase();
  const ext = extname(lower) || '.jpg';
  const base = lower
    .slice(0, lower.length - ext.length)
    .split('')
    .map((ch) => MAP[ch] ?? ch)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${base || 'image'}${ext}`;
}

const catalog = JSON.parse(readFileSync(CATALOG, 'utf8'));
const jobs = new Map(); // url → локальное имя

for (const product of catalog.products) {
  for (const url of product.images ?? []) {
    if (!url.startsWith('http')) continue;
    const file = slugFile(url.split('/').pop());
    // одинаковые имена от разных товаров разводим артикулом
    const unique = [...jobs.values()].includes(file)
      ? `${slugFile(product.article)}-${file}`
      : file;
    jobs.set(url, unique);
  }
}

console.log(`Изображений в каталоге: ${jobs.size}`);
if (DRY) {
  for (const [url, file] of jobs) console.log(`  ${url}\n    → public/catalog/${file}`);
  process.exit(0);
}

mkdirSync(OUT_DIR, { recursive: true });

const failed = [];
let saved = 0;
let skipped = 0;

for (const [url, file] of jobs) {
  const dest = join(OUT_DIR, file);
  if (existsSync(dest)) {
    skipped += 1;
    continue;
  }
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 512) throw new Error('файл подозрительно мал');
    writeFileSync(dest, buf);
    saved += 1;
    process.stdout.write('.');
  } catch (err) {
    failed.push({ url, reason: err.message });
  }
}

process.stdout.write('\n');

// пути переписываем только у того, что реально скачалось
const ok = new Set([...jobs.entries()].filter(([, f]) => existsSync(join(OUT_DIR, f))).map(([u]) => u));
for (const product of catalog.products) {
  product.images = (product.images ?? []).map((url) => (ok.has(url) ? `/catalog/${jobs.get(url)}` : url));
}
writeFileSync(CATALOG, JSON.stringify(catalog, null, 2) + '\n');

console.log(`Скачано: ${saved}, уже было: ${skipped}, не удалось: ${failed.length}`);
if (failed.length) {
  console.log('\nНе скачались (эти товары остались на старых адресах):');
  for (const f of failed) console.log(`  ${f.url} — ${f.reason}`);
  console.log('\nПовторный запуск докачает только недостающее.');
}

const remaining = catalog.products.flatMap((p) => p.images).filter((u) => u.startsWith('http'));
if (remaining.length === 0) {
  console.log('\nВсе картинки локальные. Теперь можно убрать images.remotePatterns из next.config.ts.');
} else {
  console.log(`\nВНИМАНИЕ: ${remaining.length} изображений всё ещё тянутся со старого домена.`);
  console.log('Переключать домен нельзя, пока они не перенесены, — картинки пропадут.');
  process.exitCode = 1;
}
