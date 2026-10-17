import {
  AI_MAX_ACTIVITIES,
  SEARCH_QUERY_MAXIMUM_LENGTH
} from '@ghostfolio/common/config';

import { isObject } from 'lodash-es';
import { z } from 'zod';

import { ACTIVITY_ROWS_OUTPUT, ROW_MATCHES_OUTPUT } from './ai.schemas';
import { createActivityRow } from './ai.test-utils';
import type { ActivityRow } from './types/activity-row.type';

describe('ACTIVITY_ROWS_OUTPUT', () => {
  it('Accepts a row with null for the values which the file does not show', () => {
    expect(
      ACTIVITY_ROWS_OUTPUT.safeParse({
        broker: null,
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

    expect(
      ACTIVITY_ROWS_OUTPUT.safeParse({ broker: null, rows: [row] }).success
    ).toBe(false);
  });

  it('Accepts a currency, a date, a number, a printed text and a number of rows which the join checks, so that one value does not refuse all rows', () => {
    expect(
      ACTIVITY_ROWS_OUTPUT.safeParse({
        broker: null,
        rows: [
          createActivityRow({
            currency: 'GBX',
            date: '15.01.2026',
            name: 'A'.repeat(SEARCH_QUERY_MAXIMUM_LENGTH + 1)
          }),
          createActivityRow({ fee: -1, quantity: -1, unitPrice: -1 }),
          ...Array.from({ length: AI_MAX_ACTIVITIES }, () => {
            return createActivityRow();
          })
        ]
      }).success
    ).toBe(true);
  });

  it('Trims a printed text', () => {
    const { data } = ACTIVITY_ROWS_OUTPUT.safeParse({
      broker: ' Swissquote ',
      rows: [createActivityRow({ name: '  Apple Inc. ' })]
    });

    expect(data.broker).toBe('Swissquote');
    expect(data.rows[0].name).toBe('Apple Inc.');
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

    expect(JSON.stringify(jsonSchema)).not.toMatch(/"(max|min)(imum|Length)"/);
  });
});
