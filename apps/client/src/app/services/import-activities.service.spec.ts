import { ImportActivitiesService } from './import-activities.service';

jest.mock('uuid', () => ({
  v4: jest.fn(() => '00000000-0000-4000-8000-000000000000')
}));

describe('ImportActivitiesService', () => {
  let importActivitiesService: ImportActivitiesService;

  beforeEach(() => {
    importActivitiesService = Object.create(
      ImportActivitiesService.prototype
    ) as ImportActivitiesService;

    jest
      .spyOn(importActivitiesService, 'importJson')
      .mockImplementation(async ({ activities }) => {
        return {
          activities: activities as never
        };
      });
  });

  it('defaults tax to zero when the CSV has no tax column', async () => {
    const { activities } = await importActivitiesService.importCsv({
      fileContent:
        'Date,Code,DataSource,Currency,Price,Quantity,Action,Fee\n' +
        '16-09-2021,MSFT,YAHOO,USD,298.58,5,buy,19',
      userAccounts: []
    });

    expect(activities[0]).toMatchObject({
      fee: 19,
      tax: 0
    });
  });

  it('imports tax from the CSV', async () => {
    const { activities } = await importActivitiesService.importCsv({
      fileContent:
        'Date,Code,DataSource,Currency,Price,Quantity,Action,Fee,Tax\n' +
        '16-09-2021,MSFT,YAHOO,USD,298.58,5,buy,19,7.5',
      userAccounts: []
    });

    expect(activities[0]).toMatchObject({
      fee: 19,
      tax: 7.5
    });
  });

  it('imports tax from a withholding tax column', async () => {
    const { activities } = await importActivitiesService.importCsv({
      fileContent:
        'Date,Code,DataSource,Currency,Price,Quantity,Action,Fee,Withholding Tax\n' +
        '17-11-2021,MSFT,YAHOO,USD,0.62,5,dividend,0,0.93',
      userAccounts: []
    });

    expect(activities[0]).toMatchObject({
      tax: 0.93,
      type: 'DIVIDEND'
    });
  });

  it('rejects an invalid tax value', async () => {
    await expect(
      importActivitiesService.importCsv({
        fileContent:
          'Date,Code,DataSource,Currency,Price,Quantity,Action,Fee,Tax\n' +
          '16-09-2021,MSFT,YAHOO,USD,298.58,5,buy,19,<invalid>',
        userAccounts: []
      })
    ).rejects.toMatchObject({
      message: 'activities.0.tax is not valid'
    });
  });
});
