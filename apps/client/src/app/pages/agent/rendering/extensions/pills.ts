import type { TokenizerAndRendererExtension } from 'marked';

const MAX_SUGGESTIONS = 2;

export const suggestionsExtension: TokenizerAndRendererExtension = {
  name: 'suggestions',
  level: 'block',
  start(src: string) {
    return src.indexOf('```suggestions');
  },
  tokenizer(src: string) {
    const match = src.match(/^```suggestions\n([\s\S]*?)```/);
    if (!match) return undefined;
    return {
      type: 'suggestions',
      raw: match[0],
      body: match[1]
    };
  },
  renderer(token: any) {
    const lines = token.body
      .split('\n')
      .map((l: string) => l.trim())
      .filter(Boolean)
      .slice(0, MAX_SUGGESTIONS);

    if (!lines.length) return '';

    const items = lines
      .map((line: string) => {
        const escaped = line
          .replace(/&/g, '&amp;')
          .replace(/"/g, '&quot;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        return `<span class="c-suggest"><span class="c-suggest-arrow">\u21B3</span> ${escaped}</span>`;
      })
      .join('');

    return `<div class="c-suggest-list">${items}</div>`;
  }
};
