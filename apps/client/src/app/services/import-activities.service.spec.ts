import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { ImportActivitiesService } from './import-activities.service';

jest.mock('uuid', () => ({
  v4: () => '00000000-0000-4000-8000-000000000001'
}));

describe('ImportActivitiesService', () => {
  let service: ImportActivitiesService;
  let post: jest.Mock;

  beforeEach(() => {
    post = jest.fn().mockImplementation((_url, { activities }) => {
      return of({ activities });
    });

    TestBed.configureTestingModule({
      providers: [
        ImportActivitiesService,
        { provide: HttpClient, useValue: { post } }
      ]
    });

    service = TestBed.inject(ImportActivitiesService);
  });

  describe('importCsv', () => {
    it.each(['Symbol', 'CODE', 'ticker'])(
      'preserves leading zeroes in the %s column',
      async (symbolColumn) => {
        await service.importCsv({
          fileContent: `${symbolColumn},currency,date,type,quantity,unitPrice,fee\n"0005",HKD,2026-01-02,BUY,10,3.12,-0.5`,
          isDryRun: true,
          userAccounts: []
        });

        expect(post).toHaveBeenCalledWith(
          '/api/v1/import?dryRun=true',
          expect.objectContaining({
            activities: [
              expect.objectContaining({
                currency: 'HKD',
                date: new Date(2026, 0, 2).toISOString(),
                fee: 0.5,
                quantity: 10,
                symbol: '0005',
                type: 'BUY',
                unitPrice: 3.12
              })
            ]
          })
        );
      }
    );

    it.each(['639', '000000', '1E3', 'TRUE', 'FALSE', 'AAPL', '0639.HK'])(
      'preserves the symbol %s without CSV type coercion',
      async (symbol) => {
        await service.importCsv({
          fileContent: `symbol,currency,date,type,quantity,unitPrice,fee\n${symbol},USD,2026-01-02,BUY,1,10,0`,
          userAccounts: []
        });

        expect(post.mock.calls[0][1].activities[0].symbol).toBe(symbol);
      }
    );

    it.each(['', '""'])(
      'rejects an empty symbol (%s) before posting the import',
      async (symbol) => {
        await expect(
          service.importCsv({
            fileContent: `symbol,currency,date,type,quantity,unitPrice,fee\n${symbol},USD,2026-01-02,BUY,1,10,0`,
            userAccounts: []
          })
        ).rejects.toMatchObject({
          message: 'activities.0.symbol is not valid'
        });

        expect(post).not.toHaveBeenCalled();
      }
    );

    it('preserves numeric names when creating a manual asset profile', async () => {
      const result = await service.importCsv({
        fileContent:
          'symbol,dataSource,currency,date,type,quantity,unitPrice,fee\n0005,MANUAL,HKD,2026-01-02,BUY,10,3.12,0',
        userAccounts: []
      });

      expect(result.assetProfiles).toEqual([
        expect.objectContaining({
          dataSource: 'MANUAL',
          name: '0005',
          symbol: '00000000-0000-4000-8000-000000000001'
        })
      ]);
      expect(post.mock.calls[0][1].activities[0].symbol).toBe(
        result.assetProfiles[0].symbol
      );
    });
  });
});
