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
 * Форма приходит как multipart/form-data: к заявке можно приложить чертёж
 * или эскиз. Файл нигде не сохраняется — он уходит в Telegram вместе с
 * заявкой и забывается. Так на сервере не копятся чужие чертежи, нечего
 * взламывать и нечего хранить по 152-ФЗ.
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
  let file: File | null = null;

  try {
    if (type.includes('multipart/form-data')) {
      const form = await request.formData();
      body = Object.fromEntries(
        [...form.entries()].filter(([, v]) => typeof v === 'string'),
      ) as Lead;
      const f = form.get('drawing');
      if (f instanceof File && f.size > 0) file = f;
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
    configuration: clean(body.configuration, 400),
    page: clean(body.page, 200),
    at: new Date().toISOString(),
  };

  if (!lead.name || !lead.phone) {
    return NextResponse.json({ error: 'Заполните имя и телефон' }, { status: 400 });
  }

  // Файл проверяем по первым байтам: заявленный тип подделывается тривиально
  let upload: Awaited<ReturnType<typeof checkUpload>> | null = null;
  if (file) {
    upload = await checkUpload(file);
    if (!upload.ok) {
      return NextResponse.json({ error: upload.error }, { status: 400 });
    }
  }

  const text =
    `🔧 Заявка с сайта\n` +
    `Имя: ${lead.name}\n` +
    `Телефон: ${lead.phone}\n` +
    `Объект: ${lead.object || '—'}\n` +
    `Задача: ${lead.task || '—'}\n` +
    (lead.configuration ? `Конфигурация: ${lead.configuration}\n` : '') +
    (upload ? `Файл: ${upload.filename}\n` : '') +
    `Страница: ${lead.page || '/'}`;

  const tasks: Promise<unknown>[] = [];
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;

  if (token && chat) {
    if (upload?.bytes && upload.meta) {
      // Файл и заявка одним сообщением: подпись Telegram ограничена 1024
      // символами, поэтому длинный текст уходит отдельным сообщением следом.
      const form = new FormData();
      form.set('chat_id', chat);
      form.set('caption', text.slice(0, 1024));
      form.set(
        'document',
        new Blob([new Uint8Array(upload.bytes)], { type: upload.meta.mime }),
        upload.filename,
      );
      tasks.push(fetch(`https://api.telegram.org/bot${token}/sendDocument`, { method: 'POST', body: form }));
      if (text.length > 1024) {
        tasks.push(
          fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chat, text, disable_web_page_preview: true }),
          }),
        );
      }
    } else {
      tasks.push(
        fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chat, text, disable_web_page_preview: true }),
        }),
      );
    }
  }

  if (process.env.CRM_WEBHOOK_URL) {
    // В CRM уходит только текст заявки: файл живёт в Telegram у менеджера
    tasks.push(
      fetch(process.env.CRM_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...lead, drawing: upload?.filename ?? null }),
      }),
    );
  }

  if (tasks.length === 0) {
    console.info('[lead] интеграции не настроены, заявка только в логе:', {
      ...lead,
      drawing: upload ? `${upload.filename} (${upload.bytes!.length} Б)` : null,
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

