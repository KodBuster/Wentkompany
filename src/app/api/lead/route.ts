import { NextResponse } from 'next/server';

/**
 * Приём заявки: Telegram-бот + вебхук CRM.
 * Переменные окружения (см. .env.example):
 *   TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, CRM_WEBHOOK_URL
 * Без них роут не падает: пишет в лог и отвечает успехом,
 * чтобы форма работала на стенде до настройки интеграций.
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

  let body: Lead;
  try {
    body = (await request.json()) as Lead;
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

  const text =
    `🔧 Заявка с сайта\n` +
    `Имя: ${lead.name}\n` +
    `Телефон: ${lead.phone}\n` +
    `Объект: ${lead.object || '—'}\n` +
    `Задача: ${lead.task || '—'}\n` +
    (lead.configuration ? `Конфигурация: ${lead.configuration}\n` : '') +
    `Страница: ${lead.page || '/'}`;

  const tasks: Promise<unknown>[] = [];
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;

  if (token && chat) {
    tasks.push(
      fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chat, text, disable_web_page_preview: true }),
      }),
    );
  }
  if (process.env.CRM_WEBHOOK_URL) {
    tasks.push(
      fetch(process.env.CRM_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lead),
      }),
    );
  }

  if (tasks.length === 0) {
    console.info('[lead] интеграции не настроены, заявка только в логе:', lead);
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
