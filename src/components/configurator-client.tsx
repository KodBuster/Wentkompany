'use client';

import { useMemo, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { calculate, ru, rub, dec, type Dims, type FamilyTraits } from '@/lib/calc';
import { buildLayout } from '@/lib/geometry';
import { HoodDrawing } from './hood-drawing';
import { ExportButtons } from './export-buttons';
import type { ViewMode } from './hood-scene';
import { GOALS, track } from '@/lib/analytics';

const HoodScene = dynamic(() => import('./hood-scene').then((m) => m.HoodScene), {
  ssr: false,
  loading: () => <SceneStub text="Загружаем 3D-сцену…" />,
});

export interface ConfiguratorModel {
  slug: string;
  article: string;
  family: string;
  type: string | null;
  h: number;
  w: number;
  d: number;
  price: number | null;
}

export interface ConfiguratorFamily extends FamilyTraits {
  code: string;
  slug: string;
  title: string;
}

interface Props {
  models: ConfiguratorModel[];
  families: ConfiguratorFamily[];
}

const LIMITS = {
  w: { min: 600, max: 3000, step: 50 },
  d: { min: 600, max: 1600, step: 50 },
  h: { min: 300, max: 700, step: 50 },
  mount: { min: 1600, max: 2600, step: 50 },
};

const OPTIONS = [
  'Врезка присоединительная',
  'Проушины для монтажа',
  'Кран для слива жира и конденсата',
  'Точечные светодиодные светильники',
];

function SceneStub({ text }: { text: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <span className="lbl">{text}</span>
    </div>
  );
}

function hasWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (canvas.getContext('webgl2') || canvas.getContext('webgl')));
  } catch {
    return false;
  }
}

