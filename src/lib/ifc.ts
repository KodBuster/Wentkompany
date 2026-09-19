/**
 * Экспорт изделия в IFC4 (STEP, ISO-10303-21) — модель для BIM-проекта.
 *
 * Зонт выгружается как IfcAirTerminal с пространственной структурой
 * (проект → площадка → здание → этаж), телом Brep, цилиндрами патрубков,
 * материалом, базовыми количествами и набором свойств конфигурации.
 * Именно ради свойств BIM-выгрузка и нужна: расход, габарит, артикул
 * и требования норм едут в проект вместе с геометрией, а не в примечании.
 *
 * Геометрия берётся из той же компоновки, что и 3D-сцена с чертежом.
 * Единицы IFC — метры, поэтому миллиметры компоновки делятся на 1000.
 */

import type { Dims, FamilyTraits, Calculation } from './calc.ts';
import { buildLayout, BUILD } from './geometry.ts';

const M = 0.001;

/** Алфавит IFC GlobalId (base64 в трактовке buildingSMART). */
const GUID_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_$';

/**
 * Детерминированный GlobalId: одна и та же конфигурация даёт один и тот же
 * идентификатор, поэтому повторная выгрузка не плодит «новые» объекты в проекте.
 */
export function ifcGuid(seed: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < seed.length; i++) {
    h1 = Math.imul(h1 ^ seed.charCodeAt(i), 16777619) >>> 0;
    h2 = Math.imul(h2 + seed.charCodeAt(i) * (i + 7), 2654435761) >>> 0;
  }
  let out = '';
  for (let i = 0; i < 22; i++) {
    const mix = i % 2 === 0 ? h1 : h2;
    const shift = (i * 5) % 27;
    out += GUID_CHARS[(mix >>> shift) % 64];
    if (i % 2 === 0) h1 = Math.imul(h1 ^ (i + 1), 2246822519) >>> 0;
    else h2 = Math.imul(h2 ^ (i + 3), 3266489917) >>> 0;
  }
  return out;
}

class Step {
  private id = 0;
  readonly lines: string[] = [];

  add(body: string): string {
    this.id += 1;
    this.lines.push(`#${this.id}= ${body};`);
    return `#${this.id}`;
  }

  get count() {
    return this.id;
  }
}

const num = (v: number) => {
  const rounded = Math.abs(v) < 1e-9 ? 0 : v;
  return Number.isInteger(rounded) ? `${rounded}.` : rounded.toFixed(6).replace(/0+$/, '');
};

const str = (v: string) => `'${v.replace(/\\/g, '\\\\').replace(/'/g, "''")}'`;

export interface IfcInput {
  dims: Dims;
  traits: FamilyTraits;
  calc: Calculation;
  article: string;
  productName: string;
  designation: string;
  material: '430' | '304';
  lamps?: boolean;
  typeLabel?: string | null;
}

