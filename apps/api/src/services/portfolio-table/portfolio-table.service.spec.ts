import type { PortfolioService } from '@ghostfolio/api/app/portfolio/portfolio.service';
import type { TableParameters } from '@ghostfolio/api/helper/interfaces/table-parameters.interface';
import type { I18nService } from '@ghostfolio/api/services/i18n/i18n.service';
import {
  DEFAULT_LANGUAGE_CODE,
  TAG_ID_EXCLUDE_FROM_ANALYSIS
} from '@ghostfolio/common/config';
import { PortfolioPosition } from '@ghostfolio/common/interfaces';
import { AccountWithValue } from '@ghostfolio/common/types';

import { AssetClass, AssetSubClass } from '@prisma/client';

import { PortfolioTableService } from './portfolio-table.service';

/**
 * The markdown table is rendered by a package which ships as an ECMAScript
 * module only, which Jest cannot run. The mock keeps the mapping of the
 * columns and of the rows and writes them in the same shape as the renderer
 */
jest.mock('@ghostfolio/api/helper/markdown-table.helper', () => {
  const { getTableInput } = jest.requireActual<
    typeof import('@ghostfolio/api/helper/markdown-table.helper')
  >('@ghostfolio/api/helper/markdown-table.helper');

  return {
    getTableInput,
    getMarkdownTable: jest.fn(
      (parameters: TableParameters<unknown, unknown>) => {
        const { columns, rows } = getTableInput(parameters);

        const names = columns.map(({ name }) => {
          return name;
        });

        return Promise.resolve(
          [
            names,
            names.map(() => {
              return '---';
            }),
            ...rows.map((row) => {
              return names.map((name) => {
                return row[name];
              });
            })
          ]
            .map((cells) => {
              return `| ${cells.join(' | ')} |`;
            })
            .join('\n')
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

function createHolding({
  allocationInPercentage = 0.75,
  assetClass = AssetClass.EQUITY,
  assetSubClass = AssetSubClass.STOCK,
  symbol = 'AAPL'
}: {
  allocationInPercentage?: number;
  assetClass?: AssetClass;
  assetSubClass?: AssetSubClass;
  symbol?: string;
} = {}) {
  return {
    allocationInPercentage,
    activitiesCount: 3,
    assetProfile: {
      assetClass,
      assetSubClass,
      symbol,
      currency: 'CHF',
      name: `Name of ${symbol}`
    },
    dateOfFirstActivity: new Date('2024-01-01'),
    grossPerformance: 100,
    netPerformance: 90,
    quantity: 5,
    valueInBaseCurrency: 2000
  } as unknown as PortfolioPosition;
}

function createPortfolioTableService({
  accounts = [],
  holdings = []
}: {
  accounts?: AccountWithValue[];
  holdings?: PortfolioPosition[];
} = {}) {
  // The mock gives the identifier of the translation, so that a test can tell
  // the translation of the asset class from that of the asset sub class
  const i18nService = {
    getTranslation: jest.fn(({ id }: { id: string }) => {
      return `translation of ${id}`;
    })
  } as unknown as I18nService;

  const portfolioService = {
    getAccountsWithAggregations: jest.fn().mockResolvedValue({ accounts }),
    getDetails: jest.fn().mockResolvedValue({ holdings })
  } as unknown as PortfolioService;

  return new PortfolioTableService(null, i18nService, portfolioService);
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
      const portfolioTableService = createPortfolioTableService({
        accounts: [createAccount()]
      });

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
      const portfolioTableService = createPortfolioTableService({
        accounts: [createAccount()]
      });

      const result = await portfolioTableService.getAccountsTable({
        userId: 'user-id'
      });

      expect(result).toContain('account-a-id');
    });

    it('marks an account which is excluded from the analysis', async () => {
      const portfolioTableService = createPortfolioTableService({
        accounts: [
          createAccount({ isExcluded: true }),
          createAccount({ id: 'account-b-id', name: 'Account B' })
        ]
      });

      const result = await portfolioTableService.getAccountsTable({
        userId: 'user-id'
      });

      const [rowOfAccountA, rowOfAccountB] = result
        .split('\n')
        .filter((line) => {
          return line.startsWith('| account-');
        });

      expect(rowOfAccountA).toContain('true');
      expect(rowOfAccountB).toContain('false');
    });

    it('tells that no accounts are found if the result is empty', async () => {
      const portfolioTableService = createPortfolioTableService();

      const result = await portfolioTableService.getAccountsTable({
        userId: 'user-id'
      });

      expect(result).toContain('No accounts found.');
    });
  });
  describe('getHoldingsTable', () => {
    function getHoldingsTable(holdings: PortfolioPosition[]) {
      return createPortfolioTableService({ holdings }).getHoldingsTable({
        languageCode: DEFAULT_LANGUAGE_CODE,
        userId: 'user-id'
      });
    }

    it('gives the translation of the asset class and of the asset sub class', async () => {
      const result = await getHoldingsTable([createHolding()]);

      const [row] = result.split('\n').filter((line) => {
        return line.startsWith('| Name of AAPL');
      });

      expect(row).toContain('translation of assetClass.EQUITY');
      expect(row).toContain('translation of assetSubClass.STOCK');
    });

    it('gives the holding with the largest allocation first', async () => {
      const result = await getHoldingsTable([
        createHolding({ allocationInPercentage: 0.25, symbol: 'MSFT' }),
        createHolding({ allocationInPercentage: 0.75, symbol: 'AAPL' })
      ]);

      const [firstRow, secondRow] = result.split('\n').filter((line) => {
        return line.startsWith('| Name of');
      });

      expect(firstRow).toContain('AAPL');
      expect(secondRow).toContain('MSFT');
    });
  });
});
