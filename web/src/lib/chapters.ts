import fs from 'node:fs';
import path from 'node:path';
import katex from 'katex';
import { CHAPTERS, listSectionFiles, readFrontmatter, subsectionHeadings } from './book.mjs';
import { katexMacros } from './katex-macros.mjs';

const CONTENT_DIR = path.join(process.cwd(), 'src', 'content');

export interface SectionInfo {
  slug: string;
  file: string;
  number: string;
  title: string;
  html: string;
}

export type Chapter = (typeof CHAPTERS)[number] & {
  available: boolean;
  sections: SectionInfo[];
};

export function allChapters(): Chapter[] {
  return CHAPTERS.map((c) => {
    const dir = path.join(CONTENT_DIR, c.slug);
    const files = listSectionFiles(dir);
    return {
      ...c,
      available: files.length > 0,
      sections: files.map((f, i) => {
        const source = fs.readFileSync(path.join(dir, f.name), 'utf8');
        const title = readFrontmatter(source).title || f.slug;
        return {
          slug: f.slug,
          file: f.name,
          number: `${c.n}.${i + 1}`,
          title,
          html: renderInlineMath(title),
        };
      }),
    };
  });
}

export function pageSubsections(slug: string, file: string) {
  const source = fs.readFileSync(path.join(CONTENT_DIR, slug, file), 'utf8');
  return subsectionHeadings(source).map((s: { text: string; id: string }) => ({
    ...s,
    html: renderInlineMath(s.text),
  }));
}

/** Renders `$...$` spans in short strings such as headings. */
export function renderInlineMath(text: string): string {
  return text
    .split(/(\$[^$]+\$)/)
    .map((part) =>
      part.startsWith('$') && part.endsWith('$')
        ? katex.renderToString(part.slice(1, -1), { macros: { ...katexMacros }, throwOnError: false })
        : part.replace(/[&<>]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[ch]!),
    )
    .join('');
}
