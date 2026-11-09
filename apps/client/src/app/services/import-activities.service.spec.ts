import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { ImportActivitiesService } from './import-activities.service';

jest.mock('uuid', () => {
  return { v4: () => 'uuid' };
});

describe('ImportActivitiesService', () => {
  let post: jest.Mock;
  let service: ImportActivitiesService;

  beforeEach(() => {
    post = jest.fn().mockReturnValue(of({ activities: [] }));

    TestBed.configureTestingModule({
      providers: [{ provide: HttpClient, useValue: { post } }]
    });

    service = TestBed.inject(ImportActivitiesService);
  });

  it('should keep text columns and ISO dates as they are in the CSV', async () => {
    await service.importCsv({
      fileContent: [
        'Date,Symbol,Currency,Price,Quantity,Type,Fee,Comment,Account',
        '2021-09-01T00:00:00.000Z,AAPL,USD,150.5,2,buy,1,007,01'
      ].join('\n'),
      isDryRun: true,
      userAccounts: [{ id: 'account-01', name: '01' } as any]
    });

    const [activity] = post.mock.calls[0][1].activities;

    expect(activity).toMatchObject({
      accountId: 'account-01',
      comment: '007',
      date: '2021-09-01T00:00:00.000Z',
      fee: 1,
      quantity: 2,
      unitPrice: 150.5
    });
  });

  it('should skip empty cells and use the next column', async () => {
    await service.importCsv({
      fileContent: [
        'Date,Code,Symbol,Ccy,Currency,Price,Quantity,Type,Fee,Comment,Note,Account,AccountId',
        '2021-09-01,,AAPL,,USD,150.5,2,buy,1,,hello,,account-01'
      ].join('\n'),
      isDryRun: true,
      userAccounts: [{ id: 'account-01', name: '01' } as any]
    });

    const [activity] = post.mock.calls[0][1].activities;

    expect(activity).toMatchObject({
      accountId: 'account-01',
      comment: 'hello',
      currency: 'USD',
      symbol: 'AAPL'
    });
  });

  it('should reject a fee without a symbol', async () => {
    await expect(
      service.importCsv({
        fileContent: [
          'Date,Code,Currency,Price,Quantity,Type,Fee',
          '2021-09-01,,USD,0,0,fee,49'
        ].join('\n'),
        isDryRun: true,
        userAccounts: []
      })
    ).rejects.toMatchObject({
      message: 'activities.0.symbol is not valid'
    });

    expect(post).not.toHaveBeenCalled();
  });
});
