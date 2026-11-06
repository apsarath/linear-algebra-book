import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import { unified } from '@astrojs/markdown-remark';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkBook from './src/lib/remark-book.mjs';
import { katexMacros } from './src/lib/katex-macros.mjs';
import { BASE } from './src/lib/book.mjs';

/** Section pages embed their solutions.mdx at build time, so editing solutions must rebuild those pages. */
const solutionsReload = {
  name: 'book-solutions-reload',
  handleHotUpdate({ file, server }) {
    if (!/[\\/]content[\\/]ch\d+[\\/]solutions\.mdx$/.test(file)) return;
    const dir = file.replace(/solutions\.mdx$/, '');
    for (const [modFile, mods] of server.moduleGraph.fileToModulesMap) {
      if (typeof modFile === 'string' && modFile.startsWith(dir) && /\d{2}-.+\.mdx$/.test(modFile)) {
        for (const mod of mods) server.moduleGraph.invalidateModule(mod);
      }
    }
    server.ws.send({ type: 'full-reload' });
  },
};

export default defineConfig({
  base: BASE,
  trailingSlash: 'always',
  integrations: [mdx(), react()],
  vite: { plugins: [solutionsReload] },
  markdown: {
    processor: unified({
      remarkPlugins: [remarkMath, remarkBook],
      rehypePlugins: [[rehypeKatex, { macros: katexMacros, strict: false }]],
    }),
  },
});
