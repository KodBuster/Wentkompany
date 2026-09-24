'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { GOALS, track } from '@/lib/analytics';

interface Item {
  id: string;
  clause: string;
  /** id пункта для подсказки (как на карточках выше) */
  clauseId: string;
  question: string;
  detail: string;
  /** что предлагаем, если ответ «нет» */
  fix: string;
}

/** Краткие формулировки пунктов — те же смыслы, что в блоке «Шесть пунктов» выше. */
const CLAUSE_TIP: Record<string, { title: string; text: string }> = {
  '5.28': {
    title: 'Схема удаления',
    text:
      'Удаление продуктов горения предусматривается через дымоотвод наружу или в самостоятельный дымовой канал от вытяжного зонта над оборудованием. Прокладка дымоотводов через другие помещения не допускается.',
  },
  '5.29': {
    title: 'Противопожарные разрывы',
    text:
      'Пол по периметру аппарата — из негорючих материалов шириной не менее 500 мм. До предметов из горючих материалов и мест хранения топлива — не менее 3,0 м; ближе только в закрытых металлических ящиках и шкафах, но не ближе 500 мм.',
  },
  '5.30': {
    title: 'Гидрофильтры и обвязка',
    text:
      'Датчики температуры на входах в гидрофильтр. Световые и звуковые сигнализаторы при 95 % от максимальной рабочей температуры и при падении давления воды, не далее 2 м от аппарата. Электроснабжение — по 1-й категории. Звуковой сигнал не менее 85 дБ на 1 м.',
  },
  '5.32': {
    title: 'Тракт после гидрофильтра',
    text:
      'Воздуховоды на участке после гидрофильтра до оголовка — с пределом огнестойкости не менее EI 45 по ГОСТ Р 53299. Подключение к ним выбросов общеобменной и местной вентиляции не допускается.',
  },
  '5.33': {
    title: 'Вентиляторы',
    text:
      'При применении вентиляторов для повышения тяги — предел огнестойкости не менее 2,0 ч при 400 °C, электроснабжение по 1-й категории надёжности.',
  },
};

const ITEMS: Item[] = [
  {
    id: 'hood',
    clause: 'п. 5.28',
    clauseId: '5.28',
    question: 'Над аппаратом стоит вытяжной зонт с отдельным трактом наружу?',
    detail:
      'Удаление продуктов горения — через дымоотвод наружу или в самостоятельный дымовой канал. Прокладка через другие помещения не допускается.',
    fix: 'Вытяжной зонт над очагом и отдельный тракт наружу (не через чужие помещения)',
  },
  {
    id: 'floor',
    clause: 'п. 5.29',
    clauseId: '5.29',
    question: 'Пол по периметру аппарата негорючий, не менее 500 мм?',
    detail:
      'До горючей отделки, мебели и мест хранения топлива — не менее 3,0 м. Ближе допускается только закрытое металлическое хранение и не ближе 500 мм.',
    fix: 'Уточняем на замере, влияет на размещение изделия',
  },
  {
    id: 'filter',
    clause: 'п. 5.30',
    clauseId: '5.30',
    question: 'Установлен гидрофильтр или зонт с гидрозатвором?',
    detail:
      'Гидрофильтр снижает температуру продуктов горения и гасит искру. Размещается открыто в том же помещении, где стоит аппарат.',
    fix: 'Гидрофильтр или зонт с гидрозатвором',
  },
  {
    id: 'automation',
    clause: 'п. 5.30',
    clauseId: '5.30',
    question: 'Есть датчики температуры и сигнализаторы давления воды?',
    detail:
      'Сигнализация при 95 % от максимальной рабочей температуры и при падении давления в водоснабжении, не далее 2 м от аппарата, сигнал не менее 85 дБ на 1 м.',
    fix: 'Щит управления и диспетчеризации',
  },
  {
    id: 'power',
    clause: 'п. 5.30',
    clauseId: '5.30',
    question: 'Электроснабжение фильтра и автоматики по 1-й категории надёжности?',
    detail: 'Требование распространяется на все устройства контроля и на сам гидрофильтр.',
    fix: 'Закладывается в проект электроснабжения объекта',
  },
  {
    id: 'duct',
    clause: 'п. 5.32',
    clauseId: '5.32',
    question: 'Воздуховод после гидрофильтра — не ниже EI 45?',
    detail:
      'На всём участке до оголовка, по ГОСТ Р 53299. Подключать выбросы общеобменной и местной вентиляции к нему нельзя.',
    fix: 'Огнестойкий воздуховод по проекту',
  },
  {
    id: 'fan',
    clause: 'п. 5.33',
    clauseId: '5.33',
    question: 'Вентилятор с пределом огнестойкости 2,0 ч / 400 °C?',
    detail:
      'Требование действует, если вентилятор применяется для повышения тяги. Питание — по 1-й категории надёжности.',
    fix: 'Подбор вентилятора в составе комплекта',
  },
];

type Answer = 'yes' | 'no' | null;

