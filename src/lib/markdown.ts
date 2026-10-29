/** Экранирование HTML-сущностей. */
function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Инлайн-разметка: ссылки, жирный, курсив, код. */
function inline(raw: string): string {
  let s = esc(raw);
  s = s.replace(
    /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
  );
  s = s.replace(
    /\[([^\]]+)\]\((\/[^)\s]*)\)/g,
    '<a href="$2">$1</a>',
  );
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  /* Курсив после жирного, чтобы не цеплять одиночные * из ** */
  s = s.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
  return s;
}

/** Строка таблицы Markdown → ячейки. */
function tableCells(line: string): string[] {
  return line
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim());
}

function isSepRow(line: string): boolean {
  return /^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?$/.test(line.trim());
}

/**
 * Упрощённый Markdown → HTML под статьи блога
 * (заголовки, списки, таблицы, абзацы, hr, инлайн).
 */
export function markdownToHtml(md: string, opts?: { skipFirstH1?: boolean }): string {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  let i = 0;
  let skippedH1 = false;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    if (trimmed === '---' || trimmed === '***') {
      out.push('<hr />');
      i += 1;
      continue;
    }

    const h = /^(#{1,3})\s+(.+)$/.exec(trimmed);
    if (h) {
      const level = h[1].length;
      if (level === 1 && opts?.skipFirstH1 && !skippedH1) {
        skippedH1 = true;
        i += 1;
        continue;
      }
      out.push(`<h${level}>${inline(h[2])}</h${level}>`);
      i += 1;
      continue;
    }

    if (trimmed.startsWith('|') && i + 1 < lines.length && isSepRow(lines[i + 1])) {
      const header = tableCells(trimmed);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        if (!isSepRow(lines[i])) rows.push(tableCells(lines[i].trim()));
        i += 1;
      }
      const thead = `<thead><tr>${header.map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead>`;
      const tbody = `<tbody>${rows
        .map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`)
        .join('')}</tbody>`;
      out.push(`<div class="blog-table-wrap"><table>${thead}${tbody}</table></div>`);
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ''));
        i += 1;
      }
      out.push(`<ol>${items.map((it) => `<li>${inline(it)}</li>`).join('')}</ol>`);
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*]\s+/, ''));
        i += 1;
      }
      out.push(`<ul>${items.map((it) => `<li>${inline(it)}</li>`).join('')}</ul>`);
      continue;
    }

    const para: string[] = [trimmed];
    i += 1;
    while (i < lines.length) {
      const n = lines[i].trim();
      if (
        !n ||
        n === '---' ||
        n === '***' ||
        /^#{1,3}\s/.test(n) ||
        n.startsWith('|') ||
        /^\d+\.\s+/.test(n) ||
        /^[-*]\s+/.test(n)
      ) {
        break;
      }
      para.push(n);
      i += 1;
    }
    out.push(`<p>${inline(para.join(' '))}</p>`);
  }

  return out.join('\n');
}
