'use client';

import {
  useMemo,
  useState,
  useEffect,
  useRef,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
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
  /** Deep-link из каталога: slug модели */
  initialSlug?: string;
  /** Deep-link: габариты h/w/d, если переданы */
  initialDims?: Partial<Dims>;
}

const LIMITS = {
  w: { min: 600, max: 3000, step: 1 },
  d: { min: 600, max: 1600, step: 1 },
  h: { min: 300, max: 700, step: 1 },
  mount: { min: 1600, max: 2600, step: 1 },
};

const OPTIONS = [
  'Врезка присоединительная',
  'Проушины для монтажа',
  'Кран для слива жира и конденсата',
  'Точечные светодиодные светильники',
];

const DEFAULT_MOUNT = 2000;

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

function clampDim(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(n)));
}

/** Разумный дефолт без гидро — первый ЗВП, иначе первая не-гидро модель. */
function defaultModelSlug(models: ConfiguratorModel[], families: ConfiguratorFamily[]) {
  const zvp = models.find((m) => m.family === 'ЗВП');
  if (zvp) return zvp.slug;
  const nonHydro = models.find((m) => {
    const f = families.find((x) => x.code === m.family);
    return f && !f.hydro;
  });
  return nonHydro?.slug ?? models[0].slug;
}

function resolveInitialSlug(
  models: ConfiguratorModel[],
  families: ConfiguratorFamily[],
  initialSlug?: string,
) {
  if (initialSlug && models.some((m) => m.slug === initialSlug)) return initialSlug;
  return defaultModelSlug(models, families);
}

function resolveInitialDims(model: ConfiguratorModel, initialDims?: Partial<Dims>): Dims {
  const pick = (key: keyof Dims, lim: { min: number; max: number }) => {
    const raw = initialDims?.[key];
    if (typeof raw === 'number' && Number.isFinite(raw)) return clampDim(raw, lim.min, lim.max);
    return model[key];
  };
  return {
    h: pick('h', LIMITS.h),
    w: pick('w', LIMITS.w),
    d: pick('d', LIMITS.d),
  };
}

/** Полная строка конфигурации для заявки (заказ / точная цена). */
function buildCfgText(input: {
  family: ConfiguratorFamily;
  model: ConfiguratorModel;
  dims: Dims;
  mount: number;
  material: string;
  options: string[];
  airflow: number;
  ducts: { count: number; diameter: number };
  price: { value: number; estimate: boolean } | null;
}) {
  const { family, model, dims, mount, material, options, airflow, ducts, price } = input;
  const bits = [
    `${family.code} · ${model.article}`,
    `H/W/D ${dims.h}/${dims.w}/${dims.d} мм`,
    `кромка от пола ${mount} мм`,
    `AISI ${material}`,
    options.length ? `опции: ${options.join(', ')}` : 'опции: нет',
    `расход ${ru(airflow)} м³/ч`,
    `патрубки ${ducts.count}×Ø${ducts.diameter}`,
    price
      ? `оценка ${price.estimate ? '≈ ' : ''}${rub(price.value)}`
      : 'цена по запросу',
  ];
  return bits.join(' · ');
}

/**
 * Габарит: цифра вводится напрямую; интерактив только у − / ползунка / +.
 * Колесо ±step — лишь над треком; удержание −/+ — автоповтор.
 */
