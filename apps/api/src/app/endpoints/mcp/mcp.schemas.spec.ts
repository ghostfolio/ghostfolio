import {
  MCP_MAX_ACTIVITIES,
  SEARCH_QUERY_MAXIMUM_LENGTH,
  SEARCH_QUERY_MINIMUM_LENGTH
} from '@ghostfolio/common/config';

import {
  IMPORT_ACTIVITIES_PARAMETERS,
  SEARCH_ASSET_PROFILES_PARAMETERS
} from './mcp.schemas';
import { createActivity } from './mcp.test-utils';

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
        activities: [{ ...createActivity(), tags: ['tag-id'] }]
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

describe('SEARCH_ASSET_PROFILES_PARAMETERS', () => {
  it('Refuses a query that contains only spaces', () => {
    expect(
      SEARCH_ASSET_PROFILES_PARAMETERS.safeParse({ query: '  ' }).success
    ).toBe(false);
  });

  it(`Refuses a query shorter than ${SEARCH_QUERY_MINIMUM_LENGTH} characters`, () => {
    expect(
      SEARCH_ASSET_PROFILES_PARAMETERS.safeParse({ query: 'A' }).success
    ).toBe(false);
  });

  it(`Refuses a query longer than ${SEARCH_QUERY_MAXIMUM_LENGTH} characters`, () => {
    expect(
      SEARCH_ASSET_PROFILES_PARAMETERS.safeParse({
        query: 'A'.repeat(SEARCH_QUERY_MAXIMUM_LENGTH + 1)
      }).success
    ).toBe(false);
  });

  it('Accepts a name, symbol or ISIN', () => {
    for (const query of ['Apple', 'AAPL', 'US0378331005']) {
      expect(
        SEARCH_ASSET_PROFILES_PARAMETERS.safeParse({ query }).success
      ).toBe(true);
    }
  });

  it('Removes spaces at the start and the end of a query', () => {
    expect(
      SEARCH_ASSET_PROFILES_PARAMETERS.parse({ query: ' Apple ' }).query
    ).toBe('Apple');
  });
});
