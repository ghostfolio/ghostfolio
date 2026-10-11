import {
  MCP_MAX_ACTIVITIES,
  SEARCH_QUERY_MAXIMUM_LENGTH
} from '@ghostfolio/common/config';

import { isObject } from 'lodash-es';
import { z } from 'zod';

import { ACTIVITY_ROWS_OUTPUT, ROW_MATCHES_OUTPUT } from './ai.schemas';
import { createActivityRow } from './ai.test-utils';
import { ActivityRow } from './types/activity-row.type';

describe('ACTIVITY_ROWS_OUTPUT', () => {
  it('Accepts a row with null for the values which the file does not show', () => {
    expect(
      ACTIVITY_ROWS_OUTPUT.safeParse({
        rows: [
          createActivityRow({
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
    const row: Partial<ActivityRow> = createActivityRow();

    delete row.isin;

    expect(ACTIVITY_ROWS_OUTPUT.safeParse({ rows: [row] }).success).toBe(false);
  });

  it('Refuses a currency which is not an ISO 4217 code in upper case', () => {
    for (const currency of ['usd', 'USDOLLAR', '$']) {
      expect(
        ACTIVITY_ROWS_OUTPUT.safeParse({
          rows: [createActivityRow({ currency })]
        }).success
      ).toBe(false);
    }
  });

  it('Refuses a date which is not an ISO 8601 date after 1970', () => {
    for (const date of ['15.01.2026', '1969-12-31']) {
      expect(
        ACTIVITY_ROWS_OUTPUT.safeParse({ rows: [createActivityRow({ date })] })
          .success
      ).toBe(false);
    }
  });

  it('Refuses a negative fee, quantity or unit price', () => {
    for (const row of [{ fee: -1 }, { quantity: -1 }, { unitPrice: -1 }]) {
      expect(
        ACTIVITY_ROWS_OUTPUT.safeParse({ rows: [createActivityRow(row)] })
          .success
      ).toBe(false);
    }
  });

  it('Refuses a printed text which is longer than the maximum length', () => {
    expect(
      ACTIVITY_ROWS_OUTPUT.safeParse({
        rows: [
          createActivityRow({ name: 'A'.repeat(SEARCH_QUERY_MAXIMUM_LENGTH) })
        ]
      }).success
    ).toBe(true);

    expect(
      ACTIVITY_ROWS_OUTPUT.safeParse({
        rows: [
          createActivityRow({
            name: 'A'.repeat(SEARCH_QUERY_MAXIMUM_LENGTH + 1)
          })
        ]
      }).success
    ).toBe(false);
  });

  it('Trims a printed text', () => {
    const { data } = ACTIVITY_ROWS_OUTPUT.safeParse({
      rows: [createActivityRow({ name: '  Apple Inc. ' })]
    });

    expect(data.rows[0].name).toBe('Apple Inc.');
  });

  it(`Refuses more than ${MCP_MAX_ACTIVITIES} rows`, () => {
    expect(
      ACTIVITY_ROWS_OUTPUT.safeParse({
        rows: Array.from({ length: MCP_MAX_ACTIVITIES }, () => {
          return createActivityRow();
        })
      }).success
    ).toBe(true);

    expect(
      ACTIVITY_ROWS_OUTPUT.safeParse({
        rows: Array.from({ length: MCP_MAX_ACTIVITIES + 1 }, () => {
          return createActivityRow();
        })
      }).success
    ).toBe(false);
  });
});

describe.each([
  ['ACTIVITY_ROWS_OUTPUT', ACTIVITY_ROWS_OUTPUT],
  ['ROW_MATCHES_OUTPUT', ROW_MATCHES_OUTPUT]
])('%s', (_name, schema) => {
  it('Gives a JSON schema which the strict mode of the structured outputs supports', () => {
    // The options of the conversion in the AI SDK
    const jsonSchema = z.toJSONSchema(schema, {
      io: 'input',
      target: 'draft-7'
    });

    const objectJsonSchemas: { properties: object; required: string[] }[] = [];

    JSON.stringify(jsonSchema, (_key, value: unknown) => {
      if (isObject(value) && 'properties' in value) {
        objectJsonSchemas.push(
          value as { properties: object; required: string[] }
        );
      }

      return value;
    });

    expect(objectJsonSchemas.length).toBeGreaterThan(1);

    for (const { properties, required } of objectJsonSchemas) {
      expect([...required].sort()).toEqual(Object.keys(properties).sort());
    }

    expect(JSON.stringify(jsonSchema)).not.toMatch(/"(max|min)Length"/);
  });
});
