import type { CreateOrderDto } from '@ghostfolio/common/dtos';
import type { Account } from '@ghostfolio/prisma/browser';
import { DataSource, Type } from '@ghostfolio/prisma/enums';

import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { unparse } from 'papaparse';
import { of } from 'rxjs';

import { ImportActivitiesService } from './import-activities.service';

jest.mock('uuid', () => ({
  v4: () => '123e4567-e89b-42d3-a456-426614174000'
}));

describe('ImportActivitiesService bank cash movements', () => {
  let service: ImportActivitiesService;
  let http: { post: jest.Mock };
  const userAccounts = [
    { id: 'bank-account', name: 'Bank', currency: 'EUR' }
  ] as Account[];

  beforeEach(() => {
    http = { post: jest.fn().mockReturnValue(of({ activities: [] })) };

    TestBed.configureTestingModule({
      providers: [{ provide: HttpClient, useValue: http }]
    });

    service = TestBed.runInInjectionContext(() => {
      return new ImportActivitiesService();
    });
  });

  function importedActivity() {
    return (http.post.mock.calls[0][1] as { activities: CreateOrderDto[] })
      .activities[0];
  }

  function bankExportCsv(overrides: Record<string, unknown> = {}) {
    return unparse([
      {
        datetime: '2026-09-10T12:48:24.596Z',
        date: '2026-09-10',
        account_type: 'DEFAULT',
        category: 'CASH',
        type: 'TRANSFER_INSTANT_INBOUND',
        asset_class: null,
        name: 'Example Counterparty',
        symbol: null,
        shares: null,
        price: null,
        amount: 100,
        fee: null,
        tax: null,
        currency: 'EUR',
        description: 'Incoming transfer',
        transaction_id: 'example-id',
        ...overrides
      }
    ]);
  }

  it.each([
    ['TRANSFER_INSTANT_INBOUND', 100, Type.DEPOSIT],
    ['TRANSFER_INBOUND', 100, Type.DEPOSIT],
    ['TRANSFER_INSTANT_OUTBOUND', -25, Type.WITHDRAWAL],
    ['TRANSFER_OUTBOUND', 25, Type.WITHDRAWAL]
  ])(
    'imports bank export type %s with nullable trading fields and amount %s',
    async (type, amount, expectedType) => {
      await service.importCsv({
        userAccounts,
        fileContent: bankExportCsv({ type, amount }),
        isDryRun: true
      });

      expect(http.post.mock.calls[0][0]).toBe('/api/v1/import?dryRun=true');
      expect(importedActivity()).toMatchObject({
        accountId: 'bank-account',
        currency: 'EUR',
        dataSource: DataSource.MANUAL,
        date: '2026-09-10T12:48:24.596Z',
        fee: 0,
        quantity: 1,
        type: expectedType,
        unitPrice: Math.abs(amount as number),
        updateAccountBalance: true
      });
      expect(http.post.mock.calls[0][1].assetProfiles[0].name).toBe(
        'Incoming transfer'
      );
    }
  );

  it.each([
    [100, Type.DEPOSIT],
    [-25, Type.WITHDRAWAL]
  ])(
    'classifies an unsupported cash type by its signed amount %s',
    async (amount, type) => {
      await service.importCsv({
        userAccounts,
        fileContent: bankExportCsv({ type: 'BANK_TRANSACTION', amount })
      });

      expect(importedActivity()).toMatchObject({
        type,
        unitPrice: Math.abs(amount as number)
      });
    }
  );

  it.each([
    [Type.INTEREST, 5, Type.DEPOSIT],
    [Type.FEE, -2, Type.WITHDRAWAL]
  ])(
    'classifies bank cash %s by its posted amount %s',
    async (type, amount, expectedType) => {
      await service.importCsv({
        userAccounts,
        fileContent: bankExportCsv({ type, amount })
      });

      expect(importedActivity()).toMatchObject({
        accountId: 'bank-account',
        fee: 0,
        quantity: 1,
        type: expectedType,
        unitPrice: Math.abs(amount as number),
        updateAccountBalance: true
      });
    }
  );

  it('retains non-bank fee activity fields', async () => {
    await service.importCsv({
      userAccounts,
      fileContent:
        'Date,Type,UnitPrice,Quantity,Fee,Symbol,Currency,Account\n2026-10-01,fee,0,0,2,Account fee,EUR,Bank'
    });

    expect(importedActivity()).toMatchObject({
      fee: 2,
      quantity: 0,
      type: Type.FEE,
      unitPrice: 0
    });
    expect(importedActivity()).not.toHaveProperty('updateAccountBalance');
  });

  it.each(['BALANCE', 'TOTAL', 'SUMMARY'])(
    'does not turn an informational bank cash %s row into a deposit',
    async (type) => {
      await expect(
        service.importCsv({
          userAccounts,
          fileContent: bankExportCsv({ type })
        })
      ).rejects.toMatchObject({ message: 'activities.0.type is not valid' });

      expect(http.post).not.toHaveBeenCalled();
    }
  );

  it('rejects a cash row whose zero amount has no direction', async () => {
    await expect(
      service.importCsv({
        userAccounts,
        fileContent: bankExportCsv({ type: 'BANK_TRANSACTION', amount: 0 })
      })
    ).rejects.toMatchObject({ message: 'activities.0.type is not valid' });

    expect(http.post).not.toHaveBeenCalled();
  });

  it('does not infer cash movements from signed amounts on unsupported security rows', async () => {
    await expect(
      service.importCsv({
        userAccounts,
        fileContent: bankExportCsv({
          category: 'SECURITY',
          type: 'SPLIT',
          amount: -100
        })
      })
    ).rejects.toMatchObject({ message: 'activities.0.type is not valid' });

    expect(http.post).not.toHaveBeenCalled();
  });

  it('does not classify an unsupported security settlement suffix as a bank movement', async () => {
    await expect(
      service.importCsv({
        userAccounts,
        fileContent: bankExportCsv({
          category: 'SECURITY',
          type: 'TRADE_SETTLEMENT_OUTBOUND',
          amount: -100
        })
      })
    ).rejects.toMatchObject({ message: 'activities.0.type is not valid' });

    expect(http.post).not.toHaveBeenCalled();
  });

  it.each([Type.BUY, Type.SELL])(
    'preserves an explicit %s over a bank alias and signed cash amount',
    async (type) => {
      await service.importCsv({
        userAccounts,
        fileContent: bankExportCsv({
          action: 'TRANSFER_INSTANT_INBOUND',
          type,
          amount: -200,
          symbol: 'AAPL',
          shares: 2,
          price: 100,
          fee: 3
        })
      });

      expect(importedActivity()).toMatchObject({
        accountId: undefined,
        fee: 3,
        quantity: 2,
        symbol: 'AAPL',
        type,
        unitPrice: 100
      });
      expect(importedActivity()).not.toHaveProperty('updateAccountBalance');
    }
  );

  it('leaves cash rows unassigned when several accounts exist', async () => {
    await service.importCsv({
      userAccounts: [
        ...userAccounts,
        { id: 'other-account', currency: 'EUR' } as Account
      ],
      fileContent: bankExportCsv()
    });

    expect(importedActivity()).toMatchObject({
      accountId: undefined,
      updateAccountBalance: false
    });
  });

  it('does not assign a sole account with a different currency to a bank export', async () => {
    await service.importCsv({
      userAccounts: [{ ...userAccounts[0], currency: 'USD' }],
      fileContent: bankExportCsv()
    });

    expect(importedActivity()).toMatchObject({
      accountId: undefined,
      updateAccountBalance: false
    });
  });

  it('imports a deposit amount without security, quantity or fee columns', async () => {
    await service.importCsv({
      userAccounts,
      fileContent:
        'Date,Type,Amount,Currency,Account\n2026-10-01,deposit,100,EUR,Bank'
    });

    expect(importedActivity()).toMatchObject({
      accountId: 'bank-account',
      currency: 'EUR',
      dataSource: DataSource.MANUAL,
      fee: 0,
      quantity: 1,
      type: Type.DEPOSIT,
      unitPrice: 100,
      updateAccountBalance: true
    });
    expect(http.post.mock.calls[0][1].assetProfiles[0].name).toBe('Deposit');
  });

  it.each(['withdrawal', 'withdraw'])(
    'imports %s with a positive amount and an optional description',
    async (type) => {
      await service.importCsv({
        userAccounts,
        fileContent: `Date,Type,Amount,Currency,Account,Description\n2026-10-01,${type},-25,EUR,Bank,Rent`
      });

      expect(importedActivity()).toMatchObject({
        fee: 0,
        quantity: 1,
        type: Type.WITHDRAWAL,
        unitPrice: 25,
        updateAccountBalance: true
      });
      expect(http.post.mock.calls[0][1].assetProfiles[0].name).toBe('Rent');
    }
  );

  it('does not update a balance when no bank account matches', async () => {
    await service.importCsv({
      userAccounts,
      fileContent:
        'Date,Type,Amount,Currency,Account\n2026-10-01,deposit,100,EUR,Unknown'
    });

    expect(importedActivity()).toMatchObject({
      accountId: undefined,
      updateAccountBalance: false
    });
  });

  it('keeps investment activity quantities and fees while leaving balance defaults to the server', async () => {
    await service.importCsv({
      userAccounts,
      fileContent:
        'Date,Type,UnitPrice,Quantity,Fee,Symbol,Currency,Account\n2026-10-01,buy,100,2,3,AAPL,USD,Bank'
    });

    expect(importedActivity()).toMatchObject({
      fee: 3,
      quantity: 2,
      symbol: 'AAPL',
      type: Type.BUY,
      unitPrice: 100
    });
    expect(importedActivity()).not.toHaveProperty('updateAccountBalance');
  });

  function mixedStatementCsv({
    investmentOverrides = {},
    cashOverrides = {}
  }: {
    investmentOverrides?: Record<string, unknown>;
    cashOverrides?: Record<string, unknown>;
  } = {}) {
    return unparse([
      {
        Date: '2026-09-10',
        Type: Type.DEPOSIT,
        Amount: 1000,
        Currency: 'EUR',
        Account: null,
        Symbol: null,
        UnitPrice: null,
        Quantity: null,
        Fee: null,
        DataSource: null,
        UpdateAccountBalance: null,
        ...cashOverrides
      },
      {
        Date: '2026-09-11',
        Type: Type.BUY,
        Amount: 201.89,
        Currency: 'EUR',
        Account: null,
        Symbol: 'EXAMPLE',
        UnitPrice: 100.945,
        Quantity: 2,
        Fee: 1,
        DataSource: DataSource.YAHOO,
        UpdateAccountBalance: null,
        ...investmentOverrides
      }
    ]);
  }

  it.each([Type.BUY, Type.SELL, Type.DIVIDEND, Type.INTEREST, Type.FEE])(
    'assigns the safe sole cash account to %s in a mixed statement without forcing a balance preference',
    async (type) => {
      await service.importCsv({
        userAccounts,
        fileContent: mixedStatementCsv({ investmentOverrides: { Type: type } })
      });

      const activities = http.post.mock.calls[0][1]
        .activities as CreateOrderDto[];

      expect(activities[0].updateAccountBalance).toBe(true);
      expect(activities[1]).toMatchObject({
        accountId: 'bank-account',
        fee: 1,
        quantity: 2,
        type,
        unitPrice: 100.945
      });
      expect(activities[1]).not.toHaveProperty('updateAccountBalance');
    }
  );

  it('does not assign the cash account to a liability automatically', async () => {
    await service.importCsv({
      userAccounts,
      fileContent: mixedStatementCsv({
        investmentOverrides: {
          Type: Type.LIABILITY,
          DataSource: DataSource.MANUAL,
          Symbol: 'Custom asset'
        }
      })
    });

    expect(http.post.mock.calls[0][1].activities[1].accountId).toBeUndefined();
  });

  it('assigns the cash account to a manual purchase in a mixed statement', async () => {
    await service.importCsv({
      userAccounts,
      fileContent: mixedStatementCsv({
        investmentOverrides: {
          Type: Type.BUY,
          DataSource: DataSource.MANUAL,
          Symbol: 'Custom asset'
        }
      })
    });

    const purchase = http.post.mock.calls[0][1].activities[1] as CreateOrderDto;

    expect(purchase.accountId).toBe('bank-account');
    expect(purchase).not.toHaveProperty('updateAccountBalance');
  });

  it('does not override an explicit unknown account in a mixed statement', async () => {
    await service.importCsv({
      userAccounts,
      fileContent: mixedStatementCsv({
        investmentOverrides: { Account: 'Unknown' }
      })
    });

    expect(http.post.mock.calls[0][1].activities[1].accountId).toBeUndefined();
  });

  it('does not assign an arbitrary account to mixed statements with several accounts', async () => {
    await service.importCsv({
      userAccounts: [
        ...userAccounts,
        { ...userAccounts[0], id: 'other-account' }
      ],
      fileContent: mixedStatementCsv({ cashOverrides: { Account: 'Bank' } })
    });

    expect(http.post.mock.calls[0][1].activities[1].accountId).toBeUndefined();
  });

  it('does not use the cash account for an investment in another currency', async () => {
    await service.importCsv({
      userAccounts,
      fileContent: mixedStatementCsv({
        investmentOverrides: { Currency: 'USD' }
      })
    });

    expect(http.post.mock.calls[0][1].activities[1].accountId).toBeUndefined();
  });

  it('preserves explicit CSV balance opt-outs for cash and investment rows', async () => {
    await service.importCsv({
      userAccounts,
      fileContent: mixedStatementCsv({
        cashOverrides: { UpdateAccountBalance: false },
        investmentOverrides: { UpdateAccountBalance: false }
      })
    });

    const activities = http.post.mock.calls[0][1]
      .activities as CreateOrderDto[];

    expect(
      activities.map(({ updateAccountBalance }) => updateAccountBalance)
    ).toEqual([false, false]);
  });

  it('preserves an explicit CSV balance opt-in for investment rows', async () => {
    await service.importCsv({
      userAccounts,
      fileContent: mixedStatementCsv({
        investmentOverrides: { UpdateAccountBalance: true }
      })
    });

    expect(http.post.mock.calls[0][1].activities[1].updateAccountBalance).toBe(
      true
    );
  });
});
