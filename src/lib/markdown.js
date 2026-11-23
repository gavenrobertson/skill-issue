// Markdown -> HTML for lessons, with C++ highlighting and special code fences.
import { Marked, Renderer } from 'marked';
import hljs from 'highlight.js/lib/core';
import cpp from 'highlight.js/lib/languages/cpp';
import bash from 'highlight.js/lib/languages/bash';
import { headingId } from './parse.js';

hljs.registerLanguage('cpp', cpp);
hljs.registerLanguage('bash', bash);

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function highlight(code, lang = 'cpp') {
  if (hljs.getLanguage(lang)) return hljs.highlight(code, { language: lang }).value;
  return esc(code);
}

const COPY = '<button class="copy-code" data-copy aria-label="Copy code" title="Copy code">Copy</button>';

const marked = new Marked({
  gfm: true,
  renderer: {
    heading({ tokens, depth, text }) {
      const inner = this.parser.parseInline(tokens);
      if (depth !== 2 && depth !== 3) return `<h${depth}>${inner}</h${depth}>`;
      const id = headingId(text);
      return `<h${depth} id="${id}"><a class="anchor" href="#" data-anchor="${id}" aria-hidden="true" tabindex="-1">#</a>${inner}</h${depth}>`;
    },
    code({ text, lang }) {
      const info = (lang || '').trim();
      const [language, ...rest] = info.split(/\s+/);
      const meta = rest.join(' ');
      if (language === 'output') {
        return `<div class="codeblock output"><div class="codeblock-bar"><span class="label">Output</span></div><pre><code>${esc(text)}</code></pre></div>`;
      }
      if (language === 'cpp' || language === 'c++') {
        const runnable = /\brun\b/.test(meta);
        const broken = /\bcompile-error\b/.test(meta);
        const bar = runnable
          ? `<div class="codeblock-bar"><span class="label">C++ program</span><span class="bar-actions">${COPY}<button class="run-example" data-run>▶ Run</button></span></div>`
          : broken
            ? `<div class="codeblock-bar error"><span class="label">✗ Does not compile</span><span class="bar-actions"><button class="run-example ghost" data-run>See the error</button></span></div>`
            : '';
        return `<div class="codeblock${runnable ? ' runnable' : ''}${broken ? ' broken' : ''}">${bar}<pre><code class="hljs language-cpp">${highlight(text)}</code></pre>${bar ? '' : COPY.replace('copy-code', 'copy-code floating')}</div>`;
      }
      const shell = /^(sh|bash|shell|console)$/.test(language) || (!language && /^(g\+\+|clang|\.\/)/m.test(text));
      return `<div class="codeblock plain"><pre><code class="hljs">${shell ? highlight(text, 'bash') : esc(text)}</code></pre></div>`;
    },
    link({ href, title, tokens }) {
      const text = this.parser.parseInline(tokens);
      const external = /^https?:/.test(href);
      return `<a href="${esc(href)}"${title ? ` title="${esc(title)}"` : ''}${external ? ' target="_blank" rel="noreferrer"' : ''}>${text}</a>`;
    },
    table(token) {
      return `<div class="table-wrap">${Renderer.prototype.table.call(this, token)}</div>`;
    },
  },
});

const CALLOUT = /<blockquote>\s*<p><strong>(Note|Tip|Warning|Pitfall|Important):?<\/strong>:?/g;

export function renderMarkdown(md) {
  const html = marked.parse(md || '');
  return html.replace(CALLOUT, (_, kind) => `<blockquote class="callout callout-${kind.toLowerCase()}"><p><strong>${kind}:</strong>`);
}

export function renderInline(md) {
  return marked.parseInline(md || '');
}
