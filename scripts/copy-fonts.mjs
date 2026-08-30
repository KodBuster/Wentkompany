/**
 * Копирует нужные начертания из @fontsource в public/fonts.
 *
 * Зачем не оставить импорт CSS из node_modules: файлы в public можно
 * предзагрузить (<link rel="preload">) по постоянному адресу. Без предзагрузки
 * крупный заголовок сначала рисуется запасным шрифтом, потом перерисовывается
 * своим — и вся страница под ним прыгает (CLS). Предзагрузка это снимает.
 *
 * Запускается автоматически перед сборкой (prebuild).
 */

import { copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const OUT = join(ROOT, 'public', 'fonts');

/** [пакет, файл, имя в public] */
const FILES = [
  ['@fontsource/oswald', 'oswald-cyrillic-500-normal.woff2', 'oswald-cyrillic-500.woff2'],
  ['@fontsource/oswald', 'oswald-cyrillic-600-normal.woff2', 'oswald-cyrillic-600.woff2'],
  ['@fontsource/oswald', 'oswald-cyrillic-700-normal.woff2', 'oswald-cyrillic-700.woff2'],
  ['@fontsource/oswald', 'oswald-latin-500-normal.woff2', 'oswald-latin-500.woff2'],
  ['@fontsource/oswald', 'oswald-latin-600-normal.woff2', 'oswald-latin-600.woff2'],
  ['@fontsource/oswald', 'oswald-latin-700-normal.woff2', 'oswald-latin-700.woff2'],
  ['@fontsource/onest', 'onest-cyrillic-400-normal.woff2', 'onest-cyrillic-400.woff2'],
  ['@fontsource/onest', 'onest-cyrillic-500-normal.woff2', 'onest-cyrillic-500.woff2'],
  ['@fontsource/onest', 'onest-cyrillic-600-normal.woff2', 'onest-cyrillic-600.woff2'],
  ['@fontsource/onest', 'onest-latin-400-normal.woff2', 'onest-latin-400.woff2'],
  ['@fontsource/onest', 'onest-latin-500-normal.woff2', 'onest-latin-500.woff2'],
  ['@fontsource/onest', 'onest-latin-600-normal.woff2', 'onest-latin-600.woff2'],
  ['@fontsource/ibm-plex-mono', 'ibm-plex-mono-cyrillic-400-normal.woff2', 'plex-mono-cyrillic-400.woff2'],
  ['@fontsource/ibm-plex-mono', 'ibm-plex-mono-cyrillic-500-normal.woff2', 'plex-mono-cyrillic-500.woff2'],
  ['@fontsource/ibm-plex-mono', 'ibm-plex-mono-latin-400-normal.woff2', 'plex-mono-latin-400.woff2'],
  ['@fontsource/ibm-plex-mono', 'ibm-plex-mono-latin-500-normal.woff2', 'plex-mono-latin-500.woff2'],
];

mkdirSync(OUT, { recursive: true });

let copied = 0;
const missing = [];
for (const [pkg, file, name] of FILES) {
  const src = join(ROOT, 'node_modules', pkg, 'files', file);
  if (!existsSync(src)) {
    missing.push(`${pkg}/files/${file}`);
    continue;
  }
  copyFileSync(src, join(OUT, name));
  copied += 1;
}

if (missing.length) {
  console.error('Не найдены файлы шрифтов:\n  ' + missing.join('\n  '));
  process.exit(1);
}
console.log(`Шрифты: скопировано ${copied} файлов в public/fonts`);
