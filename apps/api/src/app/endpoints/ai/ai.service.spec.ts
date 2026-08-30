import type { PortfolioService } from '@ghostfolio/api/app/portfolio/portfolio.service';
import { TAG_ID_EXCLUDE_FROM_ANALYSIS } from '@ghostfolio/common/config';
import { AccountWithValue } from '@ghostfolio/common/types';

import { AiService } from './ai.service';

// The service imports two packages which ship as an ECMAScript module only,
// which Jest cannot transform. The mocks only make the imports resolvable,
// because no test calls them.
jest.mock('@openrouter/ai-sdk-provider', () => {
  return { createOpenRouter: jest.fn() };
});

jest.mock('ai', () => {
  return { generateText: jest.fn() };
});

/**
 * The markdown table is rendered by a package which ships as an ECMAScript
 * module only, hence the service loads it with a dynamic import which Jest
 * cannot run. The tests replace the method by a simple renderer, so that they
 * can read the columns and the rows which the service gives to it.
 */
interface AiServiceWithMarkdownTable {
  getMarkdownTable(parameters: {
    columnDefinitions: readonly { name: string }[];
    rows: Record<string, string>[];
  }): Promise<string>;
}

function createAccount({
  isExcluded = false,
  name = 'Account A'
}: {
  isExcluded?: boolean;
  name?: string;
} = {}) {
  return {
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

function createAiService(accounts: AccountWithValue[]) {
  const portfolioService = {
    getAccountsWithAggregations: jest.fn().mockResolvedValue({ accounts })
  } as unknown as PortfolioService;

  const aiService = new AiService(null, null, null, portfolioService, null);

  jest
    .spyOn(
      aiService as unknown as AiServiceWithMarkdownTable,
      'getMarkdownTable'
    )
    .mockImplementation(async ({ columnDefinitions, rows }) => {
      const columnNames = columnDefinitions.map(({ name }) => {
        return name;
      });

      return [
        columnNames.join(' | '),
        ...rows.map((row) => {
          return columnNames
            .map((columnName) => {
              return row[columnName];
            })
            .join(' | ');
        })
      ].join('\n');
    });

  return aiService;
}

describe('AiService', () => {
  // The tools of the model context protocol are the only callers, and an
  // access of that type never grants the scope to read the monetary values,
  // hence no table has a column with such a value
  describe('getAccountsTableColumnNames', () => {
    it('gives no column with a monetary value', () => {
      expect(AiService.getAccountsTableColumnNames()).toEqual([
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
      expect(AiService.getActivitiesTableColumnNames()).toEqual([
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

  describe('getAccountsTable', () => {
    it('gives no cash balance and no value of an account', async () => {
      const aiService = createAiService([createAccount()]);

      const result = await aiService.getAccountsTable({ userId: 'user-id' });

      expect(result).not.toContain('Cash Balance');
      expect(result).not.toContain('1000');
      expect(result).not.toContain('2000');
    });

    it('marks an account which is excluded from the analysis', async () => {
      const aiService = createAiService([
        createAccount({ isExcluded: true }),
        createAccount({ name: 'Account B' })
      ]);

      const result = await aiService.getAccountsTable({ userId: 'user-id' });

      const [rowOfAccountA, rowOfAccountB] = result
        .split('\n')
        .filter((line) => {
          return line.startsWith('Account ');
        });

      expect(rowOfAccountA).toContain('true');
      expect(rowOfAccountB).toContain('false');
    });

    it('tells that no accounts are found if the result is empty', async () => {
      const aiService = createAiService([]);

      const result = await aiService.getAccountsTable({ userId: 'user-id' });

      expect(result).toContain('No accounts found.');
    });
  });
});
