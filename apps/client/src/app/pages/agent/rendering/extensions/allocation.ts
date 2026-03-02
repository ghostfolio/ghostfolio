import type { TokenizerAndRendererExtension } from 'marked';

import { parseLines } from '../line-parser';

export const allocationExtension: TokenizerAndRendererExtension = {
  name: 'allocation',
  level: 'block',
  start(src: string) {
    return src.indexOf('```allocation');
  },
  tokenizer(src: string) {
    const match = src.match(/^```allocation\n([\s\S]*?)```/);
    if (!match) return undefined;
    return {
      type: 'allocation',
      raw: match[0],
      body: match[1]
    };
  },
  renderer(token: any) {
    const lines = parseLines(token.body);
    if (!lines.length) return '';

    const rows = lines
      .map((line) => {
        const pct = parseFloat(line.value);
        const width = isNaN(pct) ? 0 : Math.min(Math.max(pct, 0), 100);
        return `<div class="c-progress-row">
        <div class="c-progress-meta">
          <span class="c-progress-label">${line.label}</span>
          <span class="c-progress-value">${line.value}</span>
        </div>
        <div class="c-alloc-bar"><div class="c-alloc-fill" style="width:${width}%"></div></div>
      </div>`;
      })
      .join('');

    return `<div class="c-alloc-group">${rows}</div>`;
  }
};
