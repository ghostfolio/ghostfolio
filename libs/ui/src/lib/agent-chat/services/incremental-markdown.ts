import { marked } from 'marked';

import { configureMarkedRenderer } from './markdown-config';

configureMarkedRenderer();

const CURSOR_HTML = '<span class="streaming-cursor-inline"></span>';

export class IncrementalMarkdownRenderer {
  private frozenHtml = '';
  private frozenSource = '';
  private lastSource = '';
  private lastResult = '';

  public render(source: string, isStreaming: boolean): string {
    if (source === this.lastSource) {
      return this.lastResult;
    }

    this.lastSource = source;

    // Find the boundary between frozen (complete) blocks and the trailing block
    const splitIndex = source.lastIndexOf('\n\n');

    let frozenPart = '';
    let trailingPart = source;

    if (splitIndex > 0) {
      frozenPart = source.substring(0, splitIndex);
      trailingPart = source.substring(splitIndex);
    }

    // Only re-parse frozen blocks if they changed
    if (frozenPart && frozenPart !== this.frozenSource) {
      this.frozenSource = frozenPart;
      this.frozenHtml = marked.parse(frozenPart, { async: false }) as string;
    }

    // Always re-parse the trailing (in-progress) block
    const trailingHtml = trailingPart
      ? (marked.parse(trailingPart, { async: false }) as string)
      : '';

    let combined = (frozenPart ? this.frozenHtml : '') + trailingHtml;

    if (isStreaming) {
      combined = this.injectCursorAtEnd(combined);
    }

    this.lastResult = combined;

    return combined;
  }

  public reset(): void {
    this.frozenHtml = '';
    this.frozenSource = '';
    this.lastSource = '';
    this.lastResult = '';
  }

  public invalidate(): void {
    this.frozenHtml = '';
    this.frozenSource = '';
    this.lastSource = '';
    this.lastResult = '';
  }

  private injectCursorAtEnd(html: string): string {
    // Insert cursor before the last closing HTML tag to place it inline
    const lastCloseTag = html.lastIndexOf('</');

    if (lastCloseTag > 0) {
      return (
        html.substring(0, lastCloseTag) +
        CURSOR_HTML +
        html.substring(lastCloseTag)
      );
    }

    return html + CURSOR_HTML;
  }
}
