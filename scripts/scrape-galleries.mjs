import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const catalog = JSON.parse(readFileSync(join(ROOT, 'src/data/catalog.json'), 'utf8'));

function abs(u) {
  if (!u) return null;
  u = u.replace(/&amp;/g, '&');
  if (u.startsWith('//')) return 'https:' + u;
  if (u.startsWith('/')) return 'https://wentkompany.ru' + u;
  return u;
}

/** Полный размер вместо -600x600 / -150x150 */
function fullSize(u) {
  return u.replace(/-\d+x\d+(?=\.(jpe?g|png|webp|gif))/i, '');
}

function galleryFromHtml(html) {
  const block =
    html.match(
      /<div[^>]*class="[^"]*woocommerce-product-gallery[^"]*"[^>]*>[\s\S]*?<\/div>\s*<script/i,
    )?.[0] ||
    html.match(
      /woocommerce-product-gallery__wrapper[\s\S]{0,20000}?<\/div>\s*<\/div>/i,
    )?.[0] ||
    '';

  const src = block || html;
  const urls = [];
  const re =
    /(?:data-large_image|data-src|href)=["']([^"']*\/wp-content\/uploads\/[^"']+\.(?:jpe?g|png|webp|gif))[^"']*["']/gi;
  let m;
  while ((m = re.exec(src))) {
    const u = abs(m[1]);
    if (!u) continue;
    if (/whatsapp|block-bg|logo|icon|favicon|sprite|badge|payment/i.test(u)) continue;
    urls.push(fullSize(u));
  }

  // fallback: wp-post-image + siblings in gallery
  if (!urls.length) {
    const re2 =
      /<img[^>]*(?:data-large_image|data-src|src)=["']([^"']*\/wp-content\/uploads\/[^"']+)["'][^>]*>/gi;
    while ((m = re2.exec(html))) {
      const u = abs(m[1]);
      if (!u || /whatsapp|block-bg|logo|icon/i.test(u)) continue;
      if (!/wp-post-image|product-gallery|woocommerce/i.test(m[0]) && urls.length) continue;
      urls.push(fullSize(u));
    }
  }

  return [...new Set(urls)];
}

const map = {};
for (const p of catalog.products) {
  const page = 'https://wentkompany.ru' + p.legacyUrl.replace(/\/$/, '') + '/';
  process.stdout.write(`${p.article} … `);
  try {
    const res = await fetch(page, { headers: { 'User-Agent': 'WentkompanyLocalPort/1.0' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const images = galleryFromHtml(html);
    map[p.article] = { page, images };
    console.log(images.length, images.map((u) => decodeURIComponent(u.split('/').pop())).join(' | '));
  } catch (e) {
    map[p.article] = { page, images: [], error: String(e.message || e) };
    console.log('ERR', e.message);
  }
}

writeFileSync(join(ROOT, 'scripts/.cache/product-galleries.json'), JSON.stringify(map, null, 2) + '\n');
console.log('\nOK → scripts/.cache/product-galleries.json');