export function buildIfc(input: IfcInput): string {
  const { dims, traits, calc, article, productName, designation, material } = input;
  const layout = buildLayout(dims, traits, calc.ducts, { lamps: input.lamps, typeLabel: input.typeLabel });
  const s = new Step();
  const guid = (part: string) => ifcGuid(`${designation}|${material}|${part}`);

  /* ---------- владелец и единицы ---------- */
  const person = s.add(`IFCPERSON($,$,${str('WENTKOMPANY')},$,$,$,$,$)`);
  const org = s.add(`IFCORGANIZATION($,${str('WENTKOMPANY')},$,$,$)`);
  const personOrg = s.add(`IFCPERSONANDORGANIZATION(${person},${org},$)`);
  const app = s.add(`IFCAPPLICATION(${org},${str('0.6')},${str('WENTKOMPANY Configurator')},${str('WKCFG')})`);
  const owner = s.add(`IFCOWNERHISTORY(${personOrg},${app},$,.ADDED.,$,$,$,${Math.floor(Date.now() / 1000)})`);

  const unitLength = s.add('IFCSIUNIT(*,.LENGTHUNIT.,$,.METRE.)');
  const unitArea = s.add('IFCSIUNIT(*,.AREAUNIT.,$,.SQUARE_METRE.)');
  const unitVolume = s.add('IFCSIUNIT(*,.VOLUMEUNIT.,$,.CUBIC_METRE.)');
  const unitMass = s.add('IFCSIUNIT(*,.MASSUNIT.,.KILO.,.GRAM.)');
  const unitTime = s.add('IFCSIUNIT(*,.TIMEUNIT.,$,.SECOND.)');
  const units = s.add(`IFCUNITASSIGNMENT((${[unitLength, unitArea, unitVolume, unitMass, unitTime].join(',')}))`);

  /* ---------- система координат ---------- */
  const origin = s.add('IFCCARTESIANPOINT((0.,0.,0.))');
  const axisZ = s.add('IFCDIRECTION((0.,0.,1.))');
  const axisX = s.add('IFCDIRECTION((1.,0.,0.))');
  const placement3d = s.add(`IFCAXIS2PLACEMENT3D(${origin},${axisZ},${axisX})`);
  const context = s.add(
    `IFCGEOMETRICREPRESENTATIONCONTEXT($,${str('Model')},3,1.E-05,${placement3d},$)`,
  );
  const bodyContext = s.add(
    `IFCGEOMETRICREPRESENTATIONSUBCONTEXT(${str('Body')},${str('Model')},*,*,*,*,${context},$,.MODEL_VIEW.,$)`,
  );

  /* ---------- пространственная структура ---------- */
  const project = s.add(
    `IFCPROJECT(${str(guid('project'))},${owner},${str(productName)},${str(designation)},$,$,$,(${context}),${units})`,
  );
  const sitePlacement = s.add(`IFCLOCALPLACEMENT($,${placement3d})`);
  const site = s.add(
    `IFCSITE(${str(guid('site'))},${owner},${str('Площадка')},$,$,${sitePlacement},$,$,.ELEMENT.,$,$,$,$,$)`,
  );
  const buildingPlacement = s.add(`IFCLOCALPLACEMENT(${sitePlacement},${placement3d})`);
  const building = s.add(
    `IFCBUILDING(${str(guid('building'))},${owner},${str('Здание')},$,$,${buildingPlacement},$,$,.ELEMENT.,$,$,$)`,
  );
  const storeyPlacement = s.add(`IFCLOCALPLACEMENT(${buildingPlacement},${placement3d})`);
  const storey = s.add(
    `IFCBUILDINGSTOREY(${str(guid('storey'))},${owner},${str('Этаж')},$,$,${storeyPlacement},$,$,.ELEMENT.,0.)`,
  );

  s.add(`IFCRELAGGREGATES(${str(guid('agg-project'))},${owner},$,$,${project},(${site}))`);
  s.add(`IFCRELAGGREGATES(${str(guid('agg-site'))},${owner},$,$,${site},(${building}))`);
  s.add(`IFCRELAGGREGATES(${str(guid('agg-building'))},${owner},$,$,${building},(${storey}))`);

  /* ---------- тело корпуса: усечённая пирамида ---------- */
  const hw = (dims.w / 2) * M;
  const hd = (dims.d / 2) * M;
  const tw = (layout.top.w / 2) * M;
  const td = (layout.top.d / 2) * M;
  const tz = layout.top.z * M;
  const h = dims.h * M;

  const vertices: [number, number, number][] = [
    [-hw, -hd, 0], [hw, -hd, 0], [hw, hd, 0], [-hw, hd, 0],
    [-tw, tz - td, h], [tw, tz - td, h], [tw, tz + td, h], [-tw, tz + td, h],
  ];
  const vertexIds = vertices.map((v) => s.add(`IFCCARTESIANPOINT((${v.map(num).join(',')}))`));

  /** Грани: порядок вершин против часовой стрелки при взгляде снаружи. */
  const faces: number[][] = [
    [0, 3, 2, 1], // низ
    [4, 5, 6, 7], // верх
    [0, 1, 5, 4], // -Y
    [1, 2, 6, 5], // +X
    [2, 3, 7, 6], // +Y
    [3, 0, 4, 7], // -X
  ];
  const faceIds = faces.map((f) => {
    const loop = s.add(`IFCPOLYLOOP((${f.map((i) => vertexIds[i]).join(',')}))`);
    const bound = s.add(`IFCFACEOUTERBOUND(${loop},.T.)`);
    return s.add(`IFCFACE((${bound}))`);
  });
  const shell = s.add(`IFCCLOSEDSHELL((${faceIds.join(',')}))`);
  const brep = s.add(`IFCFACETEDBREP(${shell})`);

  /* ---------- патрубки ---------- */
  const solids = [brep];
  for (const spigot of layout.spigots) {
    const r = (spigot.diameter / 2) * M;
    const profilePos = s.add('IFCCARTESIANPOINT((0.,0.))');
    const profileDir = s.add('IFCDIRECTION((1.,0.))');
    const profilePlacement = s.add(`IFCAXIS2PLACEMENT2D(${profilePos},${profileDir})`);
    const profile = s.add(`IFCCIRCLEPROFILEDEF(.AREA.,${str('Патрубок')},${profilePlacement},${num(r)})`);
    /* Y как на чертеже: центр крышки + локальный сдвиг патрубка по глубине */
    const y = (layout.top.z + spigot.z) * M;
    const base = s.add(`IFCCARTESIANPOINT((${num(spigot.x * M)},${num(y)},${num(h)}))`);
    const pos = s.add(`IFCAXIS2PLACEMENT3D(${base},${axisZ},${axisX})`);
    solids.push(s.add(`IFCEXTRUDEDAREASOLID(${profile},${pos},${axisZ},${num(BUILD.spigot * M)})`));
  }

  const shapeRep = s.add(
    `IFCSHAPEREPRESENTATION(${bodyContext},${str('Body')},${str('SolidModel')},(${solids.join(',')}))`,
  );
  const shape = s.add(`IFCPRODUCTDEFINITIONSHAPE($,$,(${shapeRep}))`);

  /* ---------- сам зонт ---------- */
  const elementPlacement = s.add(`IFCLOCALPLACEMENT(${storeyPlacement},${placement3d})`);
  const element = s.add(
    `IFCAIRTERMINAL(${str(guid('element'))},${owner},${str(productName)},${str(designation)},` +
      `${str(traits.hydro ? 'Зонт с гидрозатвором' : 'Вытяжной зонт')},${elementPlacement},${shape},` +
      `${str(article)},.USERDEFINED.)`,
  );
  s.add(
    `IFCRELCONTAINEDINSPATIALSTRUCTURE(${str(guid('contained'))},${owner},$,$,(${element}),${storey})`,
  );

  /* ---------- материал ---------- */
  const materialRef = s.add(`IFCMATERIAL(${str(`Сталь нержавеющая AISI ${material}`)},$,${str('Металл')})`);
  s.add(
    `IFCRELASSOCIATESMATERIAL(${str(guid('material'))},${owner},$,$,(${element}),${materialRef})`,
  );

  /* ---------- свойства конфигурации ---------- */
  const prop = (name: string, value: string) => s.add(`IFCPROPERTYSINGLEVALUE(${str(name)},$,${value},$)`);
  const text = (v: string) => `IFCTEXT(${str(v)})`;
  const real = (v: number) => `IFCREAL(${num(v)})`;
  const len = (v: number) => `IFCLENGTHMEASURE(${num(v)})`;
  const bool = (v: boolean) => `IFCBOOLEAN(.${v ? 'T' : 'F'}.)`;

  const props = [
    prop('Артикул', text(article)),
    prop('Обозначение', text(designation)),
    prop('Высота H', len(dims.h * M)),
    prop('Ширина W', len(dims.w * M)),
    prop('Глубина D', len(dims.d * M)),
    prop('Материал', text(`AISI ${material}`)),
    prop('РасходВоздуха_м3ч', real(Math.round(calc.airflow))),
    prop('Патрубки', text(`${calc.ducts.count} × Ø${calc.ducts.diameter}`)),
    prop('СкоростьВПатрубке_мс', real(Number(calc.ducts.velocity.toFixed(2)))),
    prop('ПериметрЗахвата_м', real(Number(calc.perimeter.toFixed(2)))),
    prop('Жироуловители_шт', real(layout.filters.reduce((acc, r) => acc + r.count, 0))),
    prop('Гидрозатвор', bool(traits.hydro)),
    prop('ПриточнаяРаздача', bool(traits.supply)),
    prop('Исполнение', text(traits.island ? 'островное' : 'пристенное')),
    prop('СтатусДокумента', text('Предварительно, размеры для справок')),
  ];
  if (traits.hydro) {
    props.push(prop('ТребованияНорм', text('СП 7.13130.2013, пп. 5.28–5.33: щит автоматики, воздуховод EI 45')));
  }
  const pset = s.add(
    `IFCPROPERTYSET(${str(guid('pset'))},${owner},${str('Pset_WENTKOMPANY_Configuration')},$,(${props.join(',')}))`,
  );
  s.add(`IFCRELDEFINESBYPROPERTIES(${str(guid('rel-pset'))},${owner},$,$,(${element}),${pset})`);

  /* ---------- базовые количества ---------- */
  const qWeight = s.add(`IFCQUANTITYWEIGHT(${str('GrossWeight')},$,$,${num(Number(calc.mass.toFixed(1)))},$)`);
  const qArea = s.add(`IFCQUANTITYAREA(${str('GrossSurfaceArea')},$,$,${num(Number(calc.area.toFixed(2)))},$)`);
  const qHeight = s.add(`IFCQUANTITYLENGTH(${str('Height')},$,$,${num(dims.h * M)},$)`);
  const qWidth = s.add(`IFCQUANTITYLENGTH(${str('Width')},$,$,${num(dims.w * M)},$)`);
  const qDepth = s.add(`IFCQUANTITYLENGTH(${str('Depth')},$,$,${num(dims.d * M)},$)`);
  const quantities = s.add(
    `IFCELEMENTQUANTITY(${str(guid('qto'))},${owner},${str('Qto_AirTerminalBaseQuantities')},$,$,` +
      `(${[qWeight, qArea, qHeight, qWidth, qDepth].join(',')}))`,
  );
  s.add(`IFCRELDEFINESBYPROPERTIES(${str(guid('rel-qto'))},${owner},$,$,(${element}),${quantities})`);

  /* ---------- файл ---------- */
  const stamp = new Date().toISOString().replace(/\.\d+Z$/, '');
  const header = [
    'ISO-10303-21;',
    'HEADER;',
    `FILE_DESCRIPTION((${str('ViewDefinition [ReferenceView_V1.2]')}),${str('2;1')});`,
    `FILE_NAME(${str(`${designation}.ifc`)},${str(stamp)},(${str('WENTKOMPANY Configurator')}),` +
      `(${str('WENTKOMPANY')}),${str('WENTKOMPANY Configurator 0.6')},${str('WENTKOMPANY')},${str('')});`,
    `FILE_SCHEMA((${str('IFC4')}));`,
    'ENDSEC;',
    'DATA;',
  ];

  return [...header, ...s.lines, 'ENDSEC;', 'END-ISO-10303-21;', ''].join('\n');
}
