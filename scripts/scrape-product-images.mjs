/**
 * Собирает URL фото с карточек wentkompany.ru по legacyUrl из catalog.json.
 * Пишет scripts/.cache/product-images.json — карта article → [urls].
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CATALOG = join(ROOT, 'src', 'data', 'catalog.json');
const OUT = join(ROOT, 'scripts', '.cache', 'product-images.json');

const catalog = JSON.parse(readFileSync(CATALOG, 'utf8'));
const map = {};

function extractImgs(html) {
  const found = [];
  const re = /https?:\/\/wentkompany\.ru\/wp-content\/uploads\/[^"'\\\s>]+/gi;
  let m;
  while ((m = re.exec(html))) found.push(m[0].replace(/&amp;/g, '&'));
  // data-src / src относительные
  const re2 = /(?:data-large_image|data-src|src)=["']([^"']*\/wp-content\/uploads\/[^"']+)["']/gi;
  while ((m = re2.exec(html))) {
    let u = m[1].replace(/&amp;/g, '&');
    if (u.startsWith('//')) u = 'https:' + u;
    else if (u.startsWith('/')) u = 'https://wentkompany.ru' + u;
    found.push(u);
  }
  const uniq = [...new Set(found)].filter(
    (u) =>
      /\.(jpe?g|png|webp|gif)(\?|$)/i.test(u) &&
      !/logo|icon|favicon|sprite|woocommerce|avatar|badge|payment|cart/i.test(u),
  );
  // убираем миниатюры -150x150 и т.п., оставляем полные или -scaled
  const prefer = uniq.filter((u) => !/-\d+x\d+\.(jpe?g|png|webp|gif)/i.test(u));
  return prefer.length ? prefer : uniq;
}

for (const p of catalog.products) {
  const path = p.legacyUrl?.replace(/\/$/, '') + '/';
  if (!path) continue;
  const url = 'https://wentkompany.ru' + path;
  process.stdout.write(`${p.article} … `);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'WentkompanyLocalPort/1.0' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const imgs = extractImgs(html);
    map[p.article] = { legacyUrl: path, page: url, images: imgs };
    console.log(`${imgs.length} шт`);
  } catch (e) {
    map[p.article] = { legacyUrl: path, page: url, images: [], error: String(e.message || e) };
    console.log('ERR', e.message);
  }
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(map, null, 2) + '\n');
console.log('\n→', OUT);
