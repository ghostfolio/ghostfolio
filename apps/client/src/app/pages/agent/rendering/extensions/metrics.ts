import type { TokenizerAndRendererExtension } from 'marked';

import { parseLines } from '../line-parser';
import { classifySentiment } from '../value-classifier';

export const metricsExtension: TokenizerAndRendererExtension = {
  name: 'metrics',
  level: 'block',
  start(src: string) {
    return src.indexOf('```metrics');
  },
  tokenizer(src: string) {
    const match = src.match(/^```metrics\n([\s\S]*?)```/);
    if (!match) return undefined;
    return {
      type: 'metrics',
      raw: match[0],
      body: match[1]
    };
  },
  renderer(token: any) {
    const lines = parseLines(token.body);
    if (!lines.length) return '';

    const cards = lines
      .map((line) => {
        let deltaHtml = '';
        if (line.delta && line.delta !== '--') {
          const sentiment = classifySentiment(line.delta);
          const cls =
            sentiment === 'positive'
              ? 'c-val-pos'
              : sentiment === 'negative'
                ? 'c-val-neg'
                : '';
          deltaHtml = `<span class="c-metric-delta ${cls}">${line.delta}</span>`;
        }
        return `<div class="c-metric-card">
        <div class="c-metric-label">${line.label}</div>
        <div class="c-metric-value">${line.value}</div>
        ${deltaHtml}
      </div>`;
      })
      .join('');

    return `<div class="c-metric-row">${cards}</div>`;
  }
};
