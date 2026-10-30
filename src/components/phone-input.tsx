'use client';

import {
  useCallback,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type KeyboardEvent,
} from 'react';
import {
  activeDigits,
  caretFromDigitCount,
  digitCountBefore,
  formatPhone,
  formatPhoneAtCaret,
  isValidPhone,
  recognizePhone,
  removePhoneDigits,
} from '@/lib/phone';

function applyFormatted(el: HTMLInputElement, next: string, caret: number) {
  el.value = next;
  const pos = Math.max(0, Math.min(caret, next.length));
  el.setSelectionRange(pos, pos);
}

/** Телефон: +ww (sss) xxx-xx-xx, полнота — по libphonenumber. */
export function PhoneInput({
  name = 'phone',
  required = true,
  className = 'input',
}: {
  name?: string;
  required?: boolean;
  className?: string;
}) {
  const [hint, setHint] = useState('');
  const [hintTone, setHintTone] = useState<'ok' | 'warn' | 'muted'>('muted');

  const syncHint = useCallback((value: string) => {
    if (!value.trim()) {
      setHint('');
      setHintTone('muted');
      return;
    }
    const r = recognizePhone(value);
    if (r.status === 'valid') {
      setHint('Номер распознан');
      setHintTone('ok');
      return;
    }
    if (r.status === 'invalid') {
      setHint(
        r.countryCode
          ? `Номер некорректный для +${r.countryCode} — такого номера нет`
          : 'Номер некорректный',
      );
      setHintTone('warn');
      return;
    }
    if (r.countryCode && r.national.length > 0) {
      setHint(`Код +${r.countryCode} — введите номер полностью`);
      setHintTone('muted');
      return;
    }
    if (value.startsWith('+')) {
      setHint('Введите код страны и номер');
      setHintTone('muted');
      return;
    }
    setHint('');
    setHintTone('muted');
  }, []);

  const onChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const el = e.target;
      const { value, caret } = formatPhoneAtCaret(
        el.value,
        el.selectionStart ?? el.value.length,
      );
      applyFormatted(el, value, caret);
      syncHint(value);
    },
    [syncHint],
  );

  const onPaste = useCallback(
    (e: ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const el = e.currentTarget;
      const next = formatPhone(e.clipboardData.getData('text'));
      applyFormatted(el, next, next.length);
      syncHint(next);
    },
    [syncHint],
  );

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      const el = e.currentTarget;
      const start = el.selectionStart ?? 0;
      const end = el.selectionEnd ?? 0;
      const value = el.value;

      if (e.key === '+' && !value) {
        e.preventDefault();
        applyFormatted(el, '+', 1);
        syncHint('+');
        return;
      }

      if (e.key !== 'Backspace' && e.key !== 'Delete') return;
      if (!value) return;

      const digits = activeDigits(value);

      const afterEdit = (seed: string, caretDigits: number) => {
        const formatted = formatPhone(seed);
        applyFormatted(
          el,
          formatted,
          caretFromDigitCount(formatted, caretDigits, true),
        );
        syncHint(formatted);
      };

      if (start !== end) {
        e.preventDefault();
        const from = digitCountBefore(value, start);
        const to = digitCountBefore(value, end);
        const seed = removePhoneDigits(value, from, to);
        afterEdit(seed, Math.min(from, activeDigits(seed).length));
        return;
      }

      if (e.key === 'Backspace') {
        e.preventDefault();
        if (start <= 0) return;
        if (value === '+' || digits.length <= 1) {
          applyFormatted(el, '', 0);
          syncHint('');
          return;
        }
        const digBefore = digitCountBefore(value, start);
        if (digBefore <= 0) {
          applyFormatted(el, '', 0);
          syncHint('');
          return;
        }
        const seed = removePhoneDigits(value, digBefore - 1, digBefore);
        afterEdit(seed, Math.max(0, digBefore - 1));
        return;
      }

      e.preventDefault();
      if (start >= value.length) return;
      if (value === '+' || digits.length <= 1) {
        applyFormatted(el, '', 0);
        syncHint('');
        return;
      }
      const digIdx = digitCountBefore(value, start);
      if (digIdx >= digits.length) return;
      const seed = removePhoneDigits(value, digIdx, digIdx + 1);
      afterEdit(seed, digIdx);
    },
    [syncHint],
  );

  return (
    <div className="flex flex-col gap-1">
      <input
        className={className}
        type="tel"
        name={name}
        inputMode="tel"
        autoComplete="tel"
        required={required}
        maxLength={24}
        placeholder="+7 (___) ___-__-__"
        title="Формат: +код (город) xxx-xx-xx"
        onChange={onChange}
        onPaste={onPaste}
        onKeyDown={onKeyDown}
        onBlur={(e) => syncHint(e.currentTarget.value)}
        onInvalid={(e) => {
          const el = e.currentTarget;
          if (!el.value.trim()) {
            el.setCustomValidity('Укажите телефон');
          } else if (!isValidPhone(el.value)) {
            el.setCustomValidity(
              'Введите полный номер — так, чтобы он распознавался для этой страны',
            );
          } else {
            el.setCustomValidity('');
          }
        }}
        onInput={(e) => e.currentTarget.setCustomValidity('')}
      />
      {hint && (
        <span
          className="hint"
          style={{
            color:
              hintTone === 'ok'
                ? 'var(--color-ok)'
                : hintTone === 'warn'
                  ? 'var(--color-extract)'
                  : undefined,
          }}
        >
          {hint}
        </span>
      )}
    </div>
  );
}

export const NOTES_PLACEHOLDER =
  'Свободный текст: вопросы, пожелания, уточнения к заказу - по желанию';
