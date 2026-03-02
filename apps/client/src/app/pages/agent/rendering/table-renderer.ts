import type { Tokens } from 'marked';

import { CellType, classifyCell, classifySentiment } from './value-classifier';

const COMPARISON_KEYWORDS =
  /\b(prev|curr|before|after|prior|current|old|new|\d{4})\b/i;

const CELL_CLASS: Record<CellType, string> = {
  ticker: 'c-cell-ticker',
  currency: 'c-cell-currency',
  percent: 'c-cell-delta',
  number: 'c-cell-num',
  text: ''
};

function getCellText(cell: Tokens.TableCell): string {
  return cell.tokens?.map((t: any) => t.raw ?? t.text ?? '').join('') ?? '';
}

function hasFinancialData(types: CellType[][]): boolean {
  return types.some((row) =>
    row.some((t) => t === 'currency' || t === 'percent' || t === 'number')
  );
}

function isAllocationTable(
  headers: string[],
  _cellTypes: CellType[][],
  cells: string[][]
): boolean {
  if (headers.length !== 2) return false;

  return cells.every((row) => {
    if (row.length < 2) return false;
    const pct = parseFloat(row[1]);
    return !isNaN(pct) && pct >= 0 && pct <= 100;
  });
}

function isComparisonTable(headers: string[]): boolean {
  return headers.some((h) => COMPARISON_KEYWORDS.test(h));
}

function renderAllocationBars(_headers: string[], cells: string[][]): string {
  const rows = cells
    .map((row) => {
      const label = row[0];
      const pct = parseFloat(row[1]);
      const width = isNaN(pct) ? 0 : Math.min(Math.max(pct, 0), 100);
      return `<div class="c-progress-row">
      <div class="c-progress-meta">
        <span class="c-progress-label">${label}</span>
        <span class="c-progress-value">${row[1]}</span>
      </div>
      <div class="c-alloc-bar"><div class="c-alloc-fill" style="width:${width}%"></div></div>
    </div>`;
    })
    .join('');

  return `<div class="c-alloc-group">${rows}</div>`;
}

function renderEnhancedTable(
  token: Tokens.Table,
  _headerTexts: string[],
  _cells: string[][],
  cellTypes: CellType[][],
  tableClass: string
): string {
  const ths = token.header
    .map((h, i) => {
      const align =
        cellTypes[0]?.[i] === 'currency' || cellTypes[0]?.[i] === 'number'
          ? ' style="text-align:right"'
          : '';
      return `<th${align}>${getCellText(h)}</th>`;
    })
    .join('');

  const trs = token.rows
    .map((row, ri) => {
      const tds = row
        .map((cell, ci) => {
          const text = getCellText(cell);
          const type = cellTypes[ri]?.[ci] ?? 'text';
          const cls = CELL_CLASS[type];
          let content = text;

          if (type === 'percent') {
            const sentiment = classifySentiment(text);
            if (sentiment === 'positive') {
              content = `<span class="c-val-pos">${text}</span>`;
            } else if (sentiment === 'negative') {
              content = `<span class="c-val-neg">${text}</span>`;
            }
          }

          const align =
            type === 'currency' || type === 'number'
              ? ' style="text-align:right"'
              : '';
          return `<td class="${cls}"${align}>${content}</td>`;
        })
        .join('');
      return `<tr>${tds}</tr>`;
    })
    .join('');

  return `<table class="${tableClass}"><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`;
}

/**
 * Custom table renderer for marked.
 * Returns the custom HTML string, or `false` to fall back to default rendering.
 */
export function tableRenderer(token: Tokens.Table): string | false {
  const headerTexts = token.header.map(getCellText);

  const cells = token.rows.map((row) => row.map(getCellText));
  const cellTypes = cells.map((row) => row.map(classifyCell));

  // Allocation bars: 2 cols, all percentages 0-100
  if (isAllocationTable(headerTexts, cellTypes, cells)) {
    return renderAllocationBars(headerTexts, cells);
  }

  // Only enhance if financial data detected
  if (!hasFinancialData(cellTypes)) {
    return false;
  }

  const tableClass = isComparisonTable(headerTexts)
    ? 'c-comp-table'
    : 'c-table';

  return renderEnhancedTable(token, headerTexts, cells, cellTypes, tableClass);
}
