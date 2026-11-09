import { CreateOrderDto } from '@ghostfolio/common/dtos';
import type { Account } from '@ghostfolio/prisma/browser';

import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Observable, of } from 'rxjs';

import { ImportActivitiesService } from './import-activities.service';

jest.mock('uuid', () => {
  return { v4: () => 'uuid' };
});

type PostArguments = [string, { activities: CreateOrderDto[] }];

describe('ImportActivitiesService', () => {
  let post: jest.Mock<Observable<unknown>, PostArguments>;
  let service: ImportActivitiesService;

  beforeEach(() => {
    post = jest
      .fn<Observable<unknown>, PostArguments>()
      .mockReturnValue(of({ activities: [] }));

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
      userAccounts: [{ id: 'account-01', name: '01' } as Account]
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

  it('should keep symbols which look like a number or a boolean', async () => {
    await service.importCsv({
      fileContent: [
        'Date,Symbol,Currency,Price,Quantity,Type,Fee',
        '2021-09-01,0050,USD,150.5,2,buy,1',
        '2021-09-01,TRUE,USD,150.5,2,buy,1',
        '2021-09-01,7203,USD,150.5,2,buy,1'
      ].join('\n'),
      isDryRun: true,
      userAccounts: []
    });

    const symbols = post.mock.calls[0][1].activities.map(({ symbol }) => {
      return symbol;
    });

    expect(symbols).toEqual(['0050', 'TRUE', '7203']);
  });

  it('should parse a date with an offset', async () => {
    await service.importCsv({
      fileContent: [
        'Date,Symbol,Currency,Price,Quantity,Type,Fee',
        '2021-09-01T10:00:00+02:00,AAPL,USD,150.5,2,buy,1'
      ].join('\n'),
      isDryRun: true,
      userAccounts: []
    });

    const [activity] = post.mock.calls[0][1].activities;

    expect(activity.date).toBe('2021-09-01T08:00:00.000Z');
  });

  it('should skip empty cells and use the next column', async () => {
    await service.importCsv({
      fileContent: [
        'Date,Code,Symbol,Ccy,Currency,Price,Quantity,Type,Fee,Comment,Note,Account,AccountId',
        '2021-09-01,,AAPL,,USD,150.5,2,buy,1,,hello,,account-01'
      ].join('\n'),
      isDryRun: true,
      userAccounts: [{ id: 'account-01', name: '01' } as Account]
    });

    const [activity] = post.mock.calls[0][1].activities;

    expect(activity).toMatchObject({
      accountId: 'account-01',
      comment: 'hello',
      currency: 'USD',
      symbol: 'AAPL'
    });
  });

  it('should trim cells and skip cells with only spaces', async () => {
    await service.importCsv({
      fileContent: [
        'Date,Code,Symbol,Currency,Price,Quantity,Type,Fee',
        ' 20230403 ,   , 7203 ,USD,150.5,2,buy,1'
      ].join('\n'),
      isDryRun: true,
      userAccounts: []
    });

    const [activity] = post.mock.calls[0][1].activities;

    expect(activity).toMatchObject({
      date: new Date(2023, 3, 3).toISOString(),
      symbol: '7203'
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
