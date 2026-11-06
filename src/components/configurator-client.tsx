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
import {
  calculate,
  ru,
  rub,
  dec,
  defaultMaterialGrade,
  clampLampQty,
  CAPTURE_VELOCITIES,
  CAPTURE_VELOCITY_LABELS,
  DEFAULT_CAPTURE_VELOCITY,
  LAMP_QTY_MAX,
  LAMP_QTY_MIN,
  OPTION_LAMPS,
  type CaptureVelocity,
  type Dims,
  type FamilyTraits,
  SIZE_ORDER,
  sizeCompact,
  sizeLabelMm,
} from '@/lib/calc';
import { buildLayout } from '@/lib/geometry';
import {
  isMatrixArticle,
  matrixStartDims,
  matrixTicksForAxis,
} from '@/lib/prices';
import { HoodDrawing } from './hood-drawing';
import { ExportButtons } from './export-buttons';
import { ClauseRichText } from '@/components/clause-tip';
import type { ViewMode } from './hood-scene';
import { GOALS, track } from '@/lib/analytics';

/** Типовые высоты нижней кромки от пола — быстрый snap. */
const MOUNT_TICKS = [1900, 2000] as const;

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
  /* Островная матрица ЗВО до 2500 по D */
  d: { min: 600, max: 2500, step: 1 },
  h: { min: 300, max: 700, step: 1 },
  mount: { min: 1600, max: 2600, step: 1 },
};

/** Ширина бегунка .cfg-range — для совпадения рисок с визуальной позицией thumb. */
const RANGE_THUMB_PX = 12;

/** left% с учётом хода бегунка (не край в край трека). */
function tickLeftCss(value: number, min: number, max: number): string {
  const p = max > min ? (value - min) / (max - min) : 0;
  return `calc(${p} * (100% - ${RANGE_THUMB_PX}px) + ${RANGE_THUMB_PX / 2}px)`;
}

const OPTIONS = [
  'Врезка присоединительная',
  'Проушины для монтажа',
  'Кран для слива жира и конденсата',
  OPTION_LAMPS,
] as const;

const DEFAULT_MOUNT = 2000;
/** Типовая высота варочной линии, мм (для ориентира свеса). */
const COOK_LINE_H = 850;

/**
 * Минимальный горизонтальный свес за габарит оборудования, мм.
 * Ориентир производителей: при z=H−h ≤ 1,2 м → 200; выше → +0,208·Δz (угол ~12°).
 */
function recommendOverhangMm(mountMm: number, lineH = COOK_LINE_H): number {
  const z = Math.max(0, mountMm - lineH);
  if (z <= 1200) return 200;
  return Math.round(200 + (z - 1200) * 0.208);
}

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

/** Габарит модели: из query, иначе старт матрицы, иначе каталожный base. */
function dimsForModel(
  model: ConfiguratorModel,
  initialDims?: Partial<Dims>,
): Dims {
  const fromQuery =
    initialDims &&
    (initialDims.h != null || initialDims.w != null || initialDims.d != null);
  if (fromQuery) {
    const pick = (key: keyof Dims, lim: { min: number; max: number }, fallback: number) => {
      const raw = initialDims?.[key];
      if (typeof raw === 'number' && Number.isFinite(raw)) return clampDim(raw, lim.min, lim.max);
      return clampDim(fallback, lim.min, lim.max);
    };
    const start = isMatrixArticle(model.article)
      ? matrixStartDims(model.article)
      : null;
    const fb = start ?? { h: model.h, w: model.w, d: model.d };
    return {
      h: pick('h', LIMITS.h, fb.h),
      w: pick('w', LIMITS.w, fb.w),
      d: pick('d', LIMITS.d, fb.d),
    };
  }
  if (isMatrixArticle(model.article)) {
    const start = matrixStartDims(model.article);
    if (start) {
      return {
        h: clampDim(start.h, LIMITS.h.min, LIMITS.h.max),
        w: clampDim(start.w, LIMITS.w.min, LIMITS.w.max),
        d: clampDim(start.d, LIMITS.d.min, LIMITS.d.max),
      };
    }
  }
  return {
    h: clampDim(model.h, LIMITS.h.min, LIMITS.h.max),
    w: clampDim(model.w, LIMITS.w.min, LIMITS.w.max),
    d: clampDim(model.d, LIMITS.d.min, LIMITS.d.max),
  };
}

