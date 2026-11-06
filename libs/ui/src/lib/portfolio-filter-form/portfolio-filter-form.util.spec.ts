import { Filter, PortfolioPosition } from '@ghostfolio/common/interfaces';

import {
  getFiltersFromPortfolioFilterFormValue,
  getPortfolioFilterFormValue
} from './portfolio-filter-form.util';

describe('PortfolioFilterFormUtil', () => {
  const holding = {
    assetProfile: {
      dataSource: 'YAHOO',
      name: 'Apple Inc.',
      symbol: 'AAPL'
    }
  } as PortfolioPosition;

  describe('getFiltersFromPortfolioFilterFormValue', () => {
    it('should return one filter per selected account, asset class and tag', () => {
      expect(
        getFiltersFromPortfolioFilterFormValue({
          holding,
          accounts: ['account-1', 'account-2'],
          assetClasses: ['EQUITY', 'FIXED_INCOME'],
          tags: ['tag-1', 'tag-2']
        })
      ).toEqual([
        { id: 'account-1', type: 'ACCOUNT' },
        { id: 'account-2', type: 'ACCOUNT' },
        { id: 'EQUITY', type: 'ASSET_CLASS' },
        { id: 'FIXED_INCOME', type: 'ASSET_CLASS' },
        { id: 'YAHOO', type: 'DATA_SOURCE' },
        { id: 'AAPL', type: 'SYMBOL' },
        { id: 'tag-1', type: 'TAG' },
        { id: 'tag-2', type: 'TAG' }
      ]);
    });

    it('should return no filters for an empty value', () => {
      expect(
        getFiltersFromPortfolioFilterFormValue({
          accounts: [],
          assetClasses: [],
          holding: null,
          tags: []
        })
      ).toEqual([]);

      expect(getFiltersFromPortfolioFilterFormValue(null)).toEqual([]);
    });

    it('should return an empty filter per type if includeEmpty is set', () => {
      expect(
        getFiltersFromPortfolioFilterFormValue(
          {
            accounts: ['account-1'],
            assetClasses: [],
            holding: null,
            tags: []
          },
          { includeEmpty: true }
        )
      ).toEqual([
        { id: 'account-1', type: 'ACCOUNT' },
        { id: '', type: 'ASSET_CLASS' },
        { id: '', type: 'DATA_SOURCE' },
        { id: '', type: 'SYMBOL' },
        { id: '', type: 'TAG' }
      ]);
    });
  });

  describe('getPortfolioFilterFormValue', () => {
    it('should collect all ids of accounts, asset classes and tags', () => {
      const filters: Filter[] = [
        { id: 'account-1', type: 'ACCOUNT' },
        { id: 'account-2', type: 'ACCOUNT' },
        { id: 'EQUITY', type: 'ASSET_CLASS' },
        { id: 'YAHOO', type: 'DATA_SOURCE' },
        { id: 'AAPL', type: 'SYMBOL' },
        { id: 'tag-1', type: 'TAG' },
        { id: 'tag-2', type: 'TAG' }
      ];

      expect(getPortfolioFilterFormValue(filters, [holding])).toEqual({
        holding,
        accounts: ['account-1', 'account-2'],
        assetClasses: ['EQUITY'],
        tags: ['tag-1', 'tag-2']
      });
    });

    it('should return an empty value without filters', () => {
      expect(getPortfolioFilterFormValue([], [holding])).toEqual({
        accounts: [],
        assetClasses: [],
        holding: null,
        tags: []
      });
    });
  });
});
