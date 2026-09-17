import { readFileSync } from 'node:fs';

const h = readFileSync('scripts/.cache/sample-product.html', 'utf8');
const keys = ['gallery', 'wp-post-image', 'product-images', 'attachment', 'splide', 'kb-gallery', 'og:image', 'woocommerce-product-gallery__image'];
for (const k of keys) console.log(k, h.toLowerCase().indexOf(k.toLowerCase()));

const og = h.match(/property="og:image"[^>]+content="([^"]+)"/) || h.match(/content="([^"]+)"[^>]+property="og:image"/);
console.log('og', og && og[1]);

const imgs = [...h.matchAll(/<img[^>]+>/gi)]
  .map((m) => m[0])
  .filter((t) => /uploads/i.test(t) && !/whatsapp|block-bg|logo|icon/i.test(t));
console.log('img tags', imgs.length);
for (const t of imgs.slice(0, 10)) console.log(t.slice(0, 280), '\n');
