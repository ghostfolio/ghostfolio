import type { PortfolioService } from '@ghostfolio/api/app/portfolio/portfolio.service';
import { TAG_ID_EXCLUDE_FROM_ANALYSIS } from '@ghostfolio/common/config';
import { AccountWithValue } from '@ghostfolio/common/types';

import { PortfolioTableService } from './portfolio-table.service';

/**
 * The markdown table is rendered by a package which ships as an ECMAScript
 * module only, which Jest cannot run. The mock renders the columns and the
 * rows in a simple form, so that the tests can read them.
 */
jest.mock('@ghostfolio/api/helper/markdown-table.helper', () => {
  return {
    getMarkdownTable: jest.fn(
      ({
        columnDefinitions,
        rows
      }: {
        columnDefinitions: {
          getValue: (row: unknown) => string;
          name: string;
        }[];
        rows: unknown[];
      }) => {
        return Promise.resolve(
          [
            columnDefinitions
              .map(({ name }) => {
                return name;
              })
              .join(' | '),
            ...rows.map((row) => {
              return columnDefinitions
                .map(({ getValue }) => {
                  return getValue(row);
                })
                .join(' | ');
            })
          ].join('\n')
        );
      }
    )
  };
});

function createAccount({
  id = 'account-a-id',
  isExcluded = false,
  name = 'Account A'
}: {
  id?: string;
  isExcluded?: boolean;
  name?: string;
} = {}) {
  return {
    id,
    name,
    activitiesCount: 3,
    allocationInPercentage: 0.25,
    balance: 1000,
    currency: 'CHF',
    platform: { name: 'Platform A' },
    tags: isExcluded ? [{ id: TAG_ID_EXCLUDE_FROM_ANALYSIS }] : [],
    value: 2000
  } as unknown as AccountWithValue;
}

function createPortfolioTableService(accounts: AccountWithValue[]) {
  const portfolioService = {
    getAccountsWithAggregations: jest.fn().mockResolvedValue({ accounts })
  } as unknown as PortfolioService;

  return new PortfolioTableService(null, null, portfolioService);
}

describe('PortfolioTableService', () => {
  // The tools of the model context protocol are the only callers, and an
  // access of that type never grants the scope to read the monetary values,
  // hence no table has a column with such a value
  describe('getAccountsTableColumnNames', () => {
    it('gives no column with a monetary value', () => {
      expect(PortfolioTableService.getAccountsTableColumnNames()).toEqual([
        'Id',
        'Name',
        'Currency',
        'Platform',
        'Activities Count',
        'Allocation in Percentage',
        'Excluded from Analysis'
      ]);
    });
  });

  describe('getActivitiesTableColumnNames', () => {
    it('gives no column with a monetary value', () => {
      expect(PortfolioTableService.getActivitiesTableColumnNames()).toEqual([
        'Date',
        'Type',
        'Name',
        'Symbol',
        'Currency',
        'Unit Price',
        'Account'
      ]);
    });
  });

  describe('getHoldingsTableColumnNames', () => {
    it('gives no column with a monetary value', () => {
      expect(PortfolioTableService.getHoldingsTableColumnNames()).toEqual([
        'Name',
        'Symbol',
        'Currency',
        'Asset Class',
        'Asset Sub Class',
        'Date of First Activity',
        'Activities Count',
        'Allocation in Percentage'
      ]);
    });
  });

  describe('getAccountsTable', () => {
    it('gives no cash balance and no value of an account', async () => {
      const portfolioTableService = createPortfolioTableService([
        createAccount()
      ]);

      const result = await portfolioTableService.getAccountsTable({
        userId: 'user-id'
      });

      expect(result).not.toContain('Cash Balance');
      expect(result).not.toContain('1000');
      expect(result).not.toContain('2000');
    });

    // The accountIds parameter of the tool takes the identifiers, hence the
    // table has to give them
    it('gives the identifier of an account', async () => {
      const portfolioTableService = createPortfolioTableService([
        createAccount()
      ]);

      const result = await portfolioTableService.getAccountsTable({
        userId: 'user-id'
      });

      expect(result).toContain('account-a-id');
    });

    it('marks an account which is excluded from the analysis', async () => {
      const portfolioTableService = createPortfolioTableService([
        createAccount({ isExcluded: true }),
        createAccount({ id: 'account-b-id', name: 'Account B' })
      ]);

      const result = await portfolioTableService.getAccountsTable({
        userId: 'user-id'
      });

      const [rowOfAccountA, rowOfAccountB] = result
        .split('\n')
        .filter((line) => {
          return line.startsWith('account-');
        });

      expect(rowOfAccountA).toContain('true');
      expect(rowOfAccountB).toContain('false');
    });

    it('tells that no accounts are found if the result is empty', async () => {
      const portfolioTableService = createPortfolioTableService([]);

      const result = await portfolioTableService.getAccountsTable({
        userId: 'user-id'
      });

      expect(result).toContain('No accounts found.');
    });
  });
});
