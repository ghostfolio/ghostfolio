import { LayoutService } from '@ghostfolio/client/core/layout.service';
import { ImpersonationStorageService } from '@ghostfolio/client/services/impersonation-storage.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import type { HistoricalDataItem, User } from '@ghostfolio/common/interfaces';
import { DataService } from '@ghostfolio/ui/services';

import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { DeviceDetectorService } from 'ngx-device-detector';
import { EMPTY, Subject } from 'rxjs';

import { GfHomeOverviewComponent } from './home-overview.component';

jest.mock('@ghostfolio/client/services/user/user.service', () => ({
  UserService: class MockUserService {}
}));

jest.mock('@ionic/angular/standalone', () => {
  const { Component } = jest.requireActual('@angular/core');

  const IonIcon = Component({
    selector: 'ion-icon',
    standalone: true,
    template: ''
  })(class MockIonIcon {});

  return { IonIcon };
});

describe('Home overview PnL calendar', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: DataService,
          useValue: {
            fetchPortfolioPerformance: jest.fn()
          }
        },
        {
          provide: UserService,
          useValue: {
            stateChanged: EMPTY
          }
        },
        {
          provide: LayoutService,
          useValue: {}
        },
        {
          provide: ImpersonationStorageService,
          useValue: {}
        },
        {
          provide: Router,
          useValue: {}
        },
        {
          provide: DeviceDetectorService,
          useValue: {
            deviceInfo: () => ({ deviceType: 'desktop' })
          }
        }
      ]
    });
  });

  it('initializes without rendering the Home Overview template', () => {
    const component = TestBed.runInInjectionContext(
      () => new GfHomeOverviewComponent()
    );

    expect(component).toBeDefined();
  });

  it('ignores stale calendar responses and errors after a newer reload', () => {
    type PerformanceResponse =
      ReturnType<
        DataService['fetchPortfolioPerformance']
      > extends import('rxjs').Observable<infer T>
        ? T
        : never;

    const mainA = new Subject<PerformanceResponse>();
    const calendarA = new Subject<PerformanceResponse>();
    const mainB = new Subject<PerformanceResponse>();
    const calendarB = new Subject<PerformanceResponse>();

    const fetchPerformance = jest.mocked(
      TestBed.inject(DataService).fetchPortfolioPerformance
    );

    fetchPerformance
      .mockReturnValueOnce(mainA)
      .mockReturnValueOnce(calendarA)
      .mockReturnValueOnce(mainB)
      .mockReturnValueOnce(calendarB);

    const component = TestBed.runInInjectionContext(
      () => new GfHomeOverviewComponent()
    );

    component['user'].set({
      settings: { dateRange: '1y' }
    } as unknown as User);

    component['update']();
    component['update']();

    expect(fetchPerformance).toHaveBeenCalledTimes(4);

    const newerChart = [{ date: '2026-11-17' }] as HistoricalDataItem[];

    const olderChart = [{ date: '2026-11-16' }] as HistoricalDataItem[];

    calendarB.next({
      chart: newerChart
    } as PerformanceResponse);

    expect(component['pnlCalendarChart']()).toBe(newerChart);

    calendarA.next({
      chart: olderChart
    } as PerformanceResponse);

    expect(component['pnlCalendarChart']()).toBe(newerChart);

    calendarA.error(new Error('Obsolete request failed'));

    expect(component['pnlCalendarChart']()).toBe(newerChart);
  });

  it('ignores stale main performance responses when date range is max', () => {
    type PerformanceResponse =
      ReturnType<
        DataService['fetchPortfolioPerformance']
      > extends import('rxjs').Observable<infer T>
        ? T
        : never;

    const mainA = new Subject<PerformanceResponse>();
    const mainB = new Subject<PerformanceResponse>();

    const fetchPerformance = jest.mocked(
      TestBed.inject(DataService).fetchPortfolioPerformance
    );

    fetchPerformance.mockReturnValueOnce(mainA).mockReturnValueOnce(mainB);

    const component = TestBed.runInInjectionContext(
      () => new GfHomeOverviewComponent()
    );

    component['user'].set({
      settings: { dateRange: 'max' }
    } as unknown as User);

    component['update']();
    component['update']();

    expect(fetchPerformance).toHaveBeenCalledTimes(2);

    const newerChart = [{ date: '2026-11-17' }] as HistoricalDataItem[];

    const olderChart = [{ date: '2026-11-16' }] as HistoricalDataItem[];

    mainB.next({
      chart: newerChart,
      errors: [],
      performance: { currentValueInBaseCurrency: 0 }
    } as PerformanceResponse);

    expect(component['pnlCalendarChart']()).toBe(newerChart);

    mainA.next({
      chart: olderChart,
      errors: [],
      performance: { currentValueInBaseCurrency: 0 }
    } as PerformanceResponse);

    expect(component['pnlCalendarChart']()).toBe(newerChart);
  });
});
