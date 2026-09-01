import { MCP_MAX_ACTIVITIES } from '@ghostfolio/common/config';

import { Type as ActivityType } from '@prisma/client';

import { IMPORT_ACTIVITIES_PARAMETERS } from './mcp.schemas';

function createActivity(overrides: Record<string, unknown> = {}) {
  return {
    currency: 'USD',
    date: '2024-01-01',
    fee: 0,
    quantity: 1,
    symbol: 'AAPL',
    type: ActivityType.BUY,
    unitPrice: 100,
    ...overrides
  };
}

describe('IMPORT_ACTIVITIES_PARAMETERS', () => {
  function parse(activities: unknown[]) {
    return IMPORT_ACTIVITIES_PARAMETERS.safeParse({ activities }).success;
  }

  it('Refuses a currency in lower case', () => {
    expect(parse([createActivity({ currency: 'usd' })])).toBe(false);
  });

  it('Accepts a currency in upper case', () => {
    expect(parse([createActivity({ currency: 'USD' })])).toBe(true);
  });

  it('Refuses a date at or before the epoch', () => {
    expect(parse([createActivity({ date: '0000-01-01' })])).toBe(false);
  });

  it('Refuses an empty symbol', () => {
    expect(parse([createActivity({ symbol: '' })])).toBe(false);
  });

  it('Refuses an empty identifier of an account', () => {
    expect(parse([createActivity({ accountId: '' })])).toBe(false);
  });

  it('Removes a tag, because the tool takes no tag', () => {
    expect(
      IMPORT_ACTIVITIES_PARAMETERS.parse({
        activities: [createActivity({ tags: ['tag-id'] })]
      }).activities[0]
    ).not.toHaveProperty('tags');
  });

  it(`Refuses more than ${MCP_MAX_ACTIVITIES} activities`, () => {
    expect(
      parse(
        Array.from({ length: MCP_MAX_ACTIVITIES + 1 }, () => {
          return createActivity();
        })
      )
    ).toBe(false);
  });
});
