import { CashManagementSnapshot } from '@ghostfolio/common/interfaces';
import { DataService } from '@ghostfolio/ui/services';

import { Signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import '@angular/localize/init';
import { Router } from '@angular/router';
import { Observable, Subject, throwError } from 'rxjs';

import { GfCashManagementComponent } from './cash-management.component';

jest.mock('@ionic/angular/standalone', () => ({ IonIcon: class {} }));
jest.mock('ionicons', () => ({ addIcons: jest.fn() }));
jest.mock('ionicons/icons', () => ({ ellipsisVertical: 'ellipsis-vertical' }));

jest.mock('@ghostfolio/ui/services', () => ({ DataService: class {} }));

interface CashHarness {
  snapshot: Signal<CashManagementSnapshot | null | undefined>;
  error: Signal<string>;
  busy: Signal<boolean>;
  run(request: Observable<CashManagementSnapshot>): void;
}

describe('Cash account request isolation', () => {
  let fixture: ComponentFixture<GfCashManagementComponent>;
  let component: CashHarness;
  let initialA: Subject<CashManagementSnapshot>;
  let recoveryA: Subject<CashManagementSnapshot>;
  let initialB: Subject<CashManagementSnapshot>;
  let fetchCash: jest.Mock;
  const state = (accountId: string): CashManagementSnapshot => ({
    accountId,
    currency: 'EUR',
    defaultUpdateCash: true,
    revision: 1,
    events: [],
    balances: [{ date: '2026-10-01', value: '100' }],
    minimumBalance: { date: '2026-10-01', sequence: 0, value: '100' },
    openingBalance: { date: '2026-10-01', sequence: 0, balance: '100' }
  });

  beforeEach(async () => {
    initialA = new Subject();
    recoveryA = new Subject();
    initialB = new Subject();
    let callsA = 0;
    fetchCash = jest.fn((accountId: string) =>
      accountId === 'A' ? (++callsA === 1 ? initialA : recoveryA) : initialB
    );
    await TestBed.configureTestingModule({
      imports: [GfCashManagementComponent],
      providers: [
        { provide: DataService, useValue: { fetchCashManagement: fetchCash } },
        { provide: Router, useValue: { navigate: jest.fn() } }
      ]
    })
      .overrideComponent(GfCashManagementComponent, {
        set: { template: '', imports: [] }
      })
      .compileComponents();
    fixture = TestBed.createComponent(GfCashManagementComponent);
    component = fixture.componentInstance as unknown as CashHarness;
    fixture.componentRef.setInput('accountId', 'A');
    fixture.detectChanges();
    initialA.next(state('A'));
  });

  function switchToB() {
    fixture.componentRef.setInput('accountId', 'B');
    fixture.detectChanges();
    initialB.next(state('B'));
  }
  function rejectSave() {
    component.run(
      throwError(() => ({ error: { message: 'Rejected A save' } }))
    );
  }

  it('cancels the initial snapshot subscription when the account changes', () => {
    switchToB();
    initialA.next(state('A'));
    expect(component.snapshot()?.accountId).toBe('B');
  });
  it('does not replace account B with a late recovery response from account A', () => {
    rejectSave();
    switchToB();
    recoveryA.next(state('A'));
    expect(component.snapshot()?.accountId).toBe('B');
  });
  it('does not show an obsolete recovery error after the account changes', () => {
    rejectSave();
    switchToB();
    recoveryA.error(new Error('Old A recovery error'));
    expect(component.error()).toBe('');
  });
  it('ignores a late successful mutation from the previously selected account', () => {
    const pending = new Subject<CashManagementSnapshot>();
    component.run(pending);
    switchToB();
    pending.next(state('A'));
    pending.complete();
    expect(component.snapshot()?.accountId).toBe('B');
  });
  it('does not start recovery for a mutation rejected after the account changes', () => {
    const pending = new Subject<CashManagementSnapshot>();
    component.run(pending);
    switchToB();
    pending.error({ error: { message: 'Old save error' } });
    expect(fetchCash.mock.calls.map(([id]) => id)).toEqual(['A', 'B']);
    expect(component.error()).toBe('');
  });
  it('keeps the current-account recovery working', () => {
    rejectSave();
    recoveryA.next({ ...state('A'), revision: 2 });
    expect(component.snapshot()?.revision).toBe(2);
  });
});