function resolveInitialDims(model: ConfiguratorModel, initialDims?: Partial<Dims>): Dims {
  return dimsForModel(model, initialDims);
}

/** Полная строка конфигурации для заявки (заказ / точная цена). */
function buildCfgText(input: {
  family: ConfiguratorFamily;
  model: ConfiguratorModel;
  dims: Dims;
  mount: number;
  material: string;
  options: string[];
  lampQty: number;
  /** Патрубки — только при опции «Врезка присоединительная». */
  withCollar: boolean;
  ducts: { count: number; diameter: number };
  supplyDucts: { count: number; diameter: number } | null;
  supplyGrilles: number | null;
  price: { value: number; estimate: boolean } | null;
}) {
  const {
    family,
    model,
    dims,
    mount,
    material,
    options,
    lampQty,
    withCollar,
    ducts,
    supplyDucts,
    supplyGrilles,
    price,
  } = input;
  const optionsLine = options
    .map((o) => (o === OPTION_LAMPS ? `${o} ${lampQty} шт` : o))
    .join(', ');
  /* В заявку — состав заказа, не справочный расход/захват (они остаются в UI «Расчёт»). */
  const bits = [
    `${family.code} · ${model.article}`,
    `${SIZE_ORDER} ${sizeLabelMm(dims)}`,
    `кромка от пола ${mount} мм`,
    `AISI ${material}`,
    options.length ? `опции: ${optionsLine}` : 'опции: нет',
    ...(withCollar ? [`вытяжка ${ducts.count}×Ø${ducts.diameter}`] : []),
    ...(withCollar && supplyDucts
      ? [`приток ${supplyDucts.count}×Ø${supplyDucts.diameter}`]
      : []),
    ...(supplyGrilles != null ? [`решётки притока ${supplyGrilles} шт`] : []),
    price
      ? `${price.estimate ? '≈ ' : ''}${rub(price.value)}`
      : 'после расчёта',
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
  ticks,
  /** Точки (H) или чёрточки-линейка (W/D). */
  tickStyle = 'dot',
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  ariaLabel: string;
  hint?: ReactNode;
  /** Метки прайса на треке (клик → snap). */
  ticks?: number[];
  tickStyle?: 'dot' | 'rule';
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
  const asRule = tickStyle === 'rule';
  const ticksRef = useRef<HTMLDivElement>(null);

  /** Клик по полосе → ближайший типоразмер (та же шкала, что у бегунка). */
  const snapNearest = (clientX: number) => {
    if (!ticks?.length || max <= min || !ticksRef.current) return;
    const rect = ticksRef.current.getBoundingClientRect();
    const usable = rect.width - RANGE_THUMB_PX;
    if (usable <= 0) return;
    const x = clientX - rect.left - RANGE_THUMB_PX / 2;
    const p = Math.min(1, Math.max(0, x / usable));
    const approx = min + p * (max - min);
    let best = ticks[0];
    let bestD = Math.abs(best - approx);
    for (let i = 1; i < ticks.length; i++) {
      const d = Math.abs(ticks[i] - approx);
      if (d < bestD) {
        bestD = d;
        best = ticks[i];
      }
    }
    set(best);
  };

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
        <div className="cfg-range-wrap">
          {ticks && ticks.length > 0 && max > min && (
            <div
              ref={ticksRef}
              className={asRule ? 'cfg-range-ticks cfg-range-ticks--rule' : 'cfg-range-ticks'}
              onPointerDown={(e) => {
                /* На линейке клик «рядом» снэпит к ближайшей риске */
                if (!asRule || e.button !== 0) return;
                if ((e.target as HTMLElement).closest('.cfg-range-tick')) return;
                e.preventDefault();
                snapNearest(e.clientX);
              }}
            >
              {ticks.map((t) => {
                const on = t === value;
                const major = asRule && t % 200 === 0;
                const cls = [
                  'cfg-range-tick',
                  on ? 'cfg-range-tick--on' : '',
                  major ? 'cfg-range-tick--major' : '',
                ]
                  .filter(Boolean)
                  .join(' ');
                return (
                  <button
                    key={t}
                    type="button"
                    className={cls}
                    style={{ left: tickLeftCss(t, min, max) }}
                    title={`${t} мм`}
                    aria-label={`${ariaLabel}: типоразмер ${t} мм`}
                    onClick={() => set(t)}
                  />
                );
              })}
            </div>
          )}
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
        </div>
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
  /* 304 — гидроконтур; 430 — обычный зонт без воды */
  const [material, setMaterial] = useState<'430' | '304'>(() =>
    defaultMaterialGrade(family.hydro),
  );
  const [options, setOptions] = useState<string[]>([]);
  /* Число светильников; учитывается только при галке OPTION_LAMPS */
  const [lampQty, setLampQty] = useState(LAMP_QTY_MIN);
  const [captureVelocity, setCaptureVelocity] =
    useState<CaptureVelocity>(DEFAULT_CAPTURE_VELOCITY);
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
    lampQty: number;
    captureVelocity: CaptureVelocity;
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
      lampQty,
      captureVelocity,
      mode,
      view,
    };
  }

  useEffect(() => setWebgl(hasWebGL()), []);
  useEffect(() => track(GOALS.configuratorOpen), []);

  const traits: FamilyTraits = { island: family.island, supply: family.supply, hydro: family.hydro };
  const base: Dims = { h: model.h, w: model.w, d: model.d };
  const withCollar = options.includes(OPTIONS[0]);
  const lampsOn = options.includes(OPTION_LAMPS);
  const calc = useMemo(
    () =>
      calculate(dims, traits, base, model.price, material, {
        captureVelocity,
        typeLabel: model.type,
        options: [...options],
        lampQty: lampsOn ? lampQty : undefined,
        article: model.article,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dims, model.slug, model.article, model.type, material, captureVelocity, options, lampQty, lampsOn],
  );
  const layout = useMemo(
    () =>
      buildLayout(dims, traits, calc.ducts, {
        lamps: lampsOn,
        lampQty: lampsOn ? lampQty : undefined,
        typeLabel: model.type,
        includeSpigots: withCollar,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      dims,
      model.slug,
      model.type,
      calc.ducts.count,
      calc.ducts.diameter,
      calc.supplyDucts?.count,
      calc.supplyGrilles,
      options,
      lampQty,
      lampsOn,
      withCollar,
    ],
  );

  function selectModel(slug: string) {
    const next = models.find((m) => m.slug === slug)!;
    const nextFamily = families.find((f) => f.code === next.family)!;
    setModelSlug(slug);
    /* Свободный выбор типа — старт сетки прайса, не каталожный «запомненный» base */
    setDims(dimsForModel(next));
    setMaterial(defaultMaterialGrade(nextFamily.hydro));
  }

  /** Жёсткий сброс к состоянию при входе + вернуть зонт в кадр */
  function reset() {
    const e = entryRef.current!;
    setModelSlug(e.modelSlug);
    setDims({ ...e.dims });
    setMount(e.mount);
    setMaterial(e.material);
    setOptions([...e.options]);
    setLampQty(e.lampQty);
    setCaptureVelocity(e.captureVelocity);
    setMode(e.mode);
    setView(e.view);
    setSceneFit((n) => n + 1);
  }

  /** Прайс есть: матричный hit или legacy base. */
  const hasListPrice = !!calc.price;
  const title = `${model.article} · ${sizeCompact(dims)}`;
  const familyModels = models.filter((m) => m.family === model.family);

  const cfgText = buildCfgText({
    family,
    model,
    dims,
    mount,
    material,
    options: [...options],
    lampQty,
    withCollar,
    ducts: calc.ducts,
    supplyDucts: calc.supplyDucts,
    supplyGrilles: calc.supplyGrilles,
    price: calc.price,
  });

  const contactsHref = (mode: 'order' | 'quote') => {
    const q = new URLSearchParams();
    q.set('mode', mode);
    q.set('cfg', cfgText);
    q.set('slug', model.slug);
    q.set('h', String(dims.h));
    q.set('w', String(dims.w));
    q.set('d', String(dims.d));
    q.set('material', material);
    q.set('v', String(captureVelocity));
    for (const option of options) q.append('opt', option);
    if (lampsOn) q.set('lamps', String(lampQty));
    return `/contacts?${q.toString()}`;
  };
  const orderHref = contactsHref('order');
  const quoteHref = contactsHref('quote');

  const spec: [string, string][] = [
    [`${model.article} · ${sizeCompact(dims)}`, '1 шт'],
    ['Жироуловители лабиринтные', `${layout.filters.reduce((s, r) => s + r.count, 0)} шт`],
    [`Сталь AISI ${material} · ${dec(calc.area)} м²`, ''],
    ...(withCollar
      ? ([[`Вытяжные патрубки Ø${calc.ducts.diameter}`, `${calc.ducts.count} шт`]] as [
          string,
          string,
        ][])
      : []),
    ...(withCollar && calc.supplyDucts
      ? ([[`Приточные патрубки Ø${calc.supplyDucts.diameter}`, `${calc.supplyDucts.count} шт`]] as [
          string,
          string,
        ][])
      : []),
    ...(calc.supplyGrilles != null
      ? ([[`Щелевые решётки притока 20×400`, `${calc.supplyGrilles} шт`]] as [string, string][])
      : []),
    /* Проушины — комплект; светильники — выбранное число штук */
    ...options.map((o) => {
      if (o === 'Проушины для монтажа') return [o, '4 шт'] as [string, string];
      if (o === OPTION_LAMPS) return [o, `${lampQty} шт`] as [string, string];
      return [o, ''] as [string, string];
    }),
    /* Щит АВТ и EI 45 — не в комплекте/цене зонта; норма — в плашке «Внимание», не в спецификации */
  ];

  /* Два слота в DOM (controls / aside) — CSS показывает один; JSX каждый раз новый */
  const renderMountSlider = () => (
    <DimSlider
      label="Нижняя кромка от пола"
      value={mount}
      min={LIMITS.mount.min}
      max={LIMITS.mount.max}
      step={LIMITS.mount.step}
      ariaLabel="Высота нижней кромки от пола, мм"
      onChange={setMount}
      ticks={[...MOUNT_TICKS]}
      hint={
        <p className="hint">
          Рекомендация: свес за оборудование ≥ {ru(recommendOverhangMm(mount))} мм
          (высота оборудования ~{COOK_LINE_H} мм; при дверях — больше).
        </p>
      }
    />
  );

  const renderVelocityGroup = () => (
    <div className="cfg-group">
      <span className="lbl">Скорость захвата, м/с</span>
      <div className="cfg-chips">
        {CAPTURE_VELOCITIES.map((v) => (
          <button
            key={v}
            type="button"
            className="cfg-chip"
            aria-pressed={captureVelocity === v}
            title={CAPTURE_VELOCITY_LABELS[v]}
            onClick={() => setCaptureVelocity(v)}
          >
            {dec(v, 1)}
          </button>
        ))}
      </div>
      <p className="hint">{CAPTURE_VELOCITY_LABELS[captureVelocity]}</p>
    </div>
  );

  return (
    <div className={`cfg-shell${view === 'draft' ? ' cfg-shell--draft' : ''}`}>
      {/* ---------------- левая панель ---------------- */}
      <aside className="cfg-pane cfg-pane--controls">
        {(['w', 'd', 'h'] as const).map((key) => {
          const lim = LIMITS[key];
          let ticks: number[] | undefined;
          let min = lim.min;
          let max = lim.max;
          if (isMatrixArticle(model.article)) {
            /* Только размеры с ценой при текущих остальных осях — без «пустых» рисок */
            const axis = matrixTicksForAxis(model.article, key, dims).filter(
              (n) => n >= lim.min && n <= lim.max,
            );
            if (axis.length > 0) {
              ticks = axis;
              min = lim.min;
              max = Math.min(lim.max, Math.max(axis[axis.length - 1], dims[key]));
            }
          }
          return (
            <DimSlider
              key={key}
              label={key === 'w' ? 'Ширина W' : key === 'd' ? 'Глубина D (вылет)' : 'Высота короба H'}
              value={dims[key]}
              min={min}
              max={max}
              step={lim.step}
              ariaLabel={
                key === 'w' ? 'Ширина, мм' : key === 'd' ? 'Глубина (вылет), мм' : 'Высота короба, мм'
              }
              onChange={(v) => setDims((s) => ({ ...s, [key]: v }))}
              ticks={ticks}
              tickStyle={key === 'h' ? 'dot' : 'rule'}
            />
          );
        })}

        {!hasListPrice && (
          <p className="hint">
            Габарит вне прайса или нужна другая форма — вырез, скос, патрубок вбок?{' '}
            <Link href="/nestandartnyy-zont" style={{ color: 'var(--color-supply)' }}>
              По вашему чертежу
            </Link>
            .
          </p>
        )}

        <div className="cfg-slot-mount--controls">{renderMountSlider()}</div>
        <div className="cfg-slot-velocity--controls">{renderVelocityGroup()}</div>

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
            По умолчанию: AISI {defaultMaterialGrade(traits.hydro)}
            {traits.hydro
              ? ' — нержавейка для водяных сред и гидроконтура.'
              : ' — стандарт для зонтов без воды; 304 — если важна стойкость к влаге.'}{' '}
            Надбавка за 304 оценочная, уточняется у производства.
          </p>
        </div>

        <div className="cfg-group">
          <span className="lbl">
            Дополнительное оборудование{' '}
            <span className="lbl-note">(увеличивает стоимость изделия)</span>
          </span>
          {OPTIONS.map((o) => {
            const checked = options.includes(o);
            const isLamps = o === OPTION_LAMPS;
            return (
              <div key={o} className={`cfg-opt-row${isLamps && checked ? ' cfg-opt-row--qty' : ''}`}>
                <label className="cfg-opt">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      const on = e.target.checked;
                      setOptions((s) => (on ? [...s, o] : s.filter((x) => x !== o)));
                      if (isLamps && on) setLampQty((q) => clampLampQty(q || LAMP_QTY_MIN));
                    }}
                  />
                  <span>{o}</span>
                </label>
                {isLamps && checked && (
                  <div className="cfg-opt-qty" aria-label="Число светильников">
                    <button
                      type="button"
                      className="cfg-opt-qty__btn"
                      aria-label="Меньше"
                      disabled={lampQty <= LAMP_QTY_MIN}
                      onClick={() => setLampQty((q) => clampLampQty(q - 1))}
                    >
                      −
                    </button>
                    <span className="cfg-opt-qty__val">{lampQty}</span>
                    <button
                      type="button"
                      className="cfg-opt-qty__btn"
                      aria-label="Больше"
                      disabled={lampQty >= LAMP_QTY_MAX}
                      onClick={() => setLampQty((q) => clampLampQty(q + 1))}
                    >
                      +
                    </button>
                  </div>
                )}
              </div>
            );
          })}
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
            Берём сборку как на экране: чертёж PDF уйдёт в заявку.
          </p>
        </div>
      </aside>

      {/* ---------------- сцена ---------------- */}
      <div className="cfg-stage">
        <div className="cfg-stage-pickers">
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
        </div>
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
                lamps: lampsOn,
                lampQty: lampsOn ? lampQty : undefined,
                options: [...options],
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
              lamps={lampsOn}
              lampQty={lampsOn ? lampQty : undefined}
              includeSpigots={withCollar}
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
            ГАБАРИТ {SIZE_ORDER}{' '}
            <b>{sizeCompact(dims)}</b>
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
        {/* Атмосфера под строкой статуса — заполняет низ средней колонки */}
        <div className="cfg-stage-art" aria-hidden>
          <div
            className="cfg-stage-art__img"
            style={{ backgroundImage: 'url(/backdrops/cfg-stage-strip.webp)' }}
          />
        </div>
      </div>

      {/* ---------------- правая панель ---------------- */}
      <aside className="cfg-pane cfg-pane--aside">
        <div className="cfg-group">
          <span className="lbl">{calc.price ? 'Цена стандарта' : 'Цена'}</span>
          <div className="cfg-price">
            {calc.price
              ? `${calc.price.estimate ? '≈ ' : ''}${rub(calc.price.value)}`
              : 'после расчёта'}
          </div>
          {calc.price ? (
            <span className={calc.price.estimate ? 'badge badge-warn' : 'badge'}>
              {calc.price.estimate ? 'с учётом AISI 304' : 'цена из прайса'}
            </span>
          ) : (
            <span className="badge badge-warn">нестандарт — запросите расчёт</span>
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
                <ClauseRichText text={w} />
              </span>
            ))}
          </div>
        )}

        <div className="cfg-group">
          <span className="lbl">Расчёт</span>
          <dl className="cfg-kv">
            <Row k="Расход воздуха" v={`${ru(calc.airflow)} м³/ч`} />
            <Row k="Скорость захвата" v={`${dec(calc.captureVelocity, 1)} м/с`} />
            {withCollar && (
              <>
                <Row k="Вытяжка" v={`${calc.ducts.count} × Ø${calc.ducts.diameter}`} />
                <Row k="Скорость в вытяжке" v={`${dec(calc.ducts.velocity)} м/с`} />
                {calc.supplyDucts && (
                  <Row
                    k="Приток"
                    v={`${calc.supplyDucts.count} × Ø${calc.supplyDucts.diameter}`}
                  />
                )}
              </>
            )}
            {calc.supplyGrilles != null && (
              <Row k="Решётки притока" v={`${calc.supplyGrilles} шт (20×400)`} />
            )}
            <Row k="Площадь захвата" v={`${dec(calc.captureArea, 2)} м²`} />
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
          <ExportButtons
            slug={model.slug}
            dims={dims}
            material={material}
            options={[...options]}
            lampQty={lampsOn ? lampQty : undefined}
          />
          <p className="hint mt-2">
            IFC4: тело, патрубки, материал, количества и набор свойств конфигурации.
          </p>
        </div>

        <div className="cfg-slot-mount--aside">{renderMountSlider()}</div>
        <div className="cfg-slot-velocity--aside">{renderVelocityGroup()}</div>

        <div className="cfg-cta-block">
          <Link href={hasListPrice ? orderHref : quoteHref} className="btn w-full">
            {hasListPrice ? 'Заказать' : 'Запросить расчёт'}
          </Link>
          <p className="hint mt-2">
            {hasListPrice
              ? 'Типоразмер из прайса. В заявке можно уточнить опции и сроки.'
              : 'Габарит вне прайса: приложите эскизы — производство посчитает сумму и срок.'}
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
