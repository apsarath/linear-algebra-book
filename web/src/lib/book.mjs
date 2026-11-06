import fs from 'node:fs';
import path from 'node:path';
import GithubSlugger from 'github-slugger';

export const BASE = '/';

export const BOOK_TITLE = 'Introduction to Linear Algebra';
export const BOOK_AUTHOR = 'Sarath Chandar';

export const CHAPTERS = [
  { n: 1, slug: 'ch01', title: 'Vectors' },
  { n: 2, slug: 'ch02', title: 'Span and Linear Independence' },
  { n: 3, slug: 'ch03', title: 'Matrices and Matrix Operations' },
  { n: 4, slug: 'ch04', title: 'Systems of Linear Equations' },
  { n: 5, slug: 'ch05', title: 'Vector Spaces and Subspaces' },
  { n: 6, slug: 'ch06', title: 'Basis, Dimension, Rank, and Change of Basis' },
  { n: 7, slug: 'ch07', title: 'Linear Transformations' },
  { n: 8, slug: 'ch08', title: 'Determinants' },
  { n: 9, slug: 'ch09', title: 'The Matrix Inverse' },
  { n: 10, slug: 'ch10', title: 'Orthogonality, Norms, and Inner Products' },
  { n: 11, slug: 'ch11', title: 'Orthogonal Projections and Least Squares' },
  { n: 12, slug: 'ch12', title: 'Eigenvalues and Eigenvectors' },
  { n: 13, slug: 'ch13', title: 'Symmetric Matrices and Quadratic Forms' },
  { n: 14, slug: 'ch14', title: 'Singular Value Decomposition' },
  { n: 15, slug: 'ch15', title: 'Tensors and Multi-dimensional Arrays' },
];

export const KINDS = {
  Exercise: { label: 'Exercise', prefix: 'exercise' },
  Example: { label: 'Example', prefix: 'example' },
  Challenge: { label: 'Challenge Problem', prefix: 'challenge' },
};

const SECTION_FILE_RE = /^(\d{2})-(.+)\.mdx$/;

export function chapterUrl(slug) {
  return `${BASE}${slug}/`;
}

export function sectionUrl(chapterSlug, sectionSlug, hash = '') {
  return `${BASE}${chapterSlug}/${sectionSlug}/${hash ? `#${hash}` : ''}`;
}

/** Numbered section files (`01-slug.mdx`) in a chapter folder, in order. */
export function listSectionFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .flatMap((name) => {
      const m = SECTION_FILE_RE.exec(name);
      return m ? [{ name, index: Number(m[1]), slug: m[2] }] : [];
    })
    .sort((a, b) => a.index - b.index);
}

export function readFrontmatter(source) {
  const m = /^---\n([\s\S]*?)\n---\n/.exec(source);
  if (!m) return { title: '', body: source };
  const t = /^\s*title:\s*(?:"([^"]*)"|'([^']*)'|(.+))\s*$/m.exec(m[1]);
  return { title: (t?.[1] ?? t?.[2] ?? t?.[3] ?? '').trim(), body: source.slice(m[0].length) };
}

/** `###` headings in a section, with ids matching remark-book. */
export function subsectionHeadings(source) {
  const slugger = new GithubSlugger();
  const body = readFrontmatter(source).body;
  const sections = [];
  let inFence = false;
  for (const line of body.split('\n')) {
    if (line.startsWith('```')) inFence = !inFence;
    if (inFence) continue;
    const m = /^### (.+?)\s*$/.exec(line);
    if (!m) continue;
    const text = m[1];
    sections.push({ text, id: slugger.slug(text.replaceAll('$', '')) });
  }
  return sections;
}

const ELEMENT_RE = /<(Exercise|Example|Challenge)\b((?:[^>"]|"[^"]*")*)>/g;
const ATTR_RE = /(\w+)="([^"]*)"/g;

function parseAttrs(src) {
  const attrs = {};
  for (const [, k, v] of src.matchAll(ATTR_RE)) attrs[k] = v;
  return attrs;
}

const labelCache = new Map();

/**
 * Numbers every Exercise, Example and Challenge across a chapter's section files.
 * Each kind has its own counter, mirroring the LaTeX book.
 */
export function labelsForChapter(dir, chapterNumber) {
  const files = listSectionFiles(dir);
  const stamp = files.map((f) => `${f.name}:${fs.statSync(path.join(dir, f.name)).mtimeMs}`).join('|');
  const cached = labelCache.get(dir);
  if (cached && cached.stamp === stamp) return cached.result;

  const counters = { Exercise: 0, Example: 0, Challenge: 0 };
  const labels = new Map();
  const ordered = [];
  const byFile = new Map();

  for (const file of files) {
    const source = fs.readFileSync(path.join(dir, file.name), 'utf8');
    const fileEntries = [];
    for (const [, kind, attrSrc] of source.matchAll(ELEMENT_RE)) {
      counters[kind] += 1;
      const attrs = parseAttrs(attrSrc);
      const number = `${chapterNumber}.${counters[kind]}`;
      const id = attrs.id ?? `${KINDS[kind].prefix}-${number.replace('.', '-')}`;
      const entry = {
        kind,
        number,
        id,
        title: attrs.title ?? null,
        label: `${KINDS[kind].label} ${number}`,
        sectionSlug: file.slug,
      };
      labels.set(id, entry);
      ordered.push(entry);
      fileEntries.push(entry);
    }
    byFile.set(file.name, fileEntries);
  }

  const result = { labels, ordered, byFile };
  labelCache.set(dir, { stamp, result });
  return result;
}
