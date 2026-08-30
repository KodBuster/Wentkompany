#!/usr/bin/env node
/**
 * Проверка расчётного ядра на реальных типоразмерах каталога.
 * Запуск: npm run check
 * Ядро на TypeScript читается через strip-types (Node 22+).
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { calculate, pickDucts, steelArea } from '../src/lib/calc.ts';
import { buildLayout } from '../src/lib/geometry.ts';
import { buildSheet, toSheet, SCALE_SERIES, SHEET_FIELDS, chooseScale } from '../src/lib/drawing.ts';
import { buildDxf, translit } from '../src/lib/dxf.ts';

const catalog = JSON.parse(readFileSync(new URL('../src/data/catalog.json', import.meta.url), 'utf8'));
const traitsOf = (code) => {
  const f = catalog.families.find((x) => x.code === code);
  return { island: !!f.island, supply: !!f.supply, hydro: !!f.hydro };
};

let checked = 0;
const rows = [];

for (const p of catalog.products) {
  if (!p.base) continue;
  const traits = traitsOf(p.family);
  const c = calculate(p.base, traits, p.base, p.price);

  assert.ok(c.airflow > 0, `${p.article}: расход должен быть положительным`);
  assert.ok(c.ducts.velocity <= 8.001, `${p.article}: скорость в патрубке ${c.ducts.velocity} выше рабочей`);
  assert.ok(c.mass > 0 && c.mass < 500, `${p.article}: масса вне разумного диапазона`);
  if (p.price) {
    assert.equal(c.price.value, p.price, `${p.article}: эталонный типоразмер должен отдавать цену прайса`);
    assert.equal(c.price.estimate, false, `${p.article}: эталон не должен помечаться оценкой`);
  }
  checked++;
  rows.push([
    p.article.padEnd(6),
    `${p.base.h}/${p.base.w}/${p.base.d}`.padEnd(16),
    `${Math.round(c.airflow)} м³/ч`.padStart(11),
    `${c.ducts.count}×Ø${c.ducts.diameter}`.padStart(8),
    `${c.ducts.velocity.toFixed(1)} м/с`.padStart(9),
    `${Math.round(c.mass)} кг`.padStart(7),
    p.price ? `${p.price} ₽` : '—',
  ].join('  '));
}

/* монотонность цены по площади */
const base = { h: 350, w: 1200, d: 600 };
const traits = traitsOf('ЗПВО');
const small = calculate({ h: 350, w: 800, d: 600 }, traits, base, 16000);
const large = calculate({ h: 350, w: 2400, d: 900 }, traits, base, 16000);
assert.ok(small.price.value < 16000, 'меньший габарит должен стоить дешевле эталона');
assert.ok(large.price.value > 16000, 'больший габарит должен стоить дороже эталона');
assert.ok(small.price.estimate && large.price.estimate, 'нестандарт помечается оценкой');
assert.ok(steelArea(base) > 0);

/* подбор патрубков: границы */
assert.equal(pickDucts(1000).diameter, 250);
assert.equal(pickDucts(2000).diameter, 315);
assert.equal(pickDucts(3000).diameter, 400);
assert.equal(pickDucts(9000).count > 1, true);

/* ---------- компоновка изделия (этап 4) ---------- */
const GEOM = [
  { h: 300, w: 600, d: 600 },
  { h: 450, w: 1200, d: 600 },
  { h: 700, w: 3000, d: 1600 },
];
for (const code of ['ЗВП', 'ЗВО', 'ЗПВП', 'ЗПВО', 'ЗВПГ', 'ЗВОГ']) {
  const tr = traitsOf(code);
  for (const dims of GEOM) {
    const c = calculate(dims, tr, dims, 10000);
    const l = buildLayout(dims, tr, c.ducts, { lamps: true });

    assert.ok(l.top.w > 200 && l.top.d > 200, `${code} ${dims.w}: крышка выродилась`);
    assert.ok(l.top.w < dims.w && l.top.d <= dims.d, `${code}: крышка должна быть уже низа`);
    assert.ok(l.taper * 2 < Math.min(dims.w, dims.d), `${code}: завал стенок больше габарита`);

    for (const s of l.spigots) {
      assert.ok(
        Math.abs(s.x) + s.diameter / 2 <= l.top.w / 2,
        `${code} ${dims.w}×${dims.d}: патрубок вылезает за крышку`,
      );
    }
    assert.equal(l.spigots.length, Math.min(c.ducts.count, 4), `${code}: число патрубков разошлось с расчётом`);

    const sides = l.filters.length;
    assert.equal(sides, tr.island ? 4 : 3, `${code}: не то число сторон с кассетами`);
    assert.ok(l.filters.every((r) => r.count >= 1 && r.step > 0), `${code}: пустой ряд кассет`);

    assert.equal(l.hangers.length, tr.island ? 4 : 0, `${code}: подвесы только у островных`);
    assert.ok(tr.hydro ? l.nozzles >= 2 : l.nozzles === 0, `${code}: форсунки только у гидро-изделий`);
    assert.ok(tr.supply ? !!l.supplySlot : l.supplySlot === null, `${code}: приточная щель не по типу`);
    assert.ok(l.gutterHeight > 0 && l.gutterHeight <= dims.h * 0.25 + 1e-9, `${code}: жёлоб вне габарита`);
    assert.ok(l.lamps.length >= 1 && l.lamps.length <= 6, `${code}: недопустимое число светильников`);
    for (const lamp of l.lamps) {
      assert.ok(Math.abs(lamp.x) < dims.w / 2, `${code}: светильник за габаритом`);
    }
  }
}

