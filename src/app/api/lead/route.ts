import { NextResponse } from 'next/server';
import { checkUpload } from '@/lib/upload';

/**
 * Приём заявки: Telegram-бот + вебхук CRM.
 *
 * Переменные окружения (см. .env.example):
 *   TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, CRM_WEBHOOK_URL
 * Без них роут не падает: пишет в лог и отвечает успехом, чтобы форма
 * работала на стенде до настройки интеграций.
 *
 * Форма приходит как multipart/form-data: к заявке можно приложить до
 * трёх чертежей/эскизов (поле drawing, несколько значений). Файлы нигде
 * не сохраняются — уходят в Telegram и забываются.
 *
 * JSON тоже принимается — форма без файла отправляет его по-прежнему.
 */

export const runtime = 'nodejs';

interface Lead {
  name?: string;
  phone?: string;
  object?: string;
  task?: string;
  configuration?: string;
  page?: string;
  company?: string; // honeypot
  consent?: string;
}

const RATE = new Map<string, { count: number; reset: number }>();
const LIMIT = 5;
const WINDOW_MS = 10 * 60 * 1000;
const MAX_FILES = 3;

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = RATE.get(ip);
  if (!entry || now > entry.reset) {
    RATE.set(ip, { count: 1, reset: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > LIMIT;
}

const clean = (v: unknown, max = 300) =>
  typeof v === 'string' ? v.replace(/[\u0000-\u001F\u007F]/g, ' ').trim().slice(0, max) : '';

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
  if (rateLimited(ip)) {
    return NextResponse.json({ error: 'Слишком много заявок подряд. Попробуйте позже.' }, { status: 429 });
  }

  const type = request.headers.get('content-type') || '';
  let body: Lead;
  let rawFiles: File[] = [];

  try {
    if (type.includes('multipart/form-data')) {
      const form = await request.formData();
      body = Object.fromEntries(
        [...form.entries()].filter(([, v]) => typeof v === 'string'),
      ) as Lead;
      rawFiles = form
        .getAll('drawing')
        .filter((v): v is File => v instanceof File && v.size > 0)
        .slice(0, MAX_FILES);
    } else {
      body = (await request.json()) as Lead;
    }
  } catch {
    return NextResponse.json({ error: 'Некорректный запрос' }, { status: 400 });
  }

  if (body.company) return NextResponse.json({ ok: true }); // бот
  if (!body.consent) {
    return NextResponse.json({ error: 'Нужно согласие на обработку персональных данных' }, { status: 400 });
  }

  const lead = {
    name: clean(body.name, 80),
    phone: clean(body.phone, 30),
    object: clean(body.object, 120),
    task: clean(body.task, 1200),
    configuration: clean(body.configuration, 1200),
    page: clean(body.page, 200),
    at: new Date().toISOString(),
  };

  if (!lead.name || !lead.phone) {
    return NextResponse.json({ error: 'Заполните имя и телефон' }, { status: 400 });
  }

  // Файлы проверяем по первым байтам: заявленный тип подделывается тривиально
  const uploads: NonNullable<Awaited<ReturnType<typeof checkUpload>> & { ok: true }>[] = [];
  for (const file of rawFiles) {
    const checked = await checkUpload(file);
    if (!checked.ok) {
      return NextResponse.json({ error: checked.error }, { status: 400 });
    }
    uploads.push(checked as typeof checked & { ok: true });
  }

  const fileNames = uploads.map((u) => u.filename).filter(Boolean) as string[];
  const text =
    `🔧 Заявка с сайта\n` +
    `Имя: ${lead.name}\n` +
    `Телефон: ${lead.phone}\n` +
    `Объект: ${lead.object || '—'}\n` +
    `Задача: ${lead.task || '—'}\n` +
    (lead.configuration ? `Конфигурация: ${lead.configuration}\n` : '') +
    (fileNames.length
      ? `Файлы (${fileNames.length}): ${fileNames.join(', ')}\n`
      : '') +
    `Страница: ${lead.page || '/'}`;

  const tasks: Promise<unknown>[] = [];
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;

  if (token && chat) {
    // Сначала текст заявки, затем каждый файл отдельным сообщением
    tasks.push(
      fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chat, text, disable_web_page_preview: true }),
      }),
    );
    for (const upload of uploads) {
      if (!upload.bytes || !upload.meta || !upload.filename) continue;
      const form = new FormData();
      form.set('chat_id', chat);
      form.set(
        'document',
        new Blob([new Uint8Array(upload.bytes)], { type: upload.meta.mime }),
        upload.filename,
      );
      tasks.push(fetch(`https://api.telegram.org/bot${token}/sendDocument`, { method: 'POST', body: form }));
    }
  }

  if (process.env.CRM_WEBHOOK_URL) {
    // В CRM уходит только текст заявки: файлы живут в Telegram у менеджера
    tasks.push(
      fetch(process.env.CRM_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...lead,
          drawing: fileNames[0] ?? null,
          drawings: fileNames,
        }),
      }),
    );
  }

  if (tasks.length === 0) {
    console.info('[lead] интеграции не настроены, заявка только в логе:', {
      ...lead,
      drawings: uploads.map((u) => `${u.filename} (${u.bytes!.length} Б)`),
    });
    return NextResponse.json({ ok: true, delivered: 'log' });
  }

  const results = await Promise.allSettled(tasks);
  const failed = results.filter((r) => r.status === 'rejected');
  if (failed.length === results.length) {
    console.error('[lead] доставка не удалась', failed, lead);
    return NextResponse.json({ error: 'Не удалось передать заявку. Позвоните, пожалуйста.' }, { status: 502 });
  }

  return NextResponse.json({ ok: true, delivered: results.length - failed.length });
}
