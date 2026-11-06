import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import { unified } from '@astrojs/markdown-remark';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkBook from './src/lib/remark-book.mjs';
import { katexMacros } from './src/lib/katex-macros.mjs';
import { BASE } from './src/lib/book.mjs';

export default defineConfig({
  base: BASE,
  trailingSlash: 'always',
  integrations: [mdx(), react()],
  markdown: {
    processor: unified({
      remarkPlugins: [remarkMath, remarkBook],
      rehypePlugins: [[rehypeKatex, { macros: katexMacros, strict: false }]],
    }),
  },
});
