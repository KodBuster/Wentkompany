'use client';

import { useState } from 'react';
import type { Dims } from '@/lib/calc';
import { GOALS, track } from '@/lib/analytics';

type Status = 'idle' | 'sending' | 'ok' | 'error';

/**
 * Короткий заказ эталонного типоразмера: имя, телефон, примечание.
 * Чертёж PDF собирается сам и уходит в заявку — клиент файл не выбирает.
 */
export function StandardOrderForm({
  slug,
  dims,
  configuration,
  material,
}: {
  slug: string;
  dims: Dims;
  configuration: string;
  /** Если не передан — сервер возьмёт дефолт линейки. */
  material?: '430' | '304';
}) {
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    if (fd.get('company')) return;
    setStatus('sending');
    setError('');

    try {
      const exportRes = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'pdf',
          slug,
          dims,
          ...(material ? { material } : {}),
        }),
      });
      if (!exportRes.ok) {
        const info = await exportRes.json().catch(() => ({}));
        throw new Error(info.error || 'Не удалось собрать чертёж');
      }
      const pdfBlob = await exportRes.blob();
      const pdfFile = new File([pdfBlob], `${slug}-chertezh.pdf`, { type: 'application/pdf' });

      fd.set('page', window.location.pathname);
      fd.set('configuration', `[Заказ · эталон] ${configuration}`);
      fd.set('leadMode', 'order');
      fd.set('drawing', pdfFile);
      fd.delete('object');

      const res = await fetch('/api/lead', { method: 'POST', body: fd });
      if (!res.ok) {
        throw new Error((await res.json().catch(() => ({}))).error || 'Не удалось отправить заказ');
      }
      setStatus('ok');
      track(GOALS.leadSent, { withConfiguration: true, withDrawing: true, mode: 'order-standard', slug });
      form.reset();
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Не удалось отправить заказ');
    }
  }

  if (status === 'ok') {
    return (
      <div className="border p-6" style={{ borderColor: 'var(--color-ok)', background: 'rgba(79,169,122,.1)' }}>
        <h3 style={{ color: 'var(--color-ok)' }}>Заказ отправлен</h3>
        <p className="muted mt-2 text-sm">
          Чертёж ушёл вместе с заявкой. Свяжемся в течение рабочего дня.
        </p>
        <button type="button" className="btn btn-ghost mt-4" onClick={() => setStatus('idle')}>
          Отправить ещё один
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
      <div
        className="border p-3"
        style={{ borderColor: 'var(--color-supply)', background: 'rgba(88,180,220,.1)' }}
      >
        <span className="lbl" style={{ color: 'var(--color-supply)' }}>
          Заказ эталонного типоразмера
        </span>
        <p className="num mt-1 text-sm" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {configuration}
        </p>
        <p className="hint mt-2">Чертёж PDF приложится автоматически при отправке.</p>
      </div>

      <label className="field">
        <span className="lbl">Имя</span>
        <input className="input" type="text" name="name" autoComplete="name" required maxLength={80} />
      </label>
      <label className="field">
        <span className="lbl">Телефон</span>
        <input className="input" type="tel" name="phone" autoComplete="tel" required maxLength={30} />
      </label>
      <label className="field">
        <span className="lbl">Примечание</span>
        <textarea
          className="input"
          name="task"
          maxLength={1200}
          placeholder="Адрес объекта, срок, вопрос — по желанию"
        />
      </label>

      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{ position: 'absolute', left: '-9999px', width: 1, height: 1 }}
      />

      <label className="flex items-start gap-3 text-xs leading-snug text-steel-400">
        <input
          type="checkbox"
          name="consent"
          required
          style={{ accentColor: 'var(--color-extract)', marginTop: 3 }}
        />
        <span>
          Согласен на обработку персональных данных в соответствии с{' '}
          <a href="/privacy" className="underline" style={{ color: 'var(--color-supply)' }}>
            политикой конфиденциальности
          </a>{' '}
          (152-ФЗ)
        </span>
      </label>

      {status === 'error' && (
        <p className="badge badge-crit" role="alert">
          {error}
        </p>
      )}

      <button className="btn" type="submit" disabled={status === 'sending'}>
        {status === 'sending' ? 'Собираем чертёж и отправляем…' : 'Отправить заказ'}
      </button>
    </form>
  );
}
