/**
 * Точечный разбор галереи WooCommerce с карточки товара.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const url = process.argv[2] || 'https://wentkompany.ru/product/zont-vytjazhnoj-pristennyj-tip-1-zvp-1/';
const res = await fetch(url, { headers: { 'User-Agent': 'WentkompanyLocalPort/1.0' } });
const html = await res.text();

mkdirSync(join(ROOT, 'scripts', '.cache'), { recursive: true });
writeFileSync(join(ROOT, 'scripts', '.cache', 'sample-product.html'), html);

// куски вокруг gallery
const idx = html.indexOf('woocommerce-product-gallery');
console.log('gallery idx', idx);
if (idx >= 0) {
  console.log(html.slice(idx, idx + 2500));
}
console.log('\n--- figures ---');
const figs = [...html.matchAll(/<figure[^>]*class="[^"]*woocommerce-product-gallery__image[^"]*"[^>]*>[\s\S]*?<\/figure>/gi)];
console.log('figures', figs.length);
for (const f of figs.slice(0, 5)) {
  const href = f[0].match(/href="([^"]+)"/);
  const large = f[0].match(/data-large_image="([^"]+)"/);
  console.log(' href', href?.[1]);
  console.log(' large', large?.[1]);
}