function DimSlider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  ariaLabel,
  hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  ariaLabel: string;
  hint?: ReactNode;
}) {
  const rangeRef = useRef<HTMLInputElement>(null);
  const valueRef = useRef(value);
  valueRef.current = value;
  const holdRef = useRef<{ delay: ReturnType<typeof setTimeout> | null; tick: ReturnType<typeof setInterval> | null }>({
    delay: null,
    tick: null,
  });
  const [draft, setDraft] = useState(String(value));
  const [editing, setEditing] = useState(false);

  const set = (n: number) => onChange(clampDim(n, min, max));

  const stopHold = () => {
    if (holdRef.current.delay != null) clearTimeout(holdRef.current.delay);
    if (holdRef.current.tick != null) clearInterval(holdRef.current.tick);
    holdRef.current = { delay: null, tick: null };
  };

  useEffect(() => () => stopHold(), []);

  /* Слайдер/кнопки обновили мм — подтянуть draft, если не печатаем */
  useEffect(() => {
    if (!editing) setDraft(String(value));
  }, [value, editing]);

  useEffect(() => {
    const el = rangeRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const dir = e.deltaY > 0 ? -step : step;
      onChange(clampDim(valueRef.current + dir, min, max));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [min, max, step, onChange]);

  const commitDraft = () => {
    setEditing(false);
    const raw = draft.replace(/\D/g, '');
    if (!raw) {
      setDraft(String(valueRef.current));
      return;
    }
    set(Number(raw));
  };

  /** Первый шаг сразу, после паузы — быстрый автоповтор до min/max */
  const startHold = (dir: 1 | -1) => (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    stopHold();
    e.currentTarget.setPointerCapture(e.pointerId);

    const stepOnce = () => {
      const next = clampDim(valueRef.current + dir * step, min, max);
      if (next === valueRef.current) {
        stopHold();
        return false;
      }
      onChange(next);
      return true;
    };

    if (!stepOnce()) return;
    holdRef.current.delay = setTimeout(() => {
      holdRef.current.tick = setInterval(() => {
        if (!stepOnce()) stopHold();
      }, 48);
    }, 380);
  };

  return (
    <div className="cfg-dim">
      <div className="cfg-dim-head">
        <span className="lbl">{label}</span>
        <label className="cfg-dim-num">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            className="cfg-dim-num-input num"
            value={editing ? draft : String(value)}
            aria-label={ariaLabel}
            onFocus={(e) => {
              setEditing(true);
              setDraft(String(valueRef.current));
              e.target.select();
            }}
            onChange={(e) => setDraft(e.target.value.replace(/\D/g, ''))}
            onBlur={commitDraft}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.currentTarget.blur();
              } else if (e.key === 'Escape') {
                setDraft(String(valueRef.current));
                setEditing(false);
                e.currentTarget.blur();
              }
            }}
          />
          <span className="cfg-dim-num-unit" aria-hidden>
            мм
          </span>
        </label>
      </div>
      <div className="cfg-dim-row">
        <button
          type="button"
          className="cfg-dim-btn"
          aria-label={`${ariaLabel}: минус ${step} мм`}
          disabled={value <= min}
          onPointerDown={startHold(-1)}
          onPointerUp={stopHold}
          onPointerCancel={stopHold}
          onLostPointerCapture={stopHold}
        >
          −
        </button>
        <input
          ref={rangeRef}
          type="range"
          className="cfg-range"
          min={min}
          max={max}
          step={step}
          value={value}
          aria-label={`${ariaLabel}: ползунок`}
          onChange={(e) => set(+e.target.value)}
        />
        <button
          type="button"
          className="cfg-dim-btn"
          aria-label={`${ariaLabel}: плюс ${step} мм`}
          disabled={value >= max}
          onPointerDown={startHold(1)}
          onPointerUp={stopHold}
          onPointerCancel={stopHold}
          onLostPointerCapture={stopHold}
        >
          +
        </button>
      </div>
      {hint}
    </div>
  );
}

