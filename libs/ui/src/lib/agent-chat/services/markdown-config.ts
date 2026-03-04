import { marked } from 'marked';

let configured = false;

const COPY_ICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';

export function configureMarkedRenderer(): void {
  if (configured) {
    return;
  }

  configured = true;

  const renderer = {
    code({ text, lang }: { text: string; lang?: string }): string {
      const langLabel = lang ? `<span class="code-lang">${lang}</span>` : '';
      const encodedCode = encodeURIComponent(text);

      return (
        `<div class="code-block-wrapper">` +
        `<div class="code-block-header">` +
        `${langLabel}` +
        `<button class="code-copy-btn" data-code="${encodedCode}" title="Copy code">${COPY_ICON_SVG}</button>` +
        `</div>` +
        `<pre><code${lang ? ` class="language-${lang}"` : ''}>${text}</code></pre>` +
        `</div>`
      );
    }
  };

  marked.use({ renderer });
}
