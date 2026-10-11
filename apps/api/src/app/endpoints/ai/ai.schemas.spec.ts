import {
  MCP_MAX_ACTIVITIES,
  SEARCH_QUERY_MAXIMUM_LENGTH
} from '@ghostfolio/common/config';

import { Type as ActivityType } from '@prisma/client';
import { z } from 'zod';

import { ACTIVITY_ROWS_OUTPUT } from './ai.schemas';
import { ActivityRow } from './types/activity-row.type';

function createRow(row: Partial<ActivityRow> = {}): ActivityRow {
  return {
    accountName: 'Brokerage',
    currency: 'USD',
    date: '2026-01-15',
    fee: 1,
    isin: 'US0378331005',
    name: 'Apple Inc.',
    quantity: 10,
    symbol: 'AAPL',
    type: ActivityType.BUY,
    unitPrice: 230,
    ...row
  };
}

describe('ACTIVITY_ROWS_OUTPUT', () => {
  it('Accepts a row with null for the values which the file does not show', () => {
    expect(
      ACTIVITY_ROWS_OUTPUT.safeParse({
        rows: [
          createRow({
            accountName: null,
            currency: null,
            isin: null,
            symbol: null
          })
        ]
      }).success
    ).toBe(true);
  });

  it('Refuses a row with a value which is left out instead of null', () => {
    const row: Partial<ActivityRow> = createRow();

    delete row.isin;

    expect(ACTIVITY_ROWS_OUTPUT.safeParse({ rows: [row] }).success).toBe(false);
  });

  it('Refuses a currency which is not an ISO 4217 code in upper case', () => {
    for (const currency of ['usd', 'USDOLLAR', '$']) {
      expect(
        ACTIVITY_ROWS_OUTPUT.safeParse({ rows: [createRow({ currency })] })
          .success
      ).toBe(false);
    }
  });

  it('Refuses a date which is not an ISO 8601 date after 1970', () => {
    for (const date of ['15.01.2026', '1969-12-31']) {
      expect(
        ACTIVITY_ROWS_OUTPUT.safeParse({ rows: [createRow({ date })] }).success
      ).toBe(false);
    }
  });

  it('Refuses a negative fee, quantity or unit price', () => {
    for (const row of [{ fee: -1 }, { quantity: -1 }, { unitPrice: -1 }]) {
      expect(
        ACTIVITY_ROWS_OUTPUT.safeParse({ rows: [createRow(row)] }).success
      ).toBe(false);
    }
  });

  it('Refuses a printed text which is longer than the maximum length', () => {
    expect(
      ACTIVITY_ROWS_OUTPUT.safeParse({
        rows: [createRow({ name: 'A'.repeat(SEARCH_QUERY_MAXIMUM_LENGTH) })]
      }).success
    ).toBe(true);

    expect(
      ACTIVITY_ROWS_OUTPUT.safeParse({
        rows: [createRow({ name: 'A'.repeat(SEARCH_QUERY_MAXIMUM_LENGTH + 1) })]
      }).success
    ).toBe(false);
  });

  it('Trims a printed text', () => {
    const { data } = ACTIVITY_ROWS_OUTPUT.safeParse({
      rows: [createRow({ name: '  Apple Inc. ' })]
    });

    expect(data.rows[0].name).toBe('Apple Inc.');
  });

  it(`Refuses more than ${MCP_MAX_ACTIVITIES} rows`, () => {
    expect(
      ACTIVITY_ROWS_OUTPUT.safeParse({
        rows: Array.from({ length: MCP_MAX_ACTIVITIES }, () => {
          return createRow();
        })
      }).success
    ).toBe(true);

    expect(
      ACTIVITY_ROWS_OUTPUT.safeParse({
        rows: Array.from({ length: MCP_MAX_ACTIVITIES + 1 }, () => {
          return createRow();
        })
      }).success
    ).toBe(false);
  });

  it('Gives a JSON schema which the strict mode of the structured outputs supports', () => {
    // The options of the conversion in the AI SDK
    const jsonSchema = z.toJSONSchema(ACTIVITY_ROWS_OUTPUT, {
      io: 'input',
      target: 'draft-7'
    });

    const rowJsonSchema = (
      jsonSchema.properties.rows as {
        items: { properties: object; required: string[] };
      }
    ).items;

    expect([...rowJsonSchema.required].sort()).toEqual(
      Object.keys(rowJsonSchema.properties).sort()
    );

    expect(JSON.stringify(jsonSchema)).not.toMatch(/"(max|min)Length"/);
  });
});
