'use client';

import { useState } from 'react';
import { GOALS, track } from '@/lib/analytics';

type Status = 'idle' | 'sending' | 'ok' | 'error';

const OBJECTS = [
  'Мангал, тандыр, хоспер — открытый огонь',
  'Ресторан, кафе, бар',
  'Столовая, производство питания',
  'Тёмная кухня',
  'Частный дом, мангальная зона',
  'Проектная организация',
];

export function LeadForm({ configuration }: { configuration?: string }) {
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    if (data.company) return; // honeypot
    setStatus('sending');
    setError('');
    try {
      const res = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, configuration, page: window.location.pathname }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Не удалось отправить заявку');
      setStatus('ok');
      track(GOALS.leadSent, { withConfiguration: Boolean(configuration) });
      form.reset();
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Не удалось отправить заявку');
    }
  }

  if (status === 'ok') {
    return (
      <div className="border p-6" style={{ borderColor: 'var(--color-ok)', background: 'rgba(79,169,122,.1)' }}>
        <h3 style={{ color: 'var(--color-ok)' }}>Заявка отправлена</h3>
        <p className="muted mt-2 text-sm">
          Свяжемся в течение рабочего дня. Если вопрос срочный — позвоните, ответим быстрее.
        </p>
        <button type="button" className="btn btn-ghost mt-4" onClick={() => setStatus('idle')}>
          Отправить ещё одну
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-4 border p-6"
      style={{ borderColor: 'var(--hair)', background: 'var(--color-steel-900)' }}
    >
      {configuration && (
        <div className="border p-3" style={{ borderColor: 'var(--color-supply)', background: 'rgba(88,180,220,.1)' }}>
          <span className="lbl" style={{ color: 'var(--color-supply)' }}>Конфигурация прикреплена</span>
          <p className="num mt-1 text-sm">{configuration}</p>
        </div>
      )}
      <label className="field">
        <span className="lbl">Имя</span>
        <input className="input" type="text" name="name" autoComplete="name" required maxLength={80} />
      </label>
      <label className="field">
        <span className="lbl">Телефон</span>
        <input className="input" type="tel" name="phone" autoComplete="tel" required maxLength={30} />
      </label>
      <label className="field">
        <span className="lbl">Тип объекта</span>
        <select className="input" name="object" defaultValue={OBJECTS[0]}>
          {OBJECTS.map((o) => <option key={o}>{o}</option>)}
        </select>
      </label>
      <label className="field">
        <span className="lbl">Задача</span>
        <textarea
          className="input"
          name="task"
          maxLength={1200}
          placeholder="Например: тандыр и мангал во встроенном помещении, потолок 3,2 м, приёмка в ноябре"
        />
      </label>

      {/* honeypot для ботов — скрыт от людей и скринридеров */}
      <input type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden="true"
             style={{ position: 'absolute', left: '-9999px', width: 1, height: 1 }} />

      <label className="flex items-start gap-3 text-xs leading-snug text-steel-400">
        <input type="checkbox" name="consent" required style={{ accentColor: 'var(--color-extract)', marginTop: 3 }} />
        <span>
          Согласен на обработку персональных данных в соответствии с{' '}
          <a href="/privacy" className="underline" style={{ color: 'var(--color-supply)' }}>политикой конфиденциальности</a> (152-ФЗ)
        </span>
      </label>

      {status === 'error' && (
        <p className="badge badge-crit" role="alert">{error}</p>
      )}

      <button className="btn" type="submit" disabled={status === 'sending'}>
        {status === 'sending' ? 'Отправляем…' : 'Отправить заявку'}
      </button>
    </form>
  );
}
