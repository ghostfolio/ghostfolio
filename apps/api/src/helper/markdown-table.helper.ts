import type { ColumnDescriptor } from 'tablemark';

export interface TableColumnDefinition<T> extends ColumnDescriptor {
  getValue: (item: T) => string;
  name: string;
}

// Dynamic import to load ESM module from CommonJS context
// eslint-disable-next-line @typescript-eslint/no-implied-eval
const dynamicImport = new Function('s', 'return import(s)') as (
  s: string
) => Promise<typeof import('tablemark')>;

/**
 * Renders the rows as a markdown table with one column per definition, which
 * gives the title of the column and reads the value of a row
 */
export async function getMarkdownTable<T>({
  columnDefinitions,
  rows
}: {
  columnDefinitions: readonly TableColumnDefinition<T>[];
  rows: readonly T[];
}) {
  const { tablemark } = await dynamicImport('tablemark');

  return tablemark(
    rows.map((row) => {
      return columnDefinitions.reduce(
        (tableRow, { getValue, name }) => {
          tableRow[name] = getValue(row);

          return tableRow;
        },
        {} as Record<string, string>
      );
    }),
    {
      columns: columnDefinitions.map(({ align, name }) => {
        return { name, align: align ?? 'left' };
      })
    }
  );
}