export function Configurator({ models, families }: Props) {
  const [modelSlug, setModelSlug] = useState(() => models.find((m) => m.family === 'ЗВОГ')?.slug ?? models[0].slug);
  const model = models.find((m) => m.slug === modelSlug)!;
  const family = families.find((f) => f.code === model.family)!;

  const [dims, setDims] = useState<Dims>({ h: model.h, w: model.w, d: model.d });
  const [mount, setMount] = useState(2000);
  const [material, setMaterial] = useState<'430' | '304'>('430');
  const [options, setOptions] = useState<string[]>([]);
  const [mode, setMode] = useState<ViewMode>('solid');
  const [view, setView] = useState<'3d' | 'draft'>('3d');
  const [webgl, setWebgl] = useState<boolean | null>(null);

  useEffect(() => setWebgl(hasWebGL()), []);
  useEffect(() => track(GOALS.configuratorOpen), []);

  const traits: FamilyTraits = { island: family.island, supply: family.supply, hydro: family.hydro };
  const base: Dims = { h: model.h, w: model.w, d: model.d };
  const calc = useMemo(
    () => calculate(dims, traits, base, model.price, material),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dims, model.slug, material],
  );
  const layout = useMemo(
    () => buildLayout(dims, traits, calc.ducts, { lamps: options.includes(OPTIONS[3]) }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dims, model.slug, calc.ducts.count, calc.ducts.diameter, options],
  );

  function selectModel(slug: string) {
    const next = models.find((m) => m.slug === slug)!;
    setModelSlug(slug);
    setDims({ h: next.h, w: next.w, d: next.d });
  }

  function reset() {
    setDims(base);
    setMaterial('430');
    setOptions([]);
    setMode('solid');
    setView('3d');
  }

  const isBase = dims.h === base.h && dims.w === base.w && dims.d === base.d;
  const title = `${model.article} · ${dims.h}/${dims.w}/${dims.d}`;
  const familyModels = models.filter((m) => m.family === model.family);

  const spec: [string, string][] = [
    [`${model.article} · ${dims.h}/${dims.w}/${dims.d}`, '1 шт'],
    ['Жироуловители лабиринтные', `${layout.filters.reduce((s, r) => s + r.count, 0)} шт`],
    [`Сталь AISI ${material} · ${dec(calc.area)} м²`, ''],
    [`Патрубки Ø${calc.ducts.diameter}`, `${calc.ducts.count} шт`],
    ...options.map((o) => [o, 'запрос'] as [string, string]),
    ...(traits.hydro
      ? ([
          ['Щит управления и диспетчеризации', '1 шт'],
          ['Воздуховод EI 45 после изделия', 'по проекту'],
        ] as [string, string][])
      : []),
    ...(traits.island ? ([['Подвес к перекрытию', '4 точки']] as [string, string][]) : []),
  ];

  return (
    <div className="cfg-shell">
      {/* ---------------- левая панель ---------------- */}
      <aside className="cfg-pane">
        <div className="cfg-group">
          <span className="lbl">Семейство</span>
          <div className="cfg-chips">
            {families.map((f) => (
              <button
                key={f.code}
                type="button"
                className="cfg-chip"
                aria-pressed={f.code === model.family}
                title={f.title}
                onClick={() => selectModel(models.find((m) => m.family === f.code)!.slug)}
              >
                {f.code}
              </button>
            ))}
          </div>
        </div>

        {familyModels.length > 1 && (
          <div className="cfg-group">
            <span className="lbl">Тип конструкции</span>
            <div className="cfg-chips">
              {familyModels.map((m) => (
                <button
                  key={m.slug}
                  type="button"
                  className="cfg-chip"
                  aria-pressed={m.slug === model.slug}
                  onClick={() => selectModel(m.slug)}
                >
                  {m.type ?? m.article}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="cfg-sep" />

        {(['w', 'd', 'h'] as const).map((key) => (
          <div className="cfg-group" key={key}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="lbl">
                {key === 'w' ? 'Ширина W' : key === 'd' ? 'Глубина D' : 'Высота короба H'}
              </span>
              <span className="num">{dims[key]} мм</span>
            </div>
            <input
              type="range"
              className="cfg-range"
              min={LIMITS[key].min}
              max={LIMITS[key].max}
              step={LIMITS[key].step}
              value={dims[key]}
              aria-label={key === 'w' ? 'Ширина, мм' : key === 'd' ? 'Глубина, мм' : 'Высота короба, мм'}
              onChange={(e) => setDims((s) => ({ ...s, [key]: +e.target.value }))}
            />
          </div>
        ))}

        <p className={isBase ? 'hint' : 'hint hint-warn'}>
          {isBase
            ? 'Эталонный типоразмер линейки — цена из прайса.'
            : 'Нестандарт: срок изготовления увеличивается, цену считает производство.'}
        </p>
        {!isBase && (
          <p className="hint mt-2">
            Нужна не только другая величина, а другая форма — вырез под колонну, скошенная
            стена, вывод патрубка вбок?{' '}
            <Link href="/nestandartnyy-zont" style={{ color: 'var(--color-supply)' }}>
              Делаем по вашему чертежу
            </Link>
            .
          </p>
        )}

        <div className="cfg-group">
          <div className="flex items-baseline justify-between gap-3">
            <span className="lbl">Нижняя кромка от пола</span>
            <span className="num">{mount} мм</span>
          </div>
          <input
            type="range"
            className="cfg-range"
            min={LIMITS.mount.min}
            max={LIMITS.mount.max}
            step={LIMITS.mount.step}
            value={mount}
            aria-label="Высота нижней кромки от пола, мм"
            onChange={(e) => setMount(+e.target.value)}
          />
          <p className="hint">Свес над оборудованием: {ru(mount - 850)} мм при высоте линии 850 мм.</p>
        </div>

        <div className="cfg-sep" />

        <div className="cfg-group">
          <span className="lbl">Материал корпуса</span>
          <div className="cfg-chips">
            {(['430', '304'] as const).map((m) => (
              <button
                key={m}
                type="button"
                className="cfg-chip"
                aria-pressed={material === m}
                onClick={() => setMaterial(m)}
              >
                AISI {m}
              </button>
            ))}
          </div>
          <p className="hint">AISI 304 — для влажных зон и гидроконтура. Надбавка оценочная, уточняется у производства.</p>
        </div>

        <div className="cfg-group">
          <span className="lbl">Дополнительное оборудование</span>
          {OPTIONS.map((o) => (
            <label key={o} className="cfg-opt">
              <input
                type="checkbox"
                checked={options.includes(o)}
                onChange={(e) =>
                  setOptions((s) => (e.target.checked ? [...s, o] : s.filter((x) => x !== o)))
                }
              />
              <span>{o}</span>
              <span className="lbl ml-auto">запрос</span>
            </label>
          ))}
        </div>

        <button type="button" className="btn btn-ghost w-full" onClick={reset}>
          Сбросить конфигурацию
        </button>
      </aside>

      {/* ---------------- сцена ---------------- */}
      <div className="cfg-stage">
        <div className="cfg-toolbar">
          <div className="cfg-seg">
            <button type="button" aria-pressed={view === '3d'} onClick={() => setView('3d')}>3D</button>
            <button type="button" aria-pressed={view === 'draft'} onClick={() => setView('draft')}>Чертёж</button>
          </div>
          {view === '3d' && (
            <div className="cfg-seg">
              {([
                ['solid', 'Реализм'],
                ['xray', 'Рентген'],
                ['explode', 'Разнос'],
              ] as [ViewMode, string][]).map(([m, label]) => (
                <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)}>
                  {label}
                </button>
              ))}
            </div>
          )}
          <span className="lbl ml-auto">{title}</span>
        </div>
        <div className="cfg-viewport">
          {view === 'draft' && (
            <HoodDrawing
              input={{
                dims,
                traits,
                calc,
                article: model.article,
                productName: family.title,
                material,
                lamps: options.includes(OPTIONS[3]),
              }}
            />
          )}
          {view === '3d' && webgl === null && <SceneStub text="Проверяем поддержку WebGL…" />}
          {view === '3d' && webgl === false && (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
              <span className="badge badge-warn">WebGL недоступен</span>
              <p className="muted max-w-[42ch] text-sm">
                Браузер не поддерживает 3D-просмотр. Размеры, расчёт, спецификация и цена работают
                по-прежнему, а вместо модели можно открыть вкладку «Чертёж» и выгрузить файлы.
              </p>
            </div>
          )}
          {view === '3d' && webgl === true && (
            <HoodScene
              dims={dims}
              traits={traits}
              ducts={calc.ducts}
              mode={mode}
              material={material}
              lamps={options.includes(OPTIONS[3])}
            />
          )}
        </div>
        <div className="cfg-status">
          <span>МОДЕЛЬ <b>{model.article}</b></span>
          <span>ГАБАРИТ H/W/D <b>{dims.h}/{dims.w}/{dims.d}</b></span>
          <span>МАТЕРИАЛ <b>AISI {material}</b></span>
          <span>РЕЖИМ <b>{view === 'draft' ? 'ЧЕРТЁЖ' : mode === 'solid' ? 'РЕАЛИЗМ' : mode === 'xray' ? 'РЕНТГЕН' : 'РАЗНОС'}</b></span>
          <span>ЕДИНИЦЫ <b>мм</b></span>
        </div>
      </div>

      {/* ---------------- правая панель ---------------- */}
      <aside className="cfg-pane">
        <div className="cfg-group">
          <span className="lbl">Ориентировочная цена</span>
          <div className="cfg-price">
            {calc.price ? `${calc.price.estimate ? '≈ ' : ''}${rub(calc.price.value)}` : 'по запросу'}
          </div>
          {calc.price && (
            <span className={calc.price.estimate ? 'badge badge-warn' : 'badge'}>
              {calc.price.estimate ? 'предварительная оценка' : 'цена из прайса'}
            </span>
          )}
        </div>

        <div className="cfg-group">
          <span className="lbl">Расчёт</span>
          <dl className="cfg-kv">
            <Row k="Расход воздуха" v={`${ru(calc.airflow)} м³/ч`} />
            <Row k="Патрубки" v={`${calc.ducts.count} × Ø${calc.ducts.diameter}`} />
            <Row k="Скорость в патрубке" v={`${dec(calc.ducts.velocity)} м/с`} />
            <Row k="Периметр захвата" v={`${dec(calc.perimeter)} м`} />
            <Row k="Площадь стали" v={`${dec(calc.area)} м²`} />
            <Row k="Масса, ориентир" v={`${ru(calc.mass)} кг`} />
          </dl>
        </div>

        <div className="cfg-group">
          <span className="lbl">Спецификация</span>
          <dl className="cfg-spec">
            {spec.map(([name, qty]) => (
              <div key={name}>
                <dt>{name}</dt>
                <dd>{qty}</dd>
              </div>
            ))}
          </dl>
        </div>

        {calc.warnings.length > 0 && (
          <div className="cfg-group">
            <span className="lbl">Внимание</span>
            {calc.warnings.map((w) => (
              <span key={w} className={w.startsWith('п. 5.30') ? 'badge badge-crit' : 'badge badge-warn'}>
                {w}
              </span>
            ))}
          </div>
        )}

        <div className="cfg-group">
          <span className="lbl">Выгрузка</span>
          <ExportButtons slug={model.slug} dims={dims} material={material} options={options} />
          <button type="button" className="cfg-ghost-btn mt-2" onClick={() => setView('draft')}>
            Чертёж на экране
          </button>
          <p className="hint mt-2">
            IFC4: тело, патрубки, материал, количества и набор свойств конфигурации.
          </p>
        </div>

        <Link href={`/contacts?cfg=${encodeURIComponent(title)}`} className="btn w-full">
          Получить точную цену
        </Link>
        <p className="hint mt-3">
          Цена нестандартного габарита — оценка по площади материала от эталонного типоразмера.
          Точный расчёт делает производство.
        </p>
      </aside>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt>{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}
