'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ru, rub } from '@/lib/calc';

/**
 * Окупаемость эффективной фильтрации.
 *
 * Считаем только то, что можно посчитать честно: экономию на чистках
 * воздуховодов. Базовый эффект — сокращение с 12 до 2 чисток в год —
 * взят из исследования по вентиляции горячих цехов (КиберЛенинка),
 * ссылка приведена под калькулятором. Всё остальное — цифры объекта,
 * которые вводит сам пользователь: ничего не выдумываем за него.
 *
 * Снижение пожарного риска и штрафов сознательно НЕ монетизируем:
 * такую оценку невозможно обосновать, а в КП она выглядит как приписка.
 */

const CLEANINGS_BEFORE = 12;
const CLEANINGS_AFTER = 2;

export function RoiCalculator() {
  const [cleaningCost, setCleaningCost] = useState(18000);
  const [tracts, setTracts] = useState(1);
  const [equipmentCost, setEquipmentCost] = useState(120000);

  const result = useMemo(() => {
    const before = cleaningCost * CLEANINGS_BEFORE * tracts;
    const after = cleaningCost * CLEANINGS_AFTER * tracts;
    const savingPerYear = before - after;
    const payback = savingPerYear > 0 ? equipmentCost / savingPerYear : null;
    return { before, after, savingPerYear, payback };
  }, [cleaningCost, tracts, equipmentCost]);

  const field = (
    label: string,
    value: number,
    setValue: (v: number) => void,
    min: number,
    max: number,
    step: number,
    unit: string,
  ) => (
    <div className="cfg-group" key={label}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="lbl">{label}</span>
        <span className="num">
          {ru(value)} {unit}
        </span>
      </div>
      <input
        type="range"
        className="cfg-range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        onChange={(e) => setValue(Number(e.target.value))}
      />
    </div>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <div className="border p-6" style={{ borderColor: 'var(--hair)', background: 'var(--color-steel-900)' }}>
        <h3 className="mb-4">Данные вашего объекта</h3>
        {field('Стоимость одной чистки тракта', cleaningCost, setCleaningCost, 5000, 60000, 1000, '₽')}
        {field('Самостоятельных трактов', tracts, setTracts, 1, 6, 1, 'шт')}
        {field('Бюджет на фильтрацию', equipmentCost, setEquipmentCost, 40000, 600000, 10000, '₽')}
        <p className="hint">
          Цифры подставьте свои — из счетов подрядчика по чистке и из нашего расчёта комплекта.
          Тракт — отдельный канал наружу; зонты на общем коллекторе считаются как один тракт.
        </p>
      </div>

      <div className="border p-6" style={{ borderColor: 'var(--hair)', background: 'var(--color-steel-900)' }}>
        <h3 className="mb-4">Что меняется за год</h3>
        <dl className="cfg-kv">
          <div>
            <dt>Чисток сейчас</dt>
            <dd className="num">{CLEANINGS_BEFORE * tracts} × {rub(cleaningCost)}</dd>
          </div>
          <div>
            <dt>Стоимость чисток сейчас</dt>
            <dd>{rub(result.before)}</dd>
          </div>
          <div>
            <dt>Чисток после фильтрации</dt>
            <dd className="num">{CLEANINGS_AFTER * tracts} × {rub(cleaningCost)}</dd>
          </div>
          <div>
            <dt>Экономия в год</dt>
            <dd style={{ color: 'var(--color-ok)' }}>{rub(result.savingPerYear)}</dd>
          </div>
        </dl>

        <div className="mt-6 border-t pt-5" style={{ borderColor: 'var(--hair)' }}>
          <span className="lbl">Окупаемость оборудования</span>
          <div className="cfg-price mt-1">
            {result.payback ? `${result.payback.toFixed(1).replace('.', ',')} года` : '—'}
          </div>
          <p className="hint mt-2">
            Только на чистках канала: простои кухни, пожарный риск и штрафы сюда не заложены —
            такую оценку невозможно обосновать. Базовый эффект — сокращение чисток с {CLEANINGS_BEFORE}
            {' '}до {CLEANINGS_AFTER} в год при эффективной фильтрации.
          </p>
        </div>

        <Link href="/contacts" className="btn mt-6 w-full">
          Посчитать комплект под мою кухню
        </Link>
      </div>
    </div>
  );
}
