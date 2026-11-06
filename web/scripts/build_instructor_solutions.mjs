/**
 * Build local-only HTML answer keys from web/solutions/*.mdx.
 * Output stays in web/solutions/ (gitignored) so it is never deployed.
 *
 * Usage: npm run instructor-solutions
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import katex from 'katex';
import remarkMath from 'remark-math';
import remarkMdx from 'remark-mdx';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { CHAPTERS, labelsForChapter } from '../src/lib/book.mjs';
import { katexMacros } from '../src/lib/katex-macros.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'solutions');
const CONTENT_DIR = path.join(ROOT, 'src', 'content');

const katexOpts = { macros: { ...katexMacros }, throwOnError: false, strict: false };

function getAttr(node, name) {
  return node.attributes?.find((a) => a.type === 'mdxJsxAttribute' && a.name === name)?.value;
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);
}

function renderMath(value, displayMode) {
  return katex.renderToString(value, { ...katexOpts, displayMode });
}

function renderChildren(nodes, labels) {
  return (nodes ?? []).map((node) => renderNode(node, labels)).join('');
}

function renderNode(node, labels) {
  if (!node) return '';
  switch (node.type) {
    case 'root':
      return renderChildren(node.children, labels);
    case 'heading': {
      const tag = `h${node.depth}`;
      return `<${tag}>${renderChildren(node.children, labels)}</${tag}>`;
    }
    case 'paragraph':
      return `<p>${renderChildren(node.children, labels)}</p>`;
    case 'text':
      return escapeHtml(node.value);
    case 'strong':
      return `<strong>${renderChildren(node.children, labels)}</strong>`;
    case 'emphasis':
      return `<em>${renderChildren(node.children, labels)}</em>`;
    case 'inlineCode':
      return `<code>${escapeHtml(node.value)}</code>`;
    case 'inlineMath':
      return renderMath(node.value, false);
    case 'math':
      return renderMath(node.value, true);
    case 'list': {
      const tag = node.ordered ? 'ol' : 'ul';
      return `<${tag}>${renderChildren(node.children, labels)}</${tag}>`;
    }
    case 'listItem':
      return `<li>${renderChildren(node.children, labels)}</li>`;
    case 'blockquote':
      return `<blockquote>${renderChildren(node.children, labels)}</blockquote>`;
    case 'thematicBreak':
      return '<hr />';
    case 'break':
      return '<br />';
    case 'link':
      return `<a href="${escapeHtml(node.url)}">${renderChildren(node.children, labels)}</a>`;
    case 'mdxJsxFlowElement':
    case 'mdxJsxTextElement':
      return renderJsx(node, labels);
    default:
      return renderChildren(node.children, labels);
  }
}

function renderJsx(node, labels) {
  if (node.name === 'SolutionEntry') {
    const id = getAttr(node, 'to');
    const entry = labels.get(id);
    const title = getAttr(node, 'title') || entry?.title;
    const label = entry?.label ?? id;
    const kind = entry?.kind === 'Challenge' ? ' challenge' : '';
    const heading = title ? `${escapeHtml(label)} <span class="item-title">(${escapeHtml(title)})</span>` : escapeHtml(label);
    return `<section class="solution-entry${kind}" id="${escapeHtml(id)}"><h3>${heading}</h3><div class="box">${renderChildren(node.children, labels)}</div></section>`;
  }
  if (node.name === 'Figure') {
    const src = getAttr(node, 'src');
    const alt = getAttr(node, 'alt') ?? '';
    return `<figure class="figure"><img src="../public/figures/${escapeHtml(src)}" alt="${escapeHtml(alt)}" /></figure>`;
  }
  if (node.name === 'Ref') {
    const entry = labels.get(getAttr(node, 'to'));
    return escapeHtml(entry?.label ?? getAttr(node, 'to'));
  }
  return renderChildren(node.children, labels);
}

function pageTemplate({ title, body }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)} · Instructor solutions</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.47/dist/katex.min.css" />
  <style>
    :root { --ink: #1a1a1a; --muted: #5a6570; --blue: #004880; --purple: #5b2d8e; --line: #d8dee6; }
    body { margin: 0; font: 18px/1.55 "Iowan Old Style", "Palatino Linotype", Palatino, serif; color: var(--ink); background: #faf8f5; }
    .wrap { max-width: 42rem; margin: 0 auto; padding: 2rem 1.25rem 4rem; }
    .banner { font-size: 0.8rem; letter-spacing: 0.04em; text-transform: uppercase; color: #8a2b2b; background: #f8e8e8; border: 1px solid #e4c4c4; padding: 0.45rem 0.7rem; margin-bottom: 1.5rem; }
    h1 { font-size: 2rem; color: var(--blue); margin: 0 0 0.4rem; }
    h2 { font-size: 1.45rem; color: var(--blue); margin: 2.4rem 0 1rem; }
    h3 { font-size: 1.15rem; color: var(--blue); margin: 0 0 0.4rem; }
    .lede, .muted { color: var(--muted); }
    .solution-entry { margin: 2.2rem 0; }
    .solution-entry.challenge h3 { color: #9a1f1f; }
    .item-title { font-weight: 400; color: var(--muted); }
    .box { background: #f4eef8; border: 1px solid #d3c4e4; border-left: 4px solid var(--purple); padding: 0.85rem 1rem; }
    .box p:first-child, .box ol:first-child, .box ul:first-child { margin-top: 0; }
    .box p:last-child, .box ol:last-child, .box ul:last-child { margin-bottom: 0; }
    ol { padding-left: 2.1rem; }
    ol > li::marker { content: '(' counter(list-item, lower-alpha) ')  '; }
    figure { margin: 1.1rem 0; text-align: center; }
    figure img { max-width: 100%; height: auto; }
    .katex-display { margin: 0.9rem 0; overflow-x: auto; overflow-y: hidden; }
    a { color: var(--blue); }
    nav a { margin-right: 1rem; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="banner">Instructor copy — not published. Open this file locally; do not commit or share it with students.</div>
    ${body}
  </div>
</body>
</html>
`;
}

function buildChapter(mdxPath) {
  const slug = path.basename(mdxPath, '.mdx');
  const chapter = CHAPTERS.find((c) => c.slug === slug);
  if (!chapter) throw new Error(`No chapter metadata for ${mdxPath}`);
  const { labels } = labelsForChapter(path.join(CONTENT_DIR, slug), chapter.n);
  const tree = unified().use(remarkParse).use(remarkMdx).use(remarkMath).parse(fs.readFileSync(mdxPath, 'utf8'));
  const inner = `
    <nav class="muted"><a href="index.html">All instructor solutions</a></nav>
    <h1>Chapter ${chapter.n}: ${escapeHtml(chapter.title)}</h1>
    <p class="lede">Review and challenge solutions. In-chapter exercise solutions stay in the book.</p>
    ${renderNode(tree, labels)}
  `;
  const htmlPath = path.join(OUT_DIR, `${slug}.html`);
  fs.writeFileSync(htmlPath, pageTemplate({ title: `Chapter ${chapter.n} solutions`, body: inner }));
  return { slug, n: chapter.n, title: chapter.title, file: `${slug}.html` };
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const sources = fs.readdirSync(OUT_DIR).filter((name) => /^ch\d+\.mdx$/.test(name)).sort();
  if (sources.length === 0) {
    console.error(`No chapter solution files in ${OUT_DIR} (expected ch01.mdx, …)`);
    process.exit(1);
  }
  const built = sources.map((name) => buildChapter(path.join(OUT_DIR, name)));
  const indexBody = `
    <h1>Instructor solutions</h1>
    <p class="lede">Local answer key. These pages are gitignored and are not part of the public site.</p>
    <ol>${built.map((c) => `<li><a href="${c.file}">Chapter ${c.n}: ${escapeHtml(c.title)}</a></li>`).join('')}</ol>
  `;
  fs.writeFileSync(path.join(OUT_DIR, 'index.html'), pageTemplate({ title: 'Instructor solutions', body: indexBody }));
  console.log(`built ${built.length} instructor solution page(s) in solutions/`);
}

main();
