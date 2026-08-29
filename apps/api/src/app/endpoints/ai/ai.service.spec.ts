import { AiService } from './ai.service';

// The service imports two packages which ship as an ECMAScript module only,
// which Jest cannot transform. The tests use a static method which does not
// call them, hence the mocks only make the imports resolvable.
jest.mock('@openrouter/ai-sdk-provider', () => {
  return { createOpenRouter: jest.fn() };
});

jest.mock('ai', () => {
  return { generateText: jest.fn() };
});

describe('AiService', () => {
  describe('getAccountsTableColumnNames', () => {
    it('omits the columns with a monetary value if the access does not grant to read them', () => {
      const result = AiService.getAccountsTableColumnNames({
        withValues: false
      });

      expect(result).toEqual([
        'Name',
        'Currency',
        'Platform',
        'Activities Count',
        'Allocation in Percentage'
      ]);
    });

    it('gives the columns with a monetary value if the access grants to read them', () => {
      const result = AiService.getAccountsTableColumnNames({
        withValues: true
      });

      expect(result).toEqual([
        'Name',
        'Currency',
        'Platform',
        'Activities Count',
        'Cash Balance',
        'Value',
        'Allocation in Percentage'
      ]);
    });
  });
});
