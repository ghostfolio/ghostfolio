import type { TokenizerAndRendererExtension } from 'marked';

export const sparklineExtension: TokenizerAndRendererExtension = {
  name: 'sparkline',
  level: 'block',
  start(src: string) {
    return src.indexOf('```sparkline');
  },
  tokenizer(src: string) {
    const match = src.match(/^```sparkline\n([\s\S]*?)```/);
    if (!match) return undefined;
    return {
      type: 'sparkline',
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
    let values: number[] = [];

    for (const line of lines) {
      if (line.startsWith('title:')) {
        title = line.slice(6).trim();
      } else if (line.startsWith('values:')) {
        values = line
          .slice(7)
          .split(',')
          .map((v: string) => parseFloat(v.trim()))
          .filter((v: number) => !isNaN(v));
      }
    }

    if (!values.length) return '';

    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const width = 200;
    const height = 40;
    const padding = 2;

    const points = values
      .map((v, i) => {
        const x = (i / (values.length - 1)) * width;
        const y = padding + (1 - (v - min) / range) * (height - padding * 2);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');

    const trend = values[values.length - 1] >= values[0];
    const color = trend ? '#10b981' : '#ef4444';

    // Build fill polygon (closed path under the line)
    const fillPoints = `0,${height} ${points} ${width},${height}`;

    const titleHtml = title
      ? `<div class="c-sparkline-title">${title}</div>`
      : '';

    return `<div class="c-sparkline">
      ${titleHtml}
      <svg class="c-spark-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
        <polygon points="${fillPoints}" fill="${color}" opacity="0.1"/>
        <polyline points="${points}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>`;
  }
};
