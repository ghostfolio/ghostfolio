import { encodeDataSource } from '@ghostfolio/api/helper/data-source.helper';
import {
  COMMENT_MAXIMUM_LENGTH,
  DEFAULT_DATE_RANGE,
  MCP_MAX_ACTIVITIES,
  SEARCH_QUERY_MAXIMUM_LENGTH,
  SEARCH_QUERY_MINIMUM_LENGTH,
  SYMBOL_MAXIMUM_LENGTH
} from '@ghostfolio/common/config';
import { DataSource } from '@ghostfolio/prisma/enums';

import {
  GET_ACCOUNTS_PARAMETERS,
  GET_ACTIVITIES_PARAMETERS,
  GET_PERFORMANCE_PARAMETERS,
  IMPORT_ACTIVITIES_PARAMETERS,
  SEARCH_ASSET_PROFILES_PARAMETERS
} from './mcp.schemas';
import { createActivity } from './mcp.test-utils';

const UNKNOWN_ENCODED_DATA_SOURCE = 'ffffffff';

describe('GET_ACCOUNTS_PARAMETERS', () => {
  it('Refuses an empty symbol of the holding', () => {
    expect(
      GET_ACCOUNTS_PARAMETERS.safeParse({
        holding: { dataSource: DataSource.YAHOO, symbol: '' }
      }).success
    ).toBe(false);
  });

  it('Refuses a symbol of the holding that contains only spaces', () => {
    expect(
      GET_ACCOUNTS_PARAMETERS.safeParse({
        holding: { dataSource: DataSource.YAHOO, symbol: '  ' }
      }).success
    ).toBe(false);
  });

  it('Accepts an encoded data source of the holding', () => {
    expect(
      GET_ACCOUNTS_PARAMETERS.safeParse({
        holding: {
          dataSource: encodeDataSource(DataSource.YAHOO),
          symbol: 'AAPL'
        }
      }).success
    ).toBe(true);
  });

  it('Refuses an unknown encoded data source of the holding', () => {
    expect(
      GET_ACCOUNTS_PARAMETERS.safeParse({
        holding: { dataSource: UNKNOWN_ENCODED_DATA_SOURCE, symbol: 'AAPL' }
      }).success
    ).toBe(false);
  });

  it('Gives the valid data sources in the error of an unknown data source of the holding', () => {
    for (const dataSource of ['yahoo', 1]) {
      const { error } = GET_ACCOUNTS_PARAMETERS.safeParse({
        holding: { dataSource, symbol: 'AAPL' }
      });

      expect(error.issues).toEqual([
        expect.objectContaining({
          message: expect.stringContaining(`|${DataSource.YAHOO}`),
          path: ['holding', 'dataSource']
        })
      ]);
    }
  });
});

describe('GET_ACTIVITIES_PARAMETERS', () => {
  it('Refuses an empty symbol of the holding', () => {
    expect(
      GET_ACTIVITIES_PARAMETERS.safeParse({
        holding: { dataSource: DataSource.YAHOO, symbol: '' }
      }).success
    ).toBe(false);
  });

  it('Refuses a symbol of the holding that contains only spaces', () => {
    expect(
      GET_ACTIVITIES_PARAMETERS.safeParse({
        holding: { dataSource: DataSource.YAHOO, symbol: '  ' }
      }).success
    ).toBe(false);
  });

  it('Accepts an encoded data source of the holding', () => {
    expect(
      GET_ACTIVITIES_PARAMETERS.safeParse({
        holding: {
          dataSource: encodeDataSource(DataSource.YAHOO),
          symbol: 'AAPL'
        }
      }).success
    ).toBe(true);
  });

  it('Refuses an unknown encoded data source of the holding', () => {
    expect(
      GET_ACTIVITIES_PARAMETERS.safeParse({
        holding: { dataSource: UNKNOWN_ENCODED_DATA_SOURCE, symbol: 'AAPL' }
      }).success
    ).toBe(false);
  });
});

