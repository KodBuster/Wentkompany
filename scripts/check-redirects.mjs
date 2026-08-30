/**
 * Проверка миграции URL.
 *
 * Поднимает продакшен-сервер и прогоняет по нему ВСЕ правила из
 * src/data/redirects.json: каждый старый адрес должен отдать 301 и увести
 * на живую страницу (200), а не на другой редирект и не в 404.
 *
 * Дополнительно проверяются служебные адреса: sitemap, robots, 404,
 * и то, что каждый URL из sitemap.xml реально открывается.
 *
 * Запуск: npm run check:redirects
 * Требует собранного билда (npm run build).
 */

import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

const PORT = Number(process.env.CHECK_PORT || 3199);
const BASE = `http://127.0.0.1:${PORT}`;
const redirects = JSON.parse(readFileSync(new URL('../src/data/redirects.json', import.meta.url), 'utf8'));

let failures = 0;
const fail = (msg) => {
  failures += 1;
  console.error('  ОШИБКА · ' + msg);
};

async function waitForServer(timeoutMs = 40000) {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    try {
      const r = await fetch(BASE + '/', { redirect: 'manual' });
      if (r.status) return true;
    } catch {
      /* сервер ещё не поднялся */
    }
    await sleep(400);
  }
  return false;
}

const server = spawn('npx', ['next', 'start', '-p', String(PORT)], {
  cwd: new URL('..', import.meta.url).pathname,
  stdio: 'ignore',
  env: { ...process.env, NODE_ENV: 'production' },
});

process.on('exit', () => server.kill());

if (!(await waitForServer())) {
  console.error('Сервер не поднялся. Сначала выполните npm run build.');
  server.kill();
  process.exit(1);
}

console.log(`\nПроверка ${redirects.length} правил 301\n`);

const targets = new Map(); // куда ведут правила → сколько раз

for (const rule of redirects) {
  const res = await fetch(BASE + rule.source, { redirect: 'manual' });
  const loc = res.headers.get('location');

  if (res.status !== 301) {
    fail(`${rule.source} → статус ${res.status}, ожидался 301`);
    continue;
  }
  if (loc !== rule.destination) {
    fail(`${rule.source} → ${loc}, в карте ${rule.destination}`);
    continue;
  }

  // цель должна открываться сама, а не быть ещё одним редиректом
  const hop = await fetch(BASE + loc, { redirect: 'manual' });
  if (hop.status === 301 || hop.status === 302 || hop.status === 308) {
    fail(`цепочка редиректов: ${rule.source} → ${loc} → ${hop.headers.get('location')}`);
    continue;
  }
  if (hop.status !== 200) {
    fail(`цель ${loc} отдаёт ${hop.status}`);
    continue;
  }
  targets.set(loc, (targets.get(loc) ?? 0) + 1);
}

console.log(`OK · 301 отдают все ${redirects.length} старых адреса, цели живые`);
console.log(`     уникальных целей: ${targets.size}`);

// служебные адреса
const service = [
  ['/sitemap.xml', 200],
  ['/robots.txt', 200],
  ['/etoj-stranicy-nikogda-ne-bylo', 404],
];
for (const [path, expect] of service) {
  const r = await fetch(BASE + path, { redirect: 'manual' });
  if (r.status !== expect) fail(`${path} → ${r.status}, ожидался ${expect}`);
}
console.log('OK · sitemap.xml, robots.txt и 404 отвечают как надо');

// каждый URL из карты сайта должен открываться
const sitemapXml = await (await fetch(BASE + '/sitemap.xml')).text();
const urls = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
if (urls.length === 0) fail('sitemap.xml пуст');

let checked = 0;
for (const url of urls) {
  const path = new URL(url).pathname;
  const r = await fetch(BASE + path, { redirect: 'manual' });
  if (r.status !== 200) fail(`в sitemap указан ${path}, а он отдаёт ${r.status}`);
  else checked += 1;
}
console.log(`OK · все ${checked} адресов из sitemap.xml открываются`);

// robots должен ссылаться на карту сайта
const robots = await (await fetch(BASE + '/robots.txt')).text();
if (!robots.includes('sitemap.xml')) fail('robots.txt не ссылается на sitemap.xml');

// заголовки безопасности
const headRes = await fetch(BASE + '/');
for (const h of ['x-content-type-options', 'referrer-policy', 'x-frame-options']) {
  if (!headRes.headers.get(h)) fail(`нет заголовка ${h}`);
}
console.log('OK · robots ссылается на sitemap, заголовки безопасности на месте');

server.kill();

if (failures > 0) {
  console.error(`\nПровалено проверок: ${failures}\n`);
  process.exit(1);
}
console.log('\nМиграция URL: проблем не найдено\n');
