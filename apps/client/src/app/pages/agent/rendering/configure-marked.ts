import type { marked as MarkedType } from 'marked';

import { allocationExtension } from './extensions/allocation';
import { chartAreaExtension, chartBarExtension } from './extensions/chart';
import { metricsExtension } from './extensions/metrics';
import { suggestionsExtension } from './extensions/pills';
import { sparklineExtension } from './extensions/sparkline';
import { tableRenderer } from './table-renderer';

export function configureMarked(marked: typeof MarkedType) {
  // Register custom table renderer
  marked.use({
    renderer: {
      table(token) {
        const result = tableRenderer(token);
        if (result === false) return false;
        return result;
      }
    }
  });

  // Register fenced block extensions
  marked.use({
    extensions: [
      allocationExtension,
      metricsExtension,
      sparklineExtension,
      chartAreaExtension,
      chartBarExtension,
      suggestionsExtension
    ]
  });
}
