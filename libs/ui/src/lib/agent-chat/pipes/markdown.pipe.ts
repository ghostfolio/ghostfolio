import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { marked } from 'marked';

import { configureMarkedRenderer } from '../services/markdown-config';

configureMarkedRenderer();

@Pipe({
  name: 'gfMarkdown',
  pure: true,
  standalone: true
})
export class GfMarkdownPipe implements PipeTransform {
  public constructor(private sanitizer: DomSanitizer) {}

  public transform(value: string): SafeHtml {
    if (!value) {
      return '';
    }

    const html = marked.parse(value, { async: false }) as string;

    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}
