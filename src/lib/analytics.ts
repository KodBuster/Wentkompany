/**
 * Цели Яндекс.Метрики.
 *
 * Счётчик подключается только если задан NEXT_PUBLIC_YM_ID, поэтому на
 * стенде и в разработке ничего не грузится и не пишется. Функция track
 * безопасна к вызову до загрузки счётчика — Метрика сама копит очередь.
 */

export const GOALS = {
  leadSent: 'lead_sent',
  exportFile: 'export_file',
  configuratorOpen: 'configurator_open',
  complianceGap: 'compliance_gap',
  callClick: 'call_click',
} as const;

export type Goal = (typeof GOALS)[keyof typeof GOALS];

declare global {
  interface Window {
    ym?: (id: number, action: string, ...args: unknown[]) => void;
  }
}

export const METRIKA_ID = process.env.NEXT_PUBLIC_YM_ID ? Number(process.env.NEXT_PUBLIC_YM_ID) : null;

export function track(goal: Goal, params?: Record<string, unknown>) {
  if (typeof window === 'undefined' || !METRIKA_ID) return;
  window.ym?.(METRIKA_ID, 'reachGoal', goal, params);
}
