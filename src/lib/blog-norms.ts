import { CLAUSE_TIP } from '@/lib/clause-tips';
import { norms } from '@/lib/site';

const KNOWN = new Set(Object.keys(CLAUSE_TIP));

function clauseBtn(id: string, label: string): string {
  if (!KNOWN.has(id)) return label;
  // aria-label без «п.» — иначе повторный проход по «п. 5.XX» ломает атрибут
  return (
    `<button type="button" class="badge badge-crit clause-tip-hit"` +
    ` data-clause-id="${id}"` +
    ` aria-label="Пункт ${id} СП 7.13130">` +
    `${label}</button>`
  );
}

/** Текстовые куски между тегами; внутри <a>/<button> не трогаем. */
function mapTextChunks(html: string, map: (text: string) => string): string {
  let skipDepth = 0;
  return html
    .split(/(<[^>]+>)/g)
    .map((chunk) => {
      if (!chunk) return chunk;
      if (chunk.startsWith('<')) {
        if (/^<(a|button)\b/i.test(chunk) && !chunk.startsWith('</')) skipDepth += 1;
        if (/^<\/(a|button)>/i.test(chunk)) skipDepth = Math.max(0, skipDepth - 1);
        return chunk;
      }
      return skipDepth > 0 ? chunk : map(chunk);
    })
    .join('');
}

function linkNormDocs(text: string): string {
  let s = text;
  s = s.replace(
    /\bСП\s*7\.13130\.2013\b/g,
    `<a href="${norms.sourceUrl}" title="${norms.sourceUrl}" target="_blank" rel="noopener noreferrer">СП 7.13130.2013</a>`,
  );
  s = s.replace(
    /Изменени([еяю])\s*№\s*3/gi,
    (_m, end: string) =>
      `<a href="${norms.sourceUrl}" title="${norms.sourceUrl}" target="_blank" rel="noopener noreferrer">Изменени${end} № 3</a>`,
  );
  return s;
}

/** Блок 5.28–5.33 целиком → одна ссылка на якорь в СП (не два бейджа). */
function clauseRangeLink(label: string): string {
  return (
    `<a href="${norms.clausesUrl}" title="${norms.clausesUrl}"` +
    ` target="_blank" rel="noopener noreferrer">${label}</a>`
  );
}

function isFullClauseBlock(a: string, b: string): boolean {
  return a === '5.28' && b === '5.33';
}

function linkClauseMentions(text: string): string {
  let s = text;

  // Сначала одиночные «п. 5.30», но не куски диапазона «п. 5.32–5.33»
  s = s.replace(/п\.\s*(5\.\d{2})(?!\s*[–\-−]\s*5\.\d{2})/gi, (full, id: string) => {
    if (!KNOWN.has(id)) return full;
    return clauseBtn(id, `п. ${id}`);
  });

  // Диапазон: пп. 5.28–5.33 — одна ссылка; прочие (напр. 5.32–5.33) — два бейджа
  s = s.replace(/(пп?\.\s*)?(5\.\d{2})\s*[–\-−]\s*(5\.\d{2})/gi, (full, prefix: string | undefined, a: string, b: string) => {
    if (!KNOWN.has(a) && !KNOWN.has(b)) return full;
    const p = prefix ? prefix.replace(/\s+/g, ' ') : '';
    if (isFullClauseBlock(a, b)) {
      return clauseRangeLink(`${p}${a}–${b}`);
    }
    return `${p}${clauseBtn(a, a)}–${clauseBtn(b, b)}`;
  });

  return s;
}

/**
 * В HTML статьи блога: СП / Изм. № 3 → docs.cntd.ru;
 * пункты 5.11 / 5.28–5.33 → кнопки со всплывающей формулировкой (как на сайте).
 */
export function enhanceBlogNormsHtml(html: string): string {
  let out = mapTextChunks(html, linkNormDocs);

  // <strong>5.28–5.33</strong> — блок целиком на якорь СП
  out = out.replace(/<strong>(5\.\d{2})\s*[–\-−]\s*(5\.\d{2})<\/strong>/g, (_m, a: string, b: string) => {
    if (isFullClauseBlock(a, b)) return clauseRangeLink(`${a}–${b}`);
    return `${clauseBtn(a, a)}–${clauseBtn(b, b)}`;
  });
  // <strong>5.30</strong>
  out = out.replace(/<strong>(5\.\d{2})<\/strong>/g, (_m, id: string) => {
    if (!KNOWN.has(id)) return `<strong>${id}</strong>`;
    return clauseBtn(id, id);
  });

  out = mapTextChunks(out, linkClauseMentions);
  return out;
}
