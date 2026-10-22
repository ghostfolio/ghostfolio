import { ExportService } from './export.service';

describe('ExportService', () => {
  it('exports the tax amount of an activity', async () => {
    const accountService = {
      accounts: jest.fn().mockResolvedValue([])
    };

    const activitiesService = {
      getActivities: jest.fn().mockResolvedValue({
        activities: [
          {
            accountId: null,
            assetProfile: {
              currency: 'USD',
              dataSource: 'YAHOO',
              symbol: 'MSFT',
              userId: 'another-user'
            },
            comment: null,
            currency: 'USD',
            date: new Date('2024-05-15T00:00:00.000Z'),
            fee: 1,
            id: 'activity-1',
            quantity: 2,
            tax: 7.5,
            tags: [],
            type: 'BUY',
            unitPrice: 100
          }
        ]
      })
    };

    const marketDataService = {
      marketDataItems: jest.fn()
    };

    const tagService = {
      getTagsForUser: jest.fn().mockResolvedValue([])
    };

    const exportService = new ExportService(
      accountService as never,
      activitiesService as never,
      marketDataService as never,
      tagService as never
    );

    const result = await exportService.export({
      userId: 'user-1',
      userSettings: {
        baseCurrency: 'USD'
      } as never
    });

    expect(result.activities).toHaveLength(1);
    expect(result.activities[0]).toMatchObject({
      fee: 1,
      tax: 7.5
    });
  });
});
