import { TableParameters } from './interfaces/table-parameters.interface';

/**
 * Gives the columns and the rows in the form which the renderer takes, with
 * one column per definition, which gives the title of the column and reads
 * the value of a row
 */
export function getTableInput<T, C = void>({
  columnDefinitions,
  context,
  rows
}: TableParameters<T, C>) {
  return {
    columns: columnDefinitions.map(({ align, name }) => {
      return { name, align: align ?? 'left' };
    }),
    rows: rows.map((row) => {
      return columnDefinitions.reduce(
        (tableRow, { getValue, name }) => {
          tableRow[name] = getValue(row, context);

          return tableRow;
        },
        {} as Record<string, string>
      );
    })
  };
}

export async function getMarkdownTable<T, C = void>(
  parameters: TableParameters<T, C>
) {
  const { columns, rows } = getTableInput(parameters);

  // Dynamic import to load ESM module from CommonJS context
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  const dynamicImport = new Function('s', 'return import(s)') as (
    s: string
  ) => Promise<typeof import('tablemark')>;

  const { tablemark } = await dynamicImport('tablemark');

  return tablemark(rows, { columns });
}
