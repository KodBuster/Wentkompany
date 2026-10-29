import fs from 'node:fs';
import path from 'node:path';
import { markdownToHtml } from '@/lib/markdown';

export type BlogArticleMeta = {
  /** URL-slug без префикса /blog/ */
  slug: string;
  title: string;
  /** Короткий лид для списка */
  excerpt: string;
  filename: string;
};

export type BlogArticle = BlogArticleMeta & {
  html: string;
};

const DIR = path.join(process.cwd(), 'content', 'blog');

/** Порядок в списке и «предыдущая / следующая» — без номеров в именах файлов. */
const SLUG_ORDER = [
  'poleznye-ssylki',
  'obsiy',
  'pristennyy',
  'ostrovnoy',
  'pritochno-vytyazhnoy',
  'gidrozatvor',
  'gidrofiltr',
  'mangal',
  'kupit',
  'montazh',
  'raschet',
] as const;

const FILE_RE = /^([a-z0-9-]+)\.md$/i;

function readDir(): string[] {
  if (!fs.existsSync(DIR)) return [];
  return fs.readdirSync(DIR).filter((f) => FILE_RE.test(f));
}

function firstParagraph(body: string): string {
  const lines = body.replace(/\r\n/g, '\n').split('\n');
  const buf: string[] = [];
  for (const line of lines) {
    const t = line.trim();
    if (!t) {
      if (buf.length) break;
      continue;
    }
    if (t.startsWith('#') || t === '---' || t.startsWith('|') || /^[-*]\s/.test(t) || /^\d+\.\s/.test(t)) {
      if (buf.length) break;
      continue;
    }
    buf.push(t.replace(/\*\*/g, '').replace(/\*/g, ''));
    if (buf.join(' ').length > 160) break;
  }
  const text = buf.join(' ').replace(/\s+/g, ' ').trim();
  if (text.length <= 180) return text;
  return `${text.slice(0, 177).replace(/\s+\S*$/, '')}…`;
}

function metaFromFile(filename: string): BlogArticleMeta | null {
  const m = FILE_RE.exec(filename);
  if (!m) return null;
  const slug = m[1];
  const raw = fs.readFileSync(path.join(DIR, filename), 'utf8');
  const titleLine = raw.split(/\r?\n/).find((l) => l.startsWith('# '));
  const title = titleLine ? titleLine.slice(2).trim() : slug;
  const afterTitle = raw.replace(/^#\s+[^\n]+\n?/, '');
  return {
    slug,
    title,
    excerpt: firstParagraph(afterTitle),
    filename,
  };
}

function sortIndex(slug: string): number {
  const i = (SLUG_ORDER as readonly string[]).indexOf(slug);
  return i === -1 ? 1000 : i;
}

/** Список статей в заданном порядке. */
export function listBlogArticles(): BlogArticleMeta[] {
  return readDir()
    .map(metaFromFile)
    .filter((a): a is BlogArticleMeta => !!a)
    .sort((a, b) => sortIndex(a.slug) - sortIndex(b.slug) || a.slug.localeCompare(b.slug, 'ru'));
}

/** Статья по slug или null. */
export function getBlogArticle(slug: string): BlogArticle | null {
  const meta = listBlogArticles().find((a) => a.slug === slug);
  if (!meta) return null;
  const raw = fs.readFileSync(path.join(DIR, meta.filename), 'utf8');
  return {
    ...meta,
    html: markdownToHtml(raw, { skipFirstH1: true }),
  };
}

/** Все slug для generateStaticParams. */
export function allBlogSlugs(): string[] {
  return listBlogArticles().map((a) => a.slug);
}