describe('GET_PERFORMANCE_PARAMETERS', () => {
  it(`Gives the date range ${DEFAULT_DATE_RANGE} if the range is absent`, () => {
    expect(GET_PERFORMANCE_PARAMETERS.parse({}).range).toBe(DEFAULT_DATE_RANGE);
  });

  it('Accepts a calendar year', () => {
    expect(
      GET_PERFORMANCE_PARAMETERS.safeParse({ range: '2024' }).success
    ).toBe(true);
  });

  it('Refuses an unknown date range', () => {
    expect(GET_PERFORMANCE_PARAMETERS.safeParse({ range: '2w' }).success).toBe(
      false
    );
  });

  it('Refuses an empty symbol of the holding', () => {
    expect(
      GET_PERFORMANCE_PARAMETERS.safeParse({
        holding: { dataSource: DataSource.YAHOO, symbol: '' }
      }).success
    ).toBe(false);
  });

  it('Refuses a symbol of the holding that contains only spaces', () => {
    expect(
      GET_PERFORMANCE_PARAMETERS.safeParse({
        holding: { dataSource: DataSource.YAHOO, symbol: '  ' }
      }).success
    ).toBe(false);
  });

  it('Accepts an encoded data source of the holding', () => {
    expect(
      GET_PERFORMANCE_PARAMETERS.safeParse({
        holding: {
          dataSource: encodeDataSource(DataSource.YAHOO),
          symbol: 'AAPL'
        }
      }).success
    ).toBe(true);
  });

  it('Refuses an unknown encoded data source of the holding', () => {
    expect(
      GET_PERFORMANCE_PARAMETERS.safeParse({
        holding: { dataSource: UNKNOWN_ENCODED_DATA_SOURCE, symbol: 'AAPL' }
      }).success
    ).toBe(false);
  });
});

describe('IMPORT_ACTIVITIES_PARAMETERS', () => {
  function parse(activities: unknown[]) {
    return IMPORT_ACTIVITIES_PARAMETERS.safeParse({ activities }).success;
  }

  it(`Accepts a comment of ${COMMENT_MAXIMUM_LENGTH} characters with spaces at the start and the end`, () => {
    expect(
      parse([
        createActivity({ comment: ` ${'A'.repeat(COMMENT_MAXIMUM_LENGTH)} ` })
      ])
    ).toBe(true);
  });

  it(`Refuses a comment longer than ${COMMENT_MAXIMUM_LENGTH} characters`, () => {
    expect(
      parse([
        createActivity({ comment: 'A'.repeat(COMMENT_MAXIMUM_LENGTH + 1) })
      ])
    ).toBe(false);
  });

  it('Removes spaces at the start and the end of a comment', () => {
    expect(
      IMPORT_ACTIVITIES_PARAMETERS.parse({
        activities: [createActivity({ comment: ' note ' })]
      }).activities[0].comment
    ).toBe('note');
  });

  it('Refuses a currency in lower case', () => {
    expect(parse([createActivity({ currency: 'usd' })])).toBe(false);
  });

  it('Accepts a currency in upper case', () => {
    expect(parse([createActivity({ currency: 'USD' })])).toBe(true);
  });

  it('Accepts an encoded data source', () => {
    expect(
      parse([
        createActivity({ dataSource: encodeDataSource(DataSource.YAHOO) })
      ])
    ).toBe(true);
  });

  it('Refuses an unknown encoded data source', () => {
    expect(
      parse([createActivity({ dataSource: UNKNOWN_ENCODED_DATA_SOURCE })])
    ).toBe(false);
  });

  it('Refuses a date at or before the epoch', () => {
    expect(parse([createActivity({ date: '0000-01-01' })])).toBe(false);
  });

  it('Refuses an empty symbol', () => {
    expect(parse([createActivity({ symbol: '' })])).toBe(false);
  });

  it('Refuses a symbol that contains only spaces', () => {
    expect(parse([createActivity({ symbol: '  ' })])).toBe(false);
  });

  it(`Accepts a symbol of ${SYMBOL_MAXIMUM_LENGTH} characters`, () => {
    expect(
      parse([createActivity({ symbol: 'A'.repeat(SYMBOL_MAXIMUM_LENGTH) })])
    ).toBe(true);
  });

  it(`Accepts a symbol of ${SYMBOL_MAXIMUM_LENGTH} characters with spaces at the start and the end`, () => {
    expect(
      parse([
        createActivity({ symbol: ` ${'A'.repeat(SYMBOL_MAXIMUM_LENGTH)} ` })
      ])
    ).toBe(true);
  });

  it(`Refuses a symbol longer than ${SYMBOL_MAXIMUM_LENGTH} characters`, () => {
    expect(
      parse([createActivity({ symbol: 'A'.repeat(SYMBOL_MAXIMUM_LENGTH + 1) })])
    ).toBe(false);
  });

  it('Removes spaces at the start and the end of a symbol', () => {
    expect(
      IMPORT_ACTIVITIES_PARAMETERS.parse({
        activities: [createActivity({ symbol: ' AAPL ' })]
      }).activities[0].symbol
    ).toBe('AAPL');
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
