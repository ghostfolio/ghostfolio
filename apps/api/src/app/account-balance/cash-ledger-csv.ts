import { BadRequestException } from '@nestjs/common';
import { Big } from 'big.js';
import { parse, unparse } from 'papaparse';

export const CASH_CSV_COLUMNS = [
  'Version',
  'Record',
  'Reference',
  'Date',
  'Sequence',
  'Operation',
  'Amount',
  'Fee',
  'Currency',
  'Note',
  'SourceAccount',
  'SourceAccountName',
  'AutomaticOpening',
  'ActivityId',
  'ActivityName',
  'ActivityType',
  'ActivityDate',
  'DataSource',
  'Symbol',
  'ActivityCurrency',
  'Quantity',
  'UnitPrice',
  'ActivityFee',
  'TransferReference'
] as const;
export type CashCsvRow = Record<(typeof CASH_CSV_COLUMNS)[number], string>;

export function decimal(value: string): string {
  if (!/^-?\d+(\.\d+)?$/.test(value))
    throw new BadRequestException(
      'Use decimal numbers with a dot and no thousands separators.'
    );
  const number = new Big(value);
  if (number.abs().gte('1e35') || !number.eq(number.round(30, Big.roundDown))) {
    throw new BadRequestException(
      'Cash amounts support 35 integer and 30 fractional digits.'
    );
  }
  return number.toFixed();
}

export function csvDate(value: string, allowOpening = false): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw new BadRequestException(
      'Dates must use YYYY-MM-DD without a time zone.'
    );
  const date = new Date(`${value}T00:00:00.000Z`);
  if (
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value ||
    (!allowOpening && value < '0001-01-01') ||
    value.startsWith('0000-')
  ) {
    throw new BadRequestException('Invalid cash date.');
  }
  return value;
}

export function readCashCsv(csv: string): CashCsvRow[] {
  if (typeof csv !== 'string' || Buffer.byteLength(csv, 'utf8') > 2_000_000)
    throw new BadRequestException('Cash CSV exceeds the 2 MB limit.');
  const aliases: Record<string, string> = {
    Data: 'Date',
    Operazione: 'Operation',
    Importo: 'Amount',
    Commissione: 'Fee',
    Valuta: 'Currency',
    Nota: 'Note',
    Sequenza: 'Sequence',
    Riferimento: 'Reference'
  };
  const parsed = parse<Record<string, string>>(csv.replace(/^\uFEFF/, ''), {
    header: true,
    dynamicTyping: false,
    skipEmptyLines: 'greedy',
    transformHeader: (header) => aliases[header.trim()] ?? header.trim()
  });
  const fields = parsed.meta.fields ?? [];
  if (
    parsed.errors.length ||
    new Set(fields).size !== fields.length ||
    fields.some((field) => !CASH_CSV_COLUMNS.includes(field as never))
  ) {
    throw new BadRequestException('Invalid CSV structure or unknown column.');
  }
  for (const required of ['Date', 'Operation', 'Amount', 'Currency']) {
    if (!fields.includes(required))
      throw new BadRequestException(`Missing CSV column: ${required}`);
  }
  if (!parsed.data.length || parsed.data.length > 5000)
    throw new BadRequestException('Import between 1 and 5000 cash rows.');
  return parsed.data.map((item) => {
    const row = Object.fromEntries(
      CASH_CSV_COLUMNS.map((key) => [key, item[key] ?? ''])
    ) as CashCsvRow;
    for (const key of CASH_CSV_COLUMNS)
      if (key !== 'Note') row[key] = row[key].trim();
    if (row.Version && row.Version !== '1')
      throw new BadRequestException('Unsupported cash CSV version.');
    const operations: Record<string, string> = {
      DEPOSITO: 'DEPOSIT',
      PRELIEVO: 'WITHDRAWAL',
      RICONCILIAZIONE: 'RECONCILIATION',
      ATTIVITA: 'ACTIVITY',
      TRASFERIMENTO: 'TRANSFER'
    };
    row.Operation =
      operations[row.Operation.toUpperCase()] ?? row.Operation.toUpperCase();
    row.Record ||= 'EVENT';
    if (!['META', 'EVENT'].includes(row.Record))
      throw new BadRequestException('Record must be META or EVENT.');
    for (const key of [
      'Note',
      'SourceAccountName',
      'Symbol',
      'ActivityName',
      'Reference'
    ] as const) {
      if (/^'[=+\-@\t\r\n]/.test(row[key])) row[key] = row[key].slice(1);
      else if (row[key].startsWith("''")) row[key] = row[key].slice(1);
    }
    return row;
  });
}

export function writeCashCsv(rows: Partial<CashCsvRow>[]): string {
  const safe = rows.map((row) =>
    Object.fromEntries(
      CASH_CSV_COLUMNS.map((key) => {
        let value = row[key] ?? '';
        if (
          [
            'Note',
            'SourceAccountName',
            'Symbol',
            'ActivityName',
            'Reference'
          ].includes(key) &&
          /^[=+\-@'\t\r\n]/.test(value)
        )
          value = "'" + value;
        return [key, value];
      })
    )
  );
  return (
    '\uFEFF' +
    unparse(safe, { columns: [...CASH_CSV_COLUMNS], newline: '\r\n' })
  );
}
