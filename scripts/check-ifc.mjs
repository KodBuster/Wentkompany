#!/usr/bin/env node
/**
 * Проверка IFC-выгрузки: файл открывается сторонним парсером (web-ifc),
 * в модели находится зонт с телом, свойствами и количествами.
 * Запуск: npm run check:ifc
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { calculate } from '../src/lib/calc.ts';
import { buildSheet } from '../src/lib/drawing.ts';
import { buildIfc, ifcGuid } from '../src/lib/ifc.ts';
import * as WebIFC from 'web-ifc';

const catalog = JSON.parse(readFileSync(new URL('../src/data/catalog.json', import.meta.url), 'utf8'));
const traitsOf = (code) => {
  const f = catalog.families.find((x) => x.code === code);
  return { island: !!f.island, supply: !!f.supply, hydro: !!f.hydro };
};

const CASES = [
  { code: 'ЗВОГ', dims: { h: 450, w: 1200, d: 600 }, material: '430' },
  { code: 'ЗПВО', dims: { h: 600, w: 2800, d: 1400 }, material: '304' },
  { code: 'ЗВП', dims: { h: 300, w: 600, d: 600 }, material: '430' },
];

const api = new WebIFC.IfcAPI();
await api.Init();

let checked = 0;
for (const { code, dims, material } of CASES) {
  const traits = traitsOf(code);
  const calc = calculate(dims, traits, dims, 20000, material);
  const input = {
    dims, traits, calc,
    article: code,
    productName: `Зонт ${code}`,
    designation: buildSheet({ dims, traits, calc, article: code, productName: `Зонт ${code}`, material }).designation,
    material,
  };
  const ifc = buildIfc(input);

  /* --- структура STEP --- */
  assert.ok(ifc.startsWith('ISO-10303-21;'), `${code}: нет заголовка STEP`);
  assert.ok(ifc.trimEnd().endsWith('END-ISO-10303-21;'), `${code}: файл не закрыт`);
  assert.ok(/FILE_SCHEMA\(\('IFC4'\)\)/.test(ifc), `${code}: не объявлена схема IFC4`);

  const ids = [...ifc.matchAll(/^#(\d+)= /gm)].map((m) => Number(m[1]));
  assert.deepEqual(ids, ids.map((_, i) => i + 1), `${code}: нумерация сущностей с пропусками`);
  const refs = new Set([...ifc.matchAll(/#(\d+)(?![\d=])/g)].map((m) => Number(m[1])));
  for (const ref of refs) {
    assert.ok(ref <= ids.length, `${code}: ссылка на несуществующую сущность #${ref}`);
  }

  /* --- открываем сторонним парсером --- */
  const model = api.OpenModel(new TextEncoder().encode(ifc));
  const terminals = api.GetLineIDsWithType(model, WebIFC.IFCAIRTERMINAL);
  assert.equal(terminals.size(), 1, `${code}: в модели должен быть ровно один зонт`);

  const element = api.GetLine(model, terminals.get(0));
  assert.ok(element.Name?.value?.includes(code) || element.Tag?.value === code, `${code}: потеряно имя изделия`);

  const psets = api.GetLineIDsWithType(model, WebIFC.IFCPROPERTYSET);
  assert.ok(psets.size() >= 1, `${code}: нет набора свойств`);
  const pset = api.GetLine(model, psets.get(0), true);
  const names = pset.HasProperties.map((p) => p.Name.value);
  for (const required of ['Артикул', 'РасходВоздуха_м3ч', 'Патрубки', 'Материал']) {
    assert.ok(names.includes(required), `${code}: в Pset нет свойства ${required}`);
  }
  const airflow = pset.HasProperties.find((p) => p.Name.value === 'РасходВоздуха_м3ч').NominalValue.value;
  assert.equal(Math.round(airflow), Math.round(calc.airflow), `${code}: расход в IFC разошёлся с расчётом`);

  const quantities = api.GetLineIDsWithType(model, WebIFC.IFCELEMENTQUANTITY);
  assert.ok(quantities.size() >= 1, `${code}: нет базовых количеств`);

  /* --- геометрия действительно читается --- */
  let meshes = 0;
  let triangles = 0;
  api.StreamAllMeshes(model, (mesh) => {
    meshes++;
    for (let i = 0; i < mesh.geometries.size(); i++) {
      const geo = api.GetGeometry(model, mesh.geometries.get(i).geometryExpressID);
      triangles += api.GetIndexArray(geo.GetIndexData(), geo.GetIndexDataSize()).length / 3;
    }
  });
  assert.ok(meshes >= 1, `${code}: парсер не нашёл геометрию`);
  assert.ok(triangles >= 12, `${code}: тело выродилось (${triangles} треугольников)`);

  api.CloseModel(model);
  console.log(
    `  ${code.padEnd(5)} ${`${dims.h}/${dims.w}/${dims.d}`.padEnd(16)} ` +
      `AISI ${material}  сущностей: ${String(ids.length).padStart(4)}  ` +
      `мешей: ${meshes}  треугольников: ${triangles}  расход: ${Math.round(airflow)} м³/ч`,
  );
  checked++;
}

/* GlobalId детерминирован и в алфавите IFC */
const g1 = ifcGuid('ВК.ЗВОГ.450-1200-600|element');
const g2 = ifcGuid('ВК.ЗВОГ.450-1200-600|element');
assert.equal(g1, g2, 'GlobalId должен быть детерминированным');
assert.equal(g1.length, 22, 'GlobalId должен быть длиной 22 символа');
assert.ok(/^[0-9A-Za-z_$]{22}$/.test(g1), 'GlobalId вне алфавита IFC');
assert.notEqual(g1, ifcGuid('ВК.ЗВОГ.450-1200-600|pset'), 'разные объекты не должны делить GlobalId');

console.log(`\nOK · IFC: ${checked} модели открыты парсером web-ifc, свойства и геометрия на месте`);