/** Розовый бейдж пункта: курсор «?»; по клику — текст нормы (можно копировать). */
function ClauseTipBadge({ clauseId, label }: { clauseId: string; label: string }) {
  const tip = CLAUSE_TIP[clauseId];
  const hitRef = useRef<HTMLSpanElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: Event) => {
      const t = e.target as Node | null;
      if (hitRef.current?.contains(t)) return;
      if (tipRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!tip) {
    return <span className="badge badge-crit">{label}</span>;
  }

  const tipW = 300;
  const tipH = 168;
  const gap = 14;

  let left = 0;
  let top = 0;
  let placeAbove = false;
  if (anchor) {
    left = anchor.x + gap;
    if (left + tipW > window.innerWidth - 12) {
      left = anchor.x - tipW - gap;
    }
    placeAbove = window.innerHeight - anchor.y < tipH + 28;
    top = placeAbove ? anchor.y - gap : anchor.y + gap;
  }

  return (
    <>
      <span
        ref={hitRef}
        className="badge badge-crit clause-tip-hit"
        role="button"
        tabIndex={0}
        aria-expanded={open}
        aria-label={`${label}: ${tip.title}. Нажмите, чтобы прочитать формулировку.`}
        onClick={(e) => {
          e.stopPropagation();
          if (open) {
            setOpen(false);
            return;
          }
          setAnchor({ x: e.clientX, y: e.clientY });
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key !== 'Enter' && e.key !== ' ') return;
          e.preventDefault();
          const r = hitRef.current?.getBoundingClientRect();
          if (!r) return;
          if (open) {
            setOpen(false);
            return;
          }
          setAnchor({ x: r.left + r.width / 2, y: r.bottom });
          setOpen(true);
        }}
      >
        {label}
      </span>
      {open &&
        anchor &&
        createPortal(
          <div
            ref={tipRef}
            className={`clause-tip clause-tip--interactive${placeAbove ? ' clause-tip--above' : ''}`}
            style={{ left, top }}
            role="dialog"
            aria-label={`п. ${clauseId}: ${tip.title}`}
          >
            <p className="lbl" style={{ color: 'var(--color-extract)' }}>
              п. {clauseId}
            </p>
            <p className="clause-tip__title">{tip.title}</p>
            <p className="clause-tip__text">{tip.text}</p>
          </div>,
          document.body,
        )}
    </>
  );
}

export function ComplianceCheck() {
  const [answers, setAnswers] = useState<Record<string, Answer>>({});

  const gaps = useMemo(() => ITEMS.filter((i) => answers[i.id] === 'no'), [answers]);
  const answered = ITEMS.filter((i) => answers[i.id]).length;
  const done = answered === ITEMS.length;

  return (
    <div>
      <div className="tiles" style={{ gridTemplateColumns: '1fr' }}>
        {ITEMS.map((item) => {
          const a = answers[item.id];
          return (
            <div key={item.id} className="tile">
              <div className="flex flex-wrap items-baseline gap-3">
                <span className="lbl" style={{ color: 'var(--color-extract)' }}>{item.clause}</span>
                <h3
                  className="min-w-[240px] flex-1"
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontWeight: 600,
                    textTransform: 'none',
                    fontSize: '1.02rem',
                  }}
                >
                  {item.question}
                </h3>
                <div className="flex gap-2">
                  {(['yes', 'no'] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => {
                        if (v === 'no' && a !== 'no') {
                          track(GOALS.complianceGap, { clause: item.clause, id: item.id });
                        }
                        setAnswers((s) => ({ ...s, [item.id]: s[item.id] === v ? null : v }));
                      }}
                      aria-pressed={a === v}
                      className="num min-h-10 cursor-pointer border px-3 py-1.5 text-xs uppercase"
                      style={{
                        borderColor:
                          a === v
                            ? v === 'yes'
                              ? 'var(--color-ok)'
                              : 'var(--color-crit)'
                            : 'var(--color-steel-700)',
                        color:
                          a === v
                            ? v === 'yes'
                              ? 'var(--color-ok)'
                              : 'var(--color-crit)'
                            : 'var(--color-steel-300)',
                        background:
                          a === v
                            ? v === 'yes'
                              ? 'rgba(79,169,122,.12)'
                              : 'rgba(210,64,46,.12)'
                            : 'transparent',
                      }}
                    >
                      {v === 'yes' ? 'Есть' : 'Нет'}
                    </button>
                  ))}
                </div>
              </div>
              <p className="muted text-sm">{item.detail}</p>
            </div>
          );
        })}
      </div>

      <div
        className="mt-6 border p-6"
        style={{ borderColor: 'var(--hair)', background: 'var(--color-steel-900)' }}
      >
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h3>Результат</h3>
          <span className="num text-sm text-steel-400">
            отвечено {answered} из {ITEMS.length}
          </span>
        </div>

        {answered === 0 && (
          <p className="muted mt-3 text-sm">
            Отметьте, что уже есть на объекте, — соберём список того, чего не хватает по пунктам{' '}
            {ITEMS[0].clause}–п. 5.33.
          </p>
        )}

        {answered > 0 && gaps.length === 0 && (
          <p className="mt-3 text-sm" style={{ color: 'var(--color-ok)' }}>
            {done
              ? 'По отмеченным пунктам объект закрывает требования. Проверку на приёмке это не заменяет — сверьтесь с проектом.'
              : 'Пока пробелов не отмечено. Ответьте на оставшиеся пункты.'}
          </p>
        )}

        {gaps.length > 0 && (
          <>
            <p className="muted mt-3 text-sm">
              Не закрыто пунктов: {gaps.length}. Что потребуется:
            </p>
            <ul className="mt-3 flex flex-col gap-2">
              {gaps.map((g) => (
                <li key={g.id} className="flex flex-wrap items-baseline gap-3 text-sm">
                  <ClauseTipBadge clauseId={g.clauseId} label={g.clause} />
                  <span>{g.fix}</span>
                </li>
              ))}
            </ul>
            <Link href="/contacts" className="btn mt-5">
              Прислать расчёт комплекта
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
