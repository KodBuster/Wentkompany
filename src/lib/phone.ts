/**
 * Телефон: отображение +ww (sss) xxx-xx-xx,
 * опознание страны и полноты — libphonenumber-js.
 */

import {
  AsYouType,
  getExampleNumber,
  isPossiblePhoneNumber,
  isValidPhoneNumber,
  parsePhoneNumberFromString,
  validatePhoneNumberLength,
  type CountryCode,
} from 'libphonenumber-js';
import examples from 'libphonenumber-js/mobile/examples';
import { Metadata } from 'libphonenumber-js/core';
import metadata from 'libphonenumber-js/min/metadata';

const E164_MAX = 15;

/** Коды на 8… (Япония, Китай, …) — не путать с российской «восьмёркой». */
const CODES_STARTING_8 = [
  '886', '880', '856', '855', '853', '852', '850', '86', '84', '82', '81',
] as const;

export type PhoneMode = 'empty' | 'plus' | 'partial' | 'structured';

/** empty | набирается | полный валидный | полный но неверный */
export type PhoneStatus = 'empty' | 'partial' | 'valid' | 'invalid';

export type PhoneRecognition = {
  digits: string;
  formatted: string;
  e164: string | null;
  countryCode: string | null;
  national: string;
  valid: boolean;
  possible: boolean;
  country: CountryCode | null;
  status: PhoneStatus;
  /** Можно ли ещё добавить цифры в рамках лимита страны. */
  canGrow: boolean;
};

export function rawDigits(raw: string): string {
  return raw.replace(/\D/g, '');
}

/** Без «+»: российский набор (8…→7…, иначе ведущая 7). */
function asRuDigits(raw: string): string {
  let d = rawDigits(raw);
  if (!d) return '';
  if (d.startsWith('8')) d = `7${d.slice(1)}`;
  if (!d.startsWith('7')) d = `7${d}`;
  return d.slice(0, E164_MAX);
}

/**
 * «+8 (495)…» / «+8 926…» — российская восьмёрка, не код страны.
 * «+84…» без разделителя после 8 — Вьетнам (и др. 81/82/…).
 */
