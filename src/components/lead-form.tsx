'use client';

import { useRef, useState, type DragEvent } from 'react';
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

/** Что принимаем от заказчика: фото, PDF и DXF. Проверяется ещё раз на сервере. */
const ACCEPT = '.jpg,.jpeg,.png,.webp,.heic,.pdf,.dxf,image/*,application/pdf';
const MAX_MB = 10;
/** Сколько файлов можно приложить к одной заявке. */
const MAX_FILES = 3;

const ALLOWED_EXT = new Set(['jpg', 'jpeg', 'png', 'webp', 'heic', 'pdf', 'dxf']);

/** Мелкий файл в мегабайтах выглядит как «0.0 МБ» — показываем килобайты. */
const fileSize = (bytes: number) =>
  bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} КБ`
    : `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} МБ`;

function isAllowedFile(f: File) {
  if (f.type.startsWith('image/') || f.type === 'application/pdf') return true;
  const ext = f.name.split('.').pop()?.toLowerCase() ?? '';
  return ALLOWED_EXT.has(ext);
}

function sameFile(a: File, b: File) {
  return a.name === b.name && a.size === b.size && a.lastModified === b.lastModified;
}

export function LeadForm({
  configuration,
  mode,
}: {
  configuration?: string;
  /** order — заказ по сборке; quote — ручной пересчёт с файлами */
  mode?: 'order' | 'quote';
}) {
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [filesSent, setFilesSent] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);

  const isOrder = mode === 'order';
  const isQuote = mode === 'quote';
  const canAddMore = files.length < MAX_FILES;

  const cfgLabel = isOrder
    ? 'Заказ по конфигурации'
    : isQuote
      ? 'Запрос точной цены'
      : 'Конфигурация прикреплена';

  const taskPlaceholder = isOrder
    ? 'Адрес объекта, желаемый срок, комментарии к пакету документов'
    : isQuote
      ? 'Что пересчитать: вырезы, нестандарт, материалы, особые требования — и что на эскизах'
      : 'Например: тандыр и мангал во встроенном помещении, потолок 3,2 м, приёмка в ноябре';

  const fileHint = isQuote
    ? `До ${MAX_FILES} файлов: эскизы, чертежи, PDF, DXF или фото (каждый до ${MAX_MB} МБ). Уходит менеджеру вместе с заявкой, на сервере не сохраняется.`
    : isOrder
      ? `По желанию — до ${MAX_FILES} файлов: план кухни, фото места (каждый до ${MAX_MB} МБ). Конфигурация уже в заявке; файлы на сервере не сохраняются.`
      : `До ${MAX_FILES} файлов: фото, PDF или DXF (каждый до ${MAX_MB} МБ). Подойдёт эскиз от руки — уходит менеджеру, на сервере не сохраняется.`;

  const submitLabel = isOrder
    ? 'Отправить заказ'
    : isQuote
      ? 'Запросить точную цену'
      : 'Отправить заявку';

  /** Синхронизируем input с списком — FormData подхватит все файлы. */
  function syncInput(next: File[]) {
    if (!fileRef.current) return;
    const dt = new DataTransfer();
    next.forEach((f) => dt.items.add(f));
    fileRef.current.files = dt.files;
  }

  function addFiles(incoming: FileList | File[] | null) {
    if (!incoming || incoming.length === 0) return;
    const list = Array.from(incoming);
    const next = [...files];
    const problems: string[] = [];

    for (const f of list) {
      if (next.length >= MAX_FILES) {
        problems.push(`Можно приложить не больше ${MAX_FILES} файлов.`);
        break;
      }
      if (f.size > MAX_MB * 1024 * 1024) {
        problems.push(`«${f.name}» больше ${MAX_MB} МБ.`);
        continue;
      }
      if (!isAllowedFile(f)) {
        problems.push(`«${f.name}» — нужен фото, PDF или DXF.`);
        continue;
      }
      if (next.some((x) => sameFile(x, f))) continue;
      next.push(f);
    }

    setFiles(next);
    syncInput(next);
    setError(problems[0] ?? '');
    if (fileRef.current) fileRef.current.value = '';
  }

  function removeFile(index: number) {
    const next = files.filter((_, i) => i !== index);
    setFiles(next);
    syncInput(next);
    setError('');
  }

  function clearFiles() {
    setFiles([]);
    syncInput([]);
    if (fileRef.current) fileRef.current.value = '';
  }

  function onDragEnter(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current += 1;
    setDragOver(true);
  }

  function onDragLeave(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragOver(false);
  }

  function onDragOver(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current = 0;
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    if (fd.get('company')) return; // honeypot
    setStatus('sending');
    setError('');
    try {
      // Заголовок Content-Type не ставим: браузер сам добавит границу multipart
      fd.set('page', window.location.pathname);
      if (configuration) {
        const prefix = isOrder
          ? '[Заказ · пакет документов] '
          : isQuote
            ? '[Точная цена · ручной расчёт] '
            : '';
        fd.set('configuration', `${prefix}${configuration}`);
      }
      if (mode) fd.set('leadMode', mode);
      fd.delete('drawing');
      files.forEach((f) => fd.append('drawing', f));
      const res = await fetch('/api/lead', { method: 'POST', body: fd });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Не удалось отправить заявку');
      setStatus('ok');
      track(GOALS.leadSent, {
        withConfiguration: Boolean(configuration),
        withDrawing: files.length > 0,
        fileCount: files.length,
        mode: mode ?? 'plain',
      });
      setFilesSent(files.length);
      form.reset();
      clearFiles();
      setDragOver(false);
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
        {filesSent > 0 && (
          <p className="hint mt-3">
            {filesSent === 1
              ? 'Файл ушёл вместе с заявкой — на сервере он не сохраняется.'
              : `${filesSent} файла ушли вместе с заявкой — на сервере они не сохраняются.`}
          </p>
        )}
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
        <div
          className="border p-3"
          style={{
            borderColor: isQuote ? 'var(--color-extract)' : 'var(--color-supply)',
            background: isQuote ? 'rgba(184,92,56,.1)' : 'rgba(88,180,220,.1)',
          }}
        >
          <span
            className="lbl"
            style={{ color: isQuote ? 'var(--color-extract)' : 'var(--color-supply)' }}
          >
            {cfgLabel}
          </span>
          <p className="num mt-1 text-sm" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {configuration}
          </p>
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
        <span className="lbl">{isQuote ? 'Пояснения и хотелки' : 'Задача'}</span>
        <textarea
          className="input"
          name="task"
          maxLength={1200}
          placeholder={taskPlaceholder}
        />
      </label>

      {/* Зона вложения: до MAX_FILES файлов, кнопка + drag-and-drop */}
      <div
        className={`lead-attach${dragOver ? ' lead-attach--over' : ''}`}
        style={
          isQuote
            ? {
                borderColor: dragOver ? 'var(--color-extract)' : 'rgba(184,92,56,.45)',
                background: dragOver ? 'rgba(184,92,56,.16)' : 'rgba(184,92,56,.08)',
              }
            : {
                borderColor: dragOver ? 'var(--color-supply)' : 'rgba(88,180,220,.4)',
                background: dragOver ? 'rgba(88,180,220,.16)' : 'rgba(88,180,220,.08)',
              }
        }
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        <span
          className="lead-attach__title"
          style={{ color: isQuote ? 'var(--color-extract)' : 'var(--color-supply)' }}
        >
          Приложить чертёж или эскиз, или иной документ
        </span>
        <p className="lead-attach__drop">
          {dragOver
            ? 'Отпустите файлы здесь'
            : canAddMore
              ? `Перетащите фото или PDF сюда — или выберите кнопкой (до ${MAX_FILES})`
              : `Уже ${MAX_FILES} файла — уберите лишний, чтобы добавить другой`}
        </p>
        {/* Нативную кнопку прячем: её надпись зависит от языка системы */}
        <input
          ref={fileRef}
          id="lead-drawing"
          type="file"
          name="drawing"
          accept={ACCEPT}
          multiple
          className="sr-only"
          disabled={!canAddMore}
          onChange={(e) => {
            addFiles(e.target.files);
          }}
        />
        <div className="lead-attach__row">
          {canAddMore && (
            <label htmlFor="lead-drawing" className="btn cursor-pointer lead-attach__btn">
              {files.length === 0 ? 'Выбрать файл' : 'Добавить ещё файл'}
            </label>
          )}
          {files.length > 0 && (
            <span className="lbl" style={{ color: 'var(--color-steel-400)' }}>
              {files.length} из {MAX_FILES}
            </span>
          )}
        </div>

        {files.length > 0 && (
          <ul className="lead-attach__list">
            {files.map((f, i) => (
              <li key={`${f.name}-${f.size}-${f.lastModified}-${i}`} className="lead-attach__item">
                <span className="num text-sm" style={{ color: 'var(--color-supply)' }}>
                  {f.name} · {fileSize(f.size)}
                </span>
                <button
                  type="button"
                  className="cfg-ghost-btn"
                  style={{ width: 'auto' }}
                  onClick={() => removeFile(i)}
                >
                  Убрать
                </button>
              </li>
            ))}
          </ul>
        )}

        <span className="hint lead-attach__hint">{fileHint}</span>
      </div>

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
        {status === 'sending' ? 'Отправляем…' : submitLabel}
      </button>
    </form>
  );
}