/* ---------- чертёж (этап 5) ---------- */
const FIELD_KEYS = { front: 'front', side: 'side', plan: 'plan' };
let sheets = 0;

for (const code of ['ЗВП', 'ЗПВО', 'ЗВОГ']) {
  const tr = traitsOf(code);
  for (const dims of GEOM) {
    const c = calculate(dims, tr, dims, 20000);
    const sheet = buildSheet({
      dims, traits: tr, calc: c, article: code, productName: `Зонт ${code}`, material: '430', lamps: true,
    });

    assert.ok(SCALE_SERIES.includes(sheet.scale), `${code} ${dims.w}: масштаб вне ряда ГОСТ 2.302`);
    assert.equal(sheet.views.length, 3, `${code}: должно быть три проекции`);
    assert.ok(/^ВК\./.test(sheet.designation), `${code}: не сформировано обозначение`);
    assert.ok(sheet.stamp.length >= 6, `${code}: штамп пустой`);
    assert.ok(sheet.notes.length >= 5, `${code}: нет технических требований`);
    // строка техтребований не должна вылезти за правое поле рамки:
    // поле 170 мм, моноширинный 3.7 мм → примерно 2.2 мм на символ
    for (const note of sheet.notes) {
      assert.ok(note.length <= 76, `${code}: длинная строка техтребований (${note.length}): ${note}`);
    }

    for (const view of sheet.views) {
      const field = SHEET_FIELDS[FIELD_KEYS[view.key]];
      const pts = [
        ...view.polys.flatMap((p) => p.pts.map((pt) => toSheet(view, pt, sheet.scale))),
        ...view.circles.flatMap((ci) => {
          const c0 = toSheet(view, ci.c, sheet.scale);
          const r = ci.r * sheet.scale;
          return [[c0[0] - r, c0[1] - r], [c0[0] + r, c0[1] + r]];
        }),
      ];
      const xs = pts.map((p) => p[0]);
      const ys = pts.map((p) => p[1]);

      assert.ok(Math.min(...xs) >= field.x - 12, `${code} ${dims.w}: вид ${view.key} вылез влево`);
      assert.ok(Math.max(...xs) <= field.x + field.w + 12, `${code} ${dims.w}: вид ${view.key} вылез вправо`);
      assert.ok(Math.min(...ys) >= 5, `${code} ${dims.w}: вид ${view.key} вылез за верхнее поле`);
      assert.ok(Math.max(...ys) <= 237, `${code} ${dims.w}: вид ${view.key} наехал на штамп`);
      assert.ok(view.dims.every((d) => d.text.trim().length > 0), `${code}: пустая размерная надпись`);
    }
    sheets++;
  }
}

/* ---------- DXF (этап 6) ---------- */
let dxfChecked = 0;
for (const code of ['ЗВП', 'ЗПВО', 'ЗВОГ']) {
  const tr = traitsOf(code);
  for (const dims of GEOM) {
    const c = calculate(dims, tr, dims, 20000);
    const dxf = buildDxf({
      dims, traits: tr, calc: c, article: code, productName: `Зонт ${code}`, material: '430',
    });
    const lines = dxf.replace(/\r\n/g, '\n').trim().split('\n');
    assert.equal(lines.length % 2, 0, `${code}: в DXF нечётное число строк — пара код/значение разорвана`);

    const pairs = [];
    for (let i = 0; i < lines.length - 1; i += 2) pairs.push([lines[i].trim(), lines[i + 1]]);

    const counts = {};
    for (const [k, v] of pairs) if (k === '0') counts[v] = (counts[v] || 0) + 1;
    assert.equal(counts.SECTION, 3, `${code}: должно быть три секции DXF`);
    assert.equal(counts.ENDSEC, 3, `${code}: не закрыты секции`);
    assert.equal(counts.EOF, 1, `${code}: нет EOF`);
    assert.ok(counts.LINE > 20, `${code}: слишком мало линий в DXF`);
    assert.ok(counts.LAYER === 5, `${code}: не хватает слоёв`);

    // R12 не поддерживает Unicode: любой не-ASCII символ откроется крякозябрами
    const texts = pairs.filter(([k]) => k === '1').map(([, v]) => v);
    for (const t of texts) {
      assert.ok(
        [...t].every((ch) => ch.charCodeAt(0) < 128),
        `${code}: в DXF попал не-ASCII текст: ${JSON.stringify(t)}`,
      );
    }
    dxfChecked++;
  }
}
assert.equal(translit('Зонт Ø315 × 2, 4 000 м³/ч'), 'Zont D315 x 2, 4 000 m3/ch');

assert.equal(chooseScale(0.5), 0.5, 'масштаб 1:2 должен выбираться точно');
assert.equal(chooseScale(0.19), 0.1, 'между 1:5 и 1:10 выбирается меньший');
assert.equal(chooseScale(0.001), 0.02, 'ниже ряда — крайний масштаб 1:50');

console.log(rows.join('\n'));
console.log(`\nOK · проверено типоразмеров: ${checked}`);
console.log(`OK · компоновка: 6 семейств × ${GEOM.length} габарита`);
console.log(`OK · чертёж: ${sheets} листа, виды в границах полей, масштабы из ряда ГОСТ`);
console.log(`OK · DXF: ${dxfChecked} файла, структура R12 валидна, текст только ASCII`);
console.log(`Нестандарт: 800/600 → ${small.price.value} ₽, 2400/900 → ${large.price.value} ₽ (эталон 16 000 ₽)`);
