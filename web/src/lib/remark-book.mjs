import fs from 'node:fs';
import path from 'node:path';
import GithubSlugger from 'github-slugger';
import remarkMath from 'remark-math';
import remarkMdx from 'remark-mdx';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { visit, SKIP } from 'unist-util-visit';
import { CHAPTERS, KINDS, labelsForChapter, sectionUrl } from './book.mjs';

const FILE_RE = /[\\/]content[\\/](ch\d+)[\\/]([^/?#]+)\.mdx/;
const SECTION_FILE_RE = /^\d{2}-(.+)\.mdx$/;

const attr = (name, value) => ({ type: 'mdxJsxAttribute', name, value });

function getAttr(node, name) {
  return node.attributes?.find((a) => a.type === 'mdxJsxAttribute' && a.name === name)?.value;
}

function setAttr(node, name, value) {
  node.attributes = node.attributes.filter((a) => a.name !== name);
  node.attributes.push(attr(name, value));
}

/** Solution bodies from a chapter's solutions.mdx, keyed by the problem id they solve. */
function appendixSolutions(solutionsFile) {
  const solutions = new Map();
  if (!fs.existsSync(solutionsFile)) return solutions;
  const tree = unified().use(remarkParse).use(remarkMdx).use(remarkMath).parse(fs.readFileSync(solutionsFile, 'utf8'));
  visit(tree, (node) => {
    if (node.type === 'mdxJsxFlowElement' && node.name === 'SolutionEntry') {
      solutions.set(getAttr(node, 'to'), node.children);
      return SKIP;
    }
  });
  return solutions;
}

/**
 * Book-wide numbering for chapter MDX files:
 *  - `###` headings get stable ids
 *  - <Exercise>, <Example>, <Challenge> get `number` and `id`
 *  - <Ref to="id" /> becomes a link labelled e.g. "Exercise 1.26"
 *  - <SolutionEntry to="id"> (solutions page) gets number, title and a link back
 */
export default function remarkBook() {
  return (tree, file) => {
    const match = FILE_RE.exec(file.path ?? '');
    if (!match) return;
    const [, slug, basename] = match;
    const filename = `${basename}.mdx`;
    const chapter = CHAPTERS.find((c) => c.slug === slug);
    if (!chapter) throw new Error(`Unknown chapter folder: ${slug}`);

    const chapterDir = path.join(process.cwd(), 'src', 'content', slug);
    const { labels, byFile } = labelsForChapter(chapterDir, chapter.n);
    const sectionMatch = SECTION_FILE_RE.exec(filename);
    const kind = basename === 'solutions' ? 'solutions' : sectionMatch ? 'section' : null;
    if (!kind) return;
    const sectionSlug = sectionMatch?.[1];
    const source = String(file.value);

    const lookup = (id, node) => {
      const entry = labels.get(id);
      if (!entry) file.fail(`Unknown reference "${id}" in ${slug}/${filename}`, node);
      return entry;
    };
    const linkFor = (entry) =>
      kind === 'section' && entry.sectionSlug === sectionSlug ? `#${entry.id}` : sectionUrl(slug, entry.sectionSlug, entry.id);

    if (kind === 'section') {
      const slugger = new GithubSlugger();
      visit(tree, 'heading', (node) => {
        if (node.depth < 2) return;
        const raw = source.slice(node.position.start.offset, node.position.end.offset);
        const text = raw.replace(/^#+\s+/, '').trim();
        node.data = { ...node.data, hProperties: { ...(node.data?.hProperties ?? {}), id: slugger.slug(text.replaceAll('$', '')) } };
      });

      const ordered = byFile.get(filename) ?? [];
      let index = 0;
      const appendixItems = [];
      visit(tree, (node, _, parent) => {
        if (node.type !== 'mdxJsxFlowElement' || !(node.name in KINDS)) return;
        const entry = ordered[index++];
        if (!entry || entry.kind !== node.name) {
          file.fail(`Numbering mismatch at <${node.name}> in ${filename}; check for ${node.name} tags inside comments or code`, node);
        }
        setAttr(node, 'number', entry.number);
        setAttr(node, 'id', entry.id);
        if (getAttr(node, 'solution') === 'appendix') appendixItems.push({ node, parent, id: entry.id });
      });

      const solutions = appendixSolutions(path.join(chapterDir, 'solutions.mdx'));
      for (const { node, parent, id } of appendixItems) {
        const body = solutions.get(id);
        if (!body) continue;
        const solution = { type: 'mdxJsxFlowElement', name: 'Solution', attributes: [], children: structuredClone(body) };
        parent.children.splice(parent.children.indexOf(node) + 1, 0, solution);
      }
    }

    visit(tree, (node, index, parent) => {
      if (node.type !== 'mdxJsxTextElement' && node.type !== 'mdxJsxFlowElement') return;
      if (node.name === 'Ref') {
        const entry = lookup(getAttr(node, 'to'), node);
        const link = { type: 'link', url: linkFor(entry), children: [{ type: 'text', value: entry.label }] };
        parent.children[index] = node.type === 'mdxJsxFlowElement' ? { type: 'paragraph', children: [link] } : link;
        return SKIP;
      }
      if (node.name === 'SolutionEntry') {
        const entry = lookup(getAttr(node, 'to'), node);
        setAttr(node, 'id', entry.id);
        setAttr(node, 'label', entry.label);
        setAttr(node, 'kind', entry.kind);
        setAttr(node, 'href', sectionUrl(slug, entry.sectionSlug, entry.id));
        if (entry.title) setAttr(node, 'title', entry.title);
      }
    });
  };
}
