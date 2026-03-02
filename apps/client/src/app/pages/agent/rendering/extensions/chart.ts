import type { TokenizerAndRendererExtension } from 'marked';

function buildChartExtension(
  chartType: 'area' | 'bar'
): TokenizerAndRendererExtension {
  const tag = `chart-${chartType}`;

  return {
    name: tag,
    level: 'block',
    start(src: string) {
      return src.indexOf('```' + tag);
    },
    tokenizer(src: string) {
      const re = new RegExp('^```' + tag + '\\n([\\s\\S]*?)```');
      const match = src.match(re);
      if (!match) return undefined;
      return {
        type: tag,
        raw: match[0],
        body: match[1]
      };
    },
    renderer(token: any) {
      const lines = token.body
        .split('\n')
        .map((l: string) => l.trim())
        .filter(Boolean);

      let title = '';
      const labels: string[] = [];
      const values: number[] = [];

      for (const line of lines) {
        if (line.startsWith('title:')) {
          title = line.slice(6).trim();
          continue;
        }
        const colonIdx = line.lastIndexOf(':');
        if (colonIdx === -1) continue;
        const label = line.slice(0, colonIdx).trim();
        const val = parseFloat(line.slice(colonIdx + 1).trim());
        if (label && !isNaN(val)) {
          labels.push(label);
          values.push(val);
        }
      }

      if (!labels.length) return '';

      const titleHtml = title
        ? `<div class="c-chart-title">${title}</div>`
        : '';

      // Encode data as canvas fallback text — Angular sanitizer strips
      // data-* attributes from [innerHTML], but preserves text content.
      const config = JSON.stringify({ type: chartType, labels, values });
      const escaped = config
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      return `<div class="c-chart-wrap">
        ${titleHtml}
        <canvas class="c-chart-canvas" width="400" height="180">${escaped}</canvas>
      </div>`;
    }
  };
}

export const chartAreaExtension = buildChartExtension('area');
export const chartBarExtension = buildChartExtension('bar');
