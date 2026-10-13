import { ImpersonationStorageService } from '@ghostfolio/client/services/impersonation-storage.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import type { CreateOrderDto } from '@ghostfolio/common/dtos';
import type { User } from '@ghostfolio/common/interfaces';
import { Type } from '@ghostfolio/prisma/enums';
import { DataService } from '@ghostfolio/ui/services';

import { ChangeDetectorRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormGroup } from '@angular/forms';
import { DateAdapter, MAT_DATE_LOCALE } from '@angular/material/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import 'reflect-metadata';
import { of } from 'rxjs';

import { GfCreateOrUpdateActivityDialogComponent } from './create-or-update-activity-dialog.component';
import { CreateOrUpdateActivityDialogParams } from './interfaces/interfaces';

jest.mock('@ghostfolio/client/services/user/user.service', () => ({
  UserService: class {}
}));
jest.mock('@ghostfolio/ui/account-selector', () => ({
  GfAccountSelectorComponent: class {}
}));
jest.mock('@ghostfolio/ui/services', () => ({ DataService: class {} }));
jest.mock('@ghostfolio/ui/symbol-autocomplete', () => ({
  GfSymbolAutocompleteComponent: class {}
}));
jest.mock('@ghostfolio/ui/tags-selector', () => ({
  GfTagsSelectorComponent: class {}
}));
jest.mock('@ghostfolio/ui/value', () => ({ GfValueComponent: class {} }));
jest.mock('@ionic/angular/standalone', () => ({ IonIcon: class {} }));

describe('GfCreateOrUpdateActivityDialogComponent bank cash movements', () => {
  let component: GfCreateOrUpdateActivityDialogComponent;
  let form: FormGroup;
  let data: CreateOrUpdateActivityDialogParams;
  let close: jest.Mock;

  beforeEach(() => {
    data = {
      accounts: [
        {
          id: 'bank-account',
          currency: 'EUR',
          name: 'Bank',
          createdAt: new Date(),
          updatedAt: new Date(),
          userId: 'user-id',
          comment: null,
          platformId: null
        }
      ],
      activity: {
        accountId: 'bank-account',
        assetProfile: null,
        date: new Date(2026, 0, 1),
        fee: 0,
        id: null,
        type: Type.DEPOSIT,
        unitPrice: 100
      },
      user: {
        id: 'user-id',
        permissions: [],
        settings: { baseCurrency: 'EUR', locale: 'en' },
        tags: []
      } as unknown as User
    };
    close = jest.fn();

    TestBed.configureTestingModule({
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MAT_DATE_LOCALE, useValue: 'en' },
        { provide: MatDialogRef, useValue: { close } },
        { provide: DateAdapter, useValue: { setLocale: jest.fn() } },
        {
          provide: ChangeDetectorRef,
          useValue: { markForCheck: jest.fn() }
        },
        {
          provide: DataService,
          useValue: {
            fetchInfo: () => ({ currencies: ['EUR', 'USD'] }),
            fetchPortfolioHoldings: () => of({ holdings: [] })
          }
        },
        {
          provide: ImpersonationStorageService,
          useValue: { getId: () => null }
        },
        { provide: UserService, useValue: {} }
      ]
    });
  });

  function createComponent() {
    component = TestBed.runInInjectionContext(() => {
      return new GfCreateOrUpdateActivityDialogComponent();
    });
    component.ngOnInit();
    form = (
      component as unknown as {
        activityForm: FormGroup;
      }
    ).activityForm;
  }

  async function submit() {
    await (component as unknown as { onSubmit(): Promise<void> }).onSubmit();

    return close.mock.calls.at(-1)?.[0] as CreateOrderDto;
  }

  it.each([Type.DEPOSIT, Type.WITHDRAWAL])(
    'requires an account and a positive amount for %s without requiring a security or name',
    (type) => {
      data.activity.type = type;
      createComponent();

      expect(form.valid).toBe(true);
      expect(form.get('searchSymbol')?.valid).toBe(true);
      expect(form.get('name')?.valid).toBe(true);
      expect(form.get('quantity')?.value).toBe(1);
      expect(form.get('fee')?.value).toBe(0);

      form.get('unitPrice')?.setValue(0);
      expect(form.get('unitPrice')?.invalid).toBe(true);
      form.get('unitPrice')?.setValue(-100);
      expect(form.get('unitPrice')?.invalid).toBe(true);
      form.get('unitPrice')?.setValue(100);
      expect(form.get('unitPrice')?.valid).toBe(true);

      form.get('accountId')?.setValue(null);
      expect(form.get('accountId')?.invalid).toBe(true);
    }
  );

  it('defaults backdated cash balance updates on and retains the preference when the account is cleared and restored', () => {
    createComponent();
    const balanceControl = form.get('updateAccountBalance');

    expect(balanceControl?.enabled).toBe(true);
    expect(balanceControl?.value).toBe(true);

    form.get('accountId')?.setValue(null);
    expect(balanceControl?.disabled).toBe(true);
    expect(balanceControl?.value).toBe(true);

    form.get('accountId')?.setValue('bank-account');
    expect(balanceControl?.enabled).toBe(true);
    expect(balanceControl?.value).toBe(true);
  });

  it('submits future cash movements without updating the balance and restores the preference for a past date', async () => {
    createComponent();
    const balanceControl = form.get('updateAccountBalance');
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);

    form.get('date')?.setValue(futureDate);
    expect(balanceControl?.disabled).toBe(true);
    expect(balanceControl?.value).toBe(true);
    expect((await submit()).updateAccountBalance).toBe(false);

    form.get('date')?.setValue(new Date(2026, 0, 1));
    expect(balanceControl?.enabled).toBe(true);
    expect(balanceControl?.value).toBe(true);
    expect(await submit()).toMatchObject({
      symbol: 'Deposit',
      updateAccountBalance: true
    });
  });

  it('preserves an explicit user opt-out across date and account changes', () => {
    createComponent();
    const balanceControl = form.get('updateAccountBalance');

    balanceControl?.setValue(false);
    form.get('accountId')?.setValue(null);
    form.get('accountId')?.setValue('bank-account');
    form.get('date')?.setValue(new Date(2026, 0, 2));

    expect(balanceControl?.enabled).toBe(true);
    expect(balanceControl?.value).toBe(false);
  });

  it('preserves the stored cash balance opt-out when cloning an activity', async () => {
    data.activity.updateAccountBalance = false;
    createComponent();

    expect(form.get('updateAccountBalance')?.value).toBe(false);
    expect((await submit()).updateAccountBalance).toBe(false);
  });

  it.each([true, false])(
    'leaves the stored balance preference %s unchanged when editing a bank activity',
    async (updateAccountBalance) => {
      data.activity.id = 'bank-movement';
      data.activity.updateAccountBalance = updateAccountBalance;
      createComponent();

      expect(form.get('updateAccountBalance')?.value).toBe(
        updateAccountBalance
      );
      expect(await submit()).not.toHaveProperty('updateAccountBalance');
    }
  );
});
