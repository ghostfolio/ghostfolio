import { ImpersonationStorageService } from '@ghostfolio/client/services/impersonation-storage.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { TAG_ID_EXCLUDE_FROM_ANALYSIS } from '@ghostfolio/common/config';
import {
  AccountsResponse,
  PortfolioDetails,
  User
} from '@ghostfolio/common/interfaces';
import { permissions } from '@ghostfolio/common/permissions';
import { createDefaultPortfolioTarget } from '@ghostfolio/common/portfolio-targets/portfolio-targets-presets';
import { scopes } from '@ghostfolio/common/scopes';
import { DataService } from '@ghostfolio/ui/services';

import { ChangeDetectorRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import '@angular/localize/init';
import { MatDialog } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { BehaviorSubject, Subject, of, throwError } from 'rxjs';

import { GfTargetsPageComponent } from './targets-page.component';

jest.mock('@ghostfolio/ui/services', () => ({ DataService: class {} }));
// Keep the real monetary formatter; the icon renderer is irrelevant here and
// its browser-only dependency graph is not transformed by the Jest preset.
jest.mock('@ionic/angular/standalone', () => {
  const { Component } =
    jest.requireActual<typeof import('@angular/core')>('@angular/core');
  class IonIconStub {}
  Component({
    selector: 'ion-icon',
    standalone: true,
    template: '',
    inputs: ['name']
  })(IonIconStub);
  return { IonIcon: IonIconStub };
});
jest.mock('@ghostfolio/ui/i18n', () => ({
  translate: (value: string) => value
}));
jest.mock('@ghostfolio/client/services/user/user.service', () => ({
  UserService: class {}
}));
jest.mock('./target-configuration-dialog.component', () => ({
  GfTargetConfigurationDialogComponent: class {}
}));

function makeUser(): User {
  return {
    id: 'owner',
    permissions: [permissions.updateUserSettings],
    scopes: [scopes.accountRead, scopes.portfolioReadValues],
    settings: {
      portfolioTargets: {
        version: 1,
        activeProfileId: 'global',
        profiles: [createDefaultPortfolioTarget()]
      }
    }
  } as User;
}

function makeDetails(): PortfolioDetails {
  return {
    accounts: {
      one: {
        balance: 100,
        currency: 'EUR',
        name: 'One',
        valueInBaseCurrency: 100
      }
    },
    holdings: [],
    summary: {
      accountCashInBaseCurrency: 100,
      cash: 100,
      emergencyFund: { cash: 0 },
      filteredValueInBaseCurrency: 0,
      liabilitiesInBaseCurrency: 0
    }
  } as PortfolioDetails;
}

describe('Portfolio Targets page requests and persistence', () => {
  let component: GfTargetsPageComponent;
  let dialog: { open: jest.Mock };
  let state: BehaviorSubject<{ user: User }>;
  let impersonation: BehaviorSubject<string | null>;
  let afterClosed: Subject<ReturnType<typeof createDefaultPortfolioTarget>>;
  let dataService: {
    fetchAccounts: jest.Mock;
    fetchPortfolioDetails: jest.Mock;
    putUserSetting: jest.Mock;
  };

  beforeEach(() => {
    state = new BehaviorSubject({ user: makeUser() });
    impersonation = new BehaviorSubject(null);
    afterClosed = new Subject();
    dialog = { open: jest.fn(() => ({ afterClosed: () => afterClosed })) };
    dataService = {
      fetchAccounts: jest.fn(() =>
        of({
          accounts: [
            { id: 'one', name: 'One', tags: [] },
            {
              id: 'excluded',
              name: 'Excluded',
              tags: [{ id: TAG_ID_EXCLUDE_FROM_ANALYSIS }]
            }
          ]
        } as AccountsResponse)
      ),
      fetchPortfolioDetails: jest.fn(() => of(makeDetails())),
      putUserSetting: jest.fn(() => of({}))
    };
    TestBed.configureTestingModule({
      providers: [
        provideNoopAnimations(),
        { provide: ChangeDetectorRef, useValue: { markForCheck: jest.fn() } },
        { provide: DataService, useValue: dataService },
        {
          provide: UserService,
          useValue: {
            stateChanged: state,
            get: jest.fn(() => of(state.value.user))
          }
        },
        {
          provide: ImpersonationStorageService,
          useValue: { onChangeHasImpersonation: () => impersonation }
        },
        {
          provide: MatDialog,
          useValue: dialog
        }
      ]
    });
    component = TestBed.runInInjectionContext(
      () => new GfTargetsPageComponent()
    );
    component.ngOnInit();
  });

  afterEach(() => TestBed.resetTestingModule());

  it.each([
    { locale: 'en-US', currency: 'USD', amount: '100.00' },
    { locale: 'it-IT', currency: 'EUR', amount: '100,00' }
  ])(
    'renders portfolio value before the unchanged drift cards ($locale)',
    ({ locale, currency, amount }) => {
      const user = makeUser();
      user.settings.locale = locale;
      user.settings.baseCurrency = currency;
      state.next({ user });
      const fixture = TestBed.createComponent(GfTargetsPageComponent);
      fixture.detectChanges();
      const element = fixture.nativeElement as HTMLElement;
      const cards = element.querySelectorAll('.row.mb-3 > .col-md-4');
      expect(cards).toHaveLength(3);
      const text = Array.from(cards, (card) =>
        card.textContent.replace(/\s+/g, ' ').trim()
      );
      expect(text[0]).toContain('Portfolio value');
      expect(text[0]).toContain(amount);
      expect(text[0]).toContain(currency);
      expect(text[1]).toContain('Total allocation drift');
      expect(text[1]).toContain('100%');
      expect(text[2]).toContain('Maximum deviation');
      expect(text[2]).toContain('100%');
      expect(element.textContent).not.toContain('Classes outside tolerance');
    }
  );

  it.each([
    'loading',
    'unavailable',
    'inconsistent',
    'unsupported',
    'restricted'
  ])('does not render monetary summary cards in state %s', (status) => {
    const details = makeDetails();
    if (status === 'restricted') {
      const user = makeUser();
      user.settings.isRestrictedView = true;
      state.next({ user });
    } else if (status === 'loading') {
      dataService.fetchPortfolioDetails.mockReturnValue(
        new Subject<PortfolioDetails>()
      );
    } else {
      if (status === 'unavailable')
        delete details.summary.accountCashInBaseCurrency;
      if (status === 'inconsistent')
        details.accounts.one.valueInBaseCurrency = 50;
      if (status === 'unsupported') details.accounts.one.balance = -10;
      dataService.fetchPortfolioDetails.mockReturnValue(of(details));
    }
    const fixture = TestBed.createComponent(GfTargetsPageComponent);
    fixture.detectChanges();
    expect(
      (fixture.nativeElement as HTMLElement).querySelectorAll(
        '.row.mb-3 > .col-md-4'
      )
    ).toHaveLength(0);
  });

  it('renders the calculated value for the selected account', () => {
    const user = makeUser();
    user.settings.baseCurrency = 'USD';
    user.settings.locale = 'en-US';
    state.next({ user });
    const fixture = TestBed.createComponent(GfTargetsPageComponent);
    fixture.detectChanges();
    const details = makeDetails();
    details.accounts.one.balance = 250;
    details.accounts.one.valueInBaseCurrency = 250;
    details.summary.accountCashInBaseCurrency = 250;
    dataService.fetchPortfolioDetails.mockReturnValue(of(details));
    fixture.componentInstance['changeAccount']('one');
    fixture.componentRef.changeDetectorRef.detectChanges();
    expect(dataService.fetchPortfolioDetails).toHaveBeenLastCalledWith({
      filters: [{ type: 'ACCOUNT', id: 'one' }]
    });
    expect(
      (fixture.nativeElement as HTMLElement).querySelector(
        '.row.mb-3 > .col-md-4'
      ).textContent
    ).toContain('250.00');
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain(
      'Excluded'
    );
  });

  it('uses tagged account data, preserves the global option and sends account-only filters', () => {
    expect(component['accounts'].map(({ id }) => id)).toEqual(['one']);
    expect(dataService.fetchAccounts).toHaveBeenCalledWith({ filters: [] });
    expect(dataService.fetchPortfolioDetails).toHaveBeenLastCalledWith({
      filters: []
    });
    component['changeAccount']('one');
    expect(dataService.fetchPortfolioDetails).toHaveBeenLastCalledWith({
      filters: [{ type: 'ACCOUNT', id: 'one' }]
    });
    expect(component['profile'].id).toBe('global');
  });

  it('falls back to the global portfolio when an account disappears or is excluded', () => {
    component['changeAccount']('one');
    dataService.fetchAccounts.mockReturnValue(of({ accounts: [] }));
    state.next({ user: makeUser() });
    expect(component['selectedAccountId']).toBe('');
    expect(dataService.fetchPortfolioDetails).toHaveBeenLastCalledWith({
      filters: []
    });
  });

  it('cancels stale account-switch responses', () => {
    const stale = new Subject<PortfolioDetails>();
    dataService.fetchPortfolioDetails.mockReturnValueOnce(stale);
    component['changeAccount']('one');
    component['changeAccount']('');
    stale.next({ ...makeDetails(), holdings: [], accounts: {} });
    expect(component['result'].status).toBe('ready');
  });

  it('clears financial data and cancels pending requests on impersonation', () => {
    impersonation.next('another-user');
    expect(component['result']).toBeUndefined();
    expect(component['accounts']).toEqual([]);
    expect(component['canEdit']).toBe(false);
  });

  it('does not request monetary data after values permission is removed', () => {
    dataService.fetchPortfolioDetails.mockClear();
    const user = makeUser();
    user.scopes = [];
    state.next({ user });
    expect(dataService.fetchPortfolioDetails).not.toHaveBeenCalled();
    expect(component['result']).toBeUndefined();
  });

  it('does not request account data without account-read scope', () => {
    dataService.fetchAccounts.mockClear();
    const user = makeUser();
    user.scopes = [scopes.portfolioReadValues];
    state.next({ user });
    expect(dataService.fetchAccounts).not.toHaveBeenCalled();
    expect(dataService.fetchPortfolioDetails).toHaveBeenLastCalledWith({
      filters: []
    });
  });

  it('checks editing permission again when a dialog is submitted', () => {
    component['openConfiguration']();
    impersonation.next('another-user');
    afterClosed.next(createDefaultPortfolioTarget());
    expect(dataService.putUserSetting).not.toHaveBeenCalled();
  });

  it('always saves a global versioned configuration when viewing a single account', () => {
    component['changeAccount']('one');
    component['openConfiguration']();
    afterClosed.next(createDefaultPortfolioTarget());
    expect(dataService.putUserSetting).toHaveBeenCalledWith({
      portfolioTargets: {
        version: 1,
        activeProfileId: 'global',
        profiles: [createDefaultPortfolioTarget()]
      }
    });
  });

  it('preserves the allocation display on save failure and permits retry', () => {
    dataService.putUserSetting.mockReturnValue(
      throwError(() => new Error('failed'))
    );
    component['openConfiguration']();
    afterClosed.next(createDefaultPortfolioTarget());
    expect(component['hasSaveError']).toBe(true);
    expect(component['hasError']).toBe(false);
    expect(component['isSaving']).toBe(false);
    expect(component['result'].status).toBe('ready');
    component['openConfiguration']();
    expect(dialog.open).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({
        data: expect.objectContaining({
          profile: createDefaultPortfolioTarget()
        })
      })
    );
  });

  it('clears the allocation when the user state becomes unavailable', () => {
    state.next({ user: undefined });
    expect(component['result']).toBeUndefined();
    expect(component['accounts']).toEqual([]);
    expect(component['canEdit']).toBe(false);
  });
  it('does not bypass the backend error signal even if amounts look plausible', () => {
    dataService.fetchPortfolioDetails.mockReturnValue(
      of({ ...makeDetails(), hasError: true })
    );
    component['changeAccount']('');
    expect(component['hasError']).toBe(true);
    expect(component['result']).toBeUndefined();
  });

  it('clears monetary results when restricted view is enabled', () => {
    dataService.fetchPortfolioDetails.mockClear();
    const user = makeUser();
    user.settings.isRestrictedView = true;
    state.next({ user });
    expect(dataService.fetchPortfolioDetails).not.toHaveBeenCalled();
    expect(component['result']).toBeUndefined();
  });
  it('identifies negative balances as unsupported even with a backend error', () => {
    const details = makeDetails();
    details.accounts.one.balance = -10;
    details.accounts.one.valueInBaseCurrency = -10;
    details.summary.accountCashInBaseCurrency = -10;
    details.summary.cash = -10;
    dataService.fetchPortfolioDetails.mockReturnValue(
      of({ ...details, hasError: true })
    );
    component['changeAccount']('');
    expect(component['hasError']).toBe(false);
    expect(component['result'].status).toBe('unsupported');
    expect(component['result'].rows).toEqual([]);
  });

  it('shows no allocation when an older backend omits independent cash', () => {
    const details = makeDetails();
    delete details.summary.accountCashInBaseCurrency;
    dataService.fetchPortfolioDetails.mockReturnValue(of(details));
    component['changeAccount']('');
    expect(component['result'].status).toBe('unavailable');
    expect(component['result'].rows).toEqual([]);
  });
});