function looksLikeRuTrunkPlus8(raw: string): boolean {
  return /^\+8[\s(/\-]/.test(raw.trim());
}

/**
 * После «+»: реальные 81/86/880… оставляем;
 * префиксы «8»/«85»/«88» — тоже (чтобы добрать код);
 * иначе 8 — российский междугородний → 7.
 */
function normalizePlusDigits(digits: string): string {
  const d = digits.slice(0, E164_MAX);
  if (!d.startsWith('8')) return d;
  if (CODES_STARTING_8.some((c) => d.startsWith(c))) return d;
  if (CODES_STARTING_8.some((c) => c.startsWith(d))) return d;
  return `7${d.slice(1)}`.slice(0, E164_MAX);
}

/** Верхняя граница длины национального номера для страны (с запасом +2 к примеру). */
function softMaxNational(country: CountryCode, codeLen: number): number {
  const meta = new Metadata(metadata);
  meta.selectNumberingPlan(country);
  const lengths = meta.numberingPlan?.possibleLengths() ?? [10];
  const example = getExampleNumber(country, examples);
  const tip = example?.nationalNumber.length ?? Math.min(...lengths);
  const allowed = lengths.filter((l) => l <= tip + 2);
  const maxL = allowed.length > 0 ? Math.max(...allowed) : tip;
  return Math.min(maxL, E164_MAX - codeLen);
}

function softMinNational(country: CountryCode): number {
  const meta = new Metadata(metadata);
  meta.selectNumberingPlan(country);
  const lengths = meta.numberingPlan?.possibleLengths() ?? [8];
  const example = getExampleNumber(country, examples);
  const tip = example?.nationalNumber.length ?? Math.min(...lengths);
  const allowed = lengths.filter((l) => l <= tip + 2);
  return allowed.length > 0 ? Math.min(...allowed) : Math.min(...lengths);
}

/**
 * Обрезка:
 * 1) если есть более короткий уже валидный префикс — берём его (лишний хвост);
 * 2) иначе режем по soft-max длины страны (чтобы +81 не разрастался до мусора).
 */
function clampDigits(digits: string): string {
  let s = digits.slice(0, E164_MAX);
  if (isValidPhoneNumber(`+${s}`)) return s;

  for (let len = s.length - 1; len >= 8; len -= 1) {
    const prefix = s.slice(0, len);
    if (isValidPhoneNumber(`+${prefix}`)) return prefix;
  }

  const typer = new AsYouType();
  typer.input(`+${s}`);
  const code = typer.getCallingCode();
  const country = typer.getCountry();
  const national = typer.getNationalNumber() ?? '';
  if (code && country) {
    const maxNat = softMaxNational(country, code.length);
    if (national.length > maxNat) {
      return `${code}${national.slice(0, maxNat)}`;
    }
  }

  return s;
}

/** Нормализация ввода → цифры с кодом страны. */
export function normalizeToDigits(input: string): string {
  const t = input.trim();
  if (!t) return '';
  let digits: string;
  if (t.startsWith('+')) {
    // +8 (495) 789-45-45 → +7…, даже если цифры совпадают с +84…
    if (looksLikeRuTrunkPlus8(t)) {
      digits = `7${rawDigits(t).slice(1)}`.slice(0, E164_MAX);
    } else {
      digits = normalizePlusDigits(rawDigits(t));
    }
  } else {
    digits = asRuDigits(t);
  }
  return clampDigits(digits);
}

/**
 * Локальная часть после (sss).
 * 7 цифр → xxx-xx-xx (РФ); 6 → xxx-xxx (VN и др.); без «висячей» одной цифры.
 */
function formatLocal(local: string): string {
  if (!local) return '';
  const n = local.length;
  if (n <= 3) return local;
  if (n <= 6) return `${local.slice(0, 3)}-${local.slice(3)}`;
  // 7+ : xxx-xx-xx[+хвост]
  const head = `${local.slice(0, 3)}-${local.slice(3, 5)}-${local.slice(5, 7)}`;
  return n > 7 ? `${head}-${local.slice(7)}` : head;
}

/** Национальная часть → (sss) xxx-xx-xx. */
export function formatNational(national: string): string {
  if (!national) return '';
  if (national.length < 3) return ` (${national}`;
  const area = national.slice(0, 3);
  const local = national.slice(3);
  if (!local) return ` (${area})`;
  return ` (${area}) ${formatLocal(local)}`;
}

/** Разбор через AsYouType: код страны + национальный номер. */
export function splitByLib(digits: string): {
  code: string | null;
  national: string;
  country: CountryCode | null;
  partial: string | null;
} {
  if (!digits) return { code: null, national: '', country: null, partial: null };
  const typer = new AsYouType();
  typer.input(`+${digits}`);
  const code = typer.getCallingCode() ?? null;
  const national = typer.getNationalNumber() ?? '';
  const country = typer.getCountry() ?? null;
  if (!code) return { code: null, national: '', country: null, partial: digits };
  return { code, national, country, partial: null };
}

export function formatFromDigits(digits: string): string {
  const d = clampDigits(digits.slice(0, E164_MAX));
  if (!d) return '';
  const { code, national, partial } = splitByLib(d);
  if (!code) return partial ? `+${partial}` : '';
  return `+${code}${formatNational(national)}`;
}

export function phoneMode(raw: string): PhoneMode {
  const t = raw.trim();
  if (!t) return 'empty';
  if (t === '+') return 'plus';
  const digits = normalizeToDigits(t);
  if (!digits) return t.startsWith('+') ? 'plus' : 'empty';
  const { code } = splitByLib(digits);
  return code ? 'structured' : 'partial';
}

function resolveStatus(
  digits: string,
  country: CountryCode | null,
  code: string | null,
  national: string,
  valid: boolean,
): { status: PhoneStatus; canGrow: boolean } {
  if (!digits) return { status: 'empty', canGrow: true };
  if (valid) return { status: 'valid', canGrow: false };

  const lenCheck = validatePhoneNumberLength(`+${digits}`);
  if (lenCheck === 'TOO_LONG' || lenCheck === 'INVALID_LENGTH') {
    return { status: 'invalid', canGrow: false };
  }

  if (code && country) {
    const maxNat = softMaxNational(country, code.length);
    const minNat = softMinNational(country);
    if (national.length >= maxNat) {
      return { status: 'invalid', canGrow: false };
    }
    if (national.length < minNat || lenCheck === 'TOO_SHORT') {
      return { status: 'partial', canGrow: true };
    }
    // длина «как у полного», но номер не сходится с правилами страны
    if (national.length >= minNat && !isPossiblePhoneNumber(`+${digits}`)) {
      return { status: 'invalid', canGrow: national.length < maxNat };
    }
  }

  if (digits.length >= E164_MAX) {
    return { status: 'invalid', canGrow: false };
  }

  return { status: 'partial', canGrow: true };
}

/** Полное опознание номера. */
export function recognizePhone(raw: string): PhoneRecognition {
  const t = raw.trim();
  if (!t || t === '+') {
    return {
      digits: '',
      formatted: t === '+' ? '+' : '',
      e164: null,
      countryCode: null,
      national: '',
      valid: false,
      possible: false,
      country: null,
      status: t === '+' ? 'partial' : 'empty',
      canGrow: true,
    };
  }

  const digits = normalizeToDigits(t);
  const formatted = formatFromDigits(digits);
  const e164 = digits ? `+${digits}` : null;
  const { code, national, country } = splitByLib(digits);
  const parsed = e164 ? parsePhoneNumberFromString(e164) : undefined;
  const valid = Boolean(e164 && isValidPhoneNumber(e164));
  const possible = Boolean(e164 && isPossiblePhoneNumber(e164));
  const resolvedCountry = parsed?.country ?? country;
  const { status, canGrow } = resolveStatus(
    digits,
    resolvedCountry,
    code,
    national,
    valid,
  );

  return {
    digits,
    formatted,
    e164: parsed?.number ?? (valid ? e164 : null),
    countryCode: code,
    national,
    valid,
    possible,
    country: resolvedCountry,
    status,
    canGrow,
  };
}

/** Главный форматтер: +ww (sss) xxx-xx-xx */
export function formatPhone(raw: string): string {
  const t = raw.trim();
  if (!t) return '';
  if (t === '+') return '+';
  return recognizePhone(t).formatted;
}

export function formatRuPhone(raw: string): string {
  return formatPhone(raw);
}

export function formatPhoneAtCaret(
  raw: string,
  caret: number,
): { value: string; caret: number } {
  const t = raw.trimStart();
  if (!t) return { value: '', caret: 0 };
  if (t === '+' || (t.startsWith('+') && !rawDigits(t))) {
    return { value: '+', caret: 1 };
  }

  const hadPlus = t.startsWith('+');
  const rawAll = rawDigits(raw);
  const rawBefore = rawDigits(raw.slice(0, Math.max(0, caret)));
  let digitsBefore = rawBefore.length;

  if (!hadPlus && rawAll.length > 0 && !rawAll.startsWith('7') && !rawAll.startsWith('8')) {
    digitsBefore += 1;
  }

  const value = formatPhone(raw);
  if (!value) return { value: '', caret: 0 };
  if (value === '+') return { value, caret: 1 };

  // после clamp курсор не уезжает за конец
  const maxDigits = activeDigits(value).length;
  if (digitsBefore > maxDigits) digitsBefore = maxDigits;

  return {
    value,
    caret: caretFromDigitCount(value, digitsBefore, true),
  };
}

export const formatRuPhoneAtCaret = formatPhoneAtCaret;

export function activeDigits(raw: string): string {
  return normalizeToDigits(raw);
}

export function phoneDigits(raw: string): string {
  return normalizeToDigits(raw);
}

export function intlDigits(raw: string): string {
  return rawDigits(raw).slice(0, E164_MAX);
}

export function digitCountBefore(value: string, caret: number): number {
  return value.slice(0, Math.max(0, caret)).replace(/\D/g, '').length;
}

export function caretFromDigitCount(
  formatted: string,
  digitsBefore: number,
  preferAfterPlus = true,
): number {
  if (digitsBefore <= 0) {
    if (preferAfterPlus && formatted.startsWith('+')) return 1;
    return 0;
  }
  let seen = 0;
  for (let i = 0; i < formatted.length; i++) {
    if (/\d/.test(formatted[i]!)) {
      seen += 1;
      if (seen >= digitsBefore) return i + 1;
    }
  }
  return formatted.length;
}

export function removePhoneDigits(raw: string, from: number, to: number): string {
  const d = activeDigits(raw);
  const a = Math.max(0, Math.min(from, d.length));
  const b = Math.max(a, Math.min(to, d.length));
  const next = d.slice(0, a) + d.slice(b);
  if (!next) return '';
  return `+${next}`;
}

/** Полный валидный номер (по правилам страны из libphonenumber). */
export function isValidPhone(raw: string): boolean {
  return recognizePhone(raw).valid;
}

/** РФ: +7 и 10 национальных цифр + isValid. */
export function isCompleteRuPhone(raw: string): boolean {
  const r = recognizePhone(raw);
  return r.valid && r.countryCode === '7' && r.national.length === 10;
}