export function Configurator({ models, families, initialSlug, initialDims }: Props) {
  const [modelSlug, setModelSlug] = useState(() =>
    resolveInitialSlug(models, families, initialSlug),
  );
  const model = models.find((m) => m.slug === modelSlug) ?? models[0];
  const family = families.find((f) => f.code === model.family)!;

  const [dims, setDims] = useState<Dims>(() => resolveInitialDims(model, initialDims));
  const [mount, setMount] = useState(DEFAULT_MOUNT);
  const [material, setMaterial] = useState<'430' | '304'>('430');
  const [options, setOptions] = useState<string[]>([]);
  const [mode, setMode] = useState<ViewMode>('solid');
  const [view, setView] = useState<'3d' | 'draft'>('3d');
  const [webgl, setWebgl] = useState<boolean | null>(null);
  /* Счётчик «вписать сцену» — растёт при жёстком сбросе */
  const [sceneFit, setSceneFit] = useState(0);

  /*
   * Снимок входа: каталог (slug+мм) или дефолт конфигуратора.
   * «Сбросить» возвращает именно сюда, а не к абстрактному ЗВП.
   */
  const entryRef = useRef<{
    modelSlug: string;
    dims: Dims;
    mount: number;
    material: '430' | '304';
    options: string[];
    mode: ViewMode;
    view: '3d' | 'draft';
  } | null>(null);
  if (entryRef.current === null) {
    entryRef.current = {
      modelSlug,
      dims: { ...dims },
      mount,
      material,
      options: [...options],
      mode,
      view,
    };
  }

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
    () => buildLayout(dims, traits, calc.ducts, { lamps: options.includes(OPTIONS[3]), typeLabel: model.type }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dims, model.slug, model.type, calc.ducts.count, calc.ducts.diameter, options],
  );

  function selectModel(slug: string) {
    const next = models.find((m) => m.slug === slug)!;
    setModelSlug(slug);
    setDims({ h: next.h, w: next.w, d: next.d });
  }

  /** Жёсткий сброс к состоянию при входе + вернуть зонт в кадр */
  function reset() {
    const e = entryRef.current!;
    setModelSlug(e.modelSlug);
    setDims({ ...e.dims });
    setMount(e.mount);
    setMaterial(e.material);
    setOptions([...e.options]);
    setMode(e.mode);
    setView(e.view);
    setSceneFit((n) => n + 1);
  }

  const isBase = dims.h === base.h && dims.w === base.w && dims.d === base.d;
  const title = `${model.article} · ${dims.h}/${dims.w}/${dims.d}`;
  const familyModels = models.filter((m) => m.family === model.family);

  const cfgText = buildCfgText({
    family,
    model,
    dims,
    mount,
    material,
    options,
    airflow: calc.airflow,
    ducts: calc.ducts,
    price: calc.price,
  });

  const orderHref = `/contacts?mode=order&cfg=${encodeURIComponent(cfgText)}`;
  const quoteHref = `/contacts?mode=quote&cfg=${encodeURIComponent(cfgText)}`;

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
          <DimSlider
            key={key}
            label={key === 'w' ? 'Ширина W' : key === 'd' ? 'Глубина D' : 'Высота короба H'}
            value={dims[key]}
            min={LIMITS[key].min}
            max={LIMITS[key].max}
            step={LIMITS[key].step}
            ariaLabel={key === 'w' ? 'Ширина, мм' : key === 'd' ? 'Глубина, мм' : 'Высота короба, мм'}
            onChange={(v) => setDims((s) => ({ ...s, [key]: v }))}
          />
        ))}

        {isBase ? (
          <p className="hint">Эталонный типоразмер линейки — цена из прайса.</p>
        ) : (
          <p className="hint">
            Нужна другая форма — вырез, скос, патрубок вбок?{' '}
            <Link href="/nestandartnyy-zont" style={{ color: 'var(--color-supply)' }}>
              По вашему чертежу
            </Link>
            .
          </p>
        )}

        <DimSlider
          label="Нижняя кромка от пола"
          value={mount}
          min={LIMITS.mount.min}
          max={LIMITS.mount.max}
          step={LIMITS.mount.step}
          ariaLabel="Высота нижней кромки от пола, мм"
          onChange={setMount}
          hint={
            <p className="hint">
              Свес над оборудованием: {ru(mount - 850)} мм при высоте линии 850 мм.
            </p>
          }
        />

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
          <p className="hint">
            AISI 304 — для влажных зон и гидроконтура. Надбавка оценочная, уточняется у производства.
          </p>
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
        <p className="hint mt-2">
          Вернёт семейство, тип и размеры как при входе — в том числе если пришли из каталога.
        </p>

        <div className="cfg-cta-block">
          <Link href={orderHref} className="btn w-full">
            Отправить заказ
          </Link>
          <p className="hint mt-2">
            Берём сборку как на экране: чертёж, КП и спецификация уйдут в заявку.
          </p>
        </div>
      </aside>

      {/* ---------------- сцена ---------------- */}
      <div className="cfg-stage">
        <div className="cfg-toolbar">
          <div className="cfg-seg">
            <button type="button" aria-pressed={view === '3d'} onClick={() => setView('3d')}>
              3D
            </button>
            <button type="button" aria-pressed={view === 'draft'} onClick={() => setView('draft')}>
              Чертёж
            </button>
          </div>
          {view === '3d' && (
            <>
              <div className="cfg-seg">
                {(
                  [
                    ['solid', 'Реализм'],
                    ['xray', 'Рентген'],
                    ['explode', 'Разнос'],
                  ] as [ViewMode, string][]
                ).map(([m, label]) => (
                  <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)}>
                    {label}
                  </button>
                ))}
              </div>
            </>
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
                typeLabel: model.type,
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
              typeLabel={model.type}
              fitRequest={sceneFit}
            />
          )}
        </div>
        <div className="cfg-status">
          <span>
            МОДЕЛЬ <b>{model.article}</b>
          </span>
          <span>
            ГАБАРИТ H/W/D <b>
              {dims.h}/{dims.w}/{dims.d}
            </b>
          </span>
          <span>
            МАТЕРИАЛ <b>AISI {material}</b>
          </span>
          <span>
            РЕЖИМ{' '}
            <b>
              {view === 'draft'
                ? 'ЧЕРТЁЖ'
                : mode === 'solid'
                  ? 'РЕАЛИЗМ'
                  : mode === 'xray'
                    ? 'РЕНТГЕН'
                    : 'РАЗНОС'}
            </b>
          </span>
          <span>
            ЕДИНИЦЫ <b>мм</b>
          </span>
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

        {calc.warnings.length > 0 && (
          <div className="cfg-group cfg-alerts">
            <span className="lbl">Внимание</span>
            {calc.warnings.map((w) => (
              <span
                key={w}
                className={
                  w.startsWith('п. 5.30') || w.startsWith('Нестандарт')
                    ? 'badge badge-crit'
                    : 'badge badge-warn'
                }
              >
                {w}
              </span>
            ))}
          </div>
        )}

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

        <div className="cfg-cta-block">
          <Link href={quoteHref} className="btn w-full">
            Получить точную цену
          </Link>
          <p className="hint mt-2">
            Производство пересчитает по вашим вводным: приложите эскизы и пояснения в заявке.
          </p>
          <p className="hint mt-3">
            Цена нестандартного габарита — оценка по площади материала от эталонного типоразмера.
            Точный расчёт делает производство.
          </p>
        </div>
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
