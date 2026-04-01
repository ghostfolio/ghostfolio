import { ImpersonationStorageService } from '@ghostfolio/client/services/impersonation-storage.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { Benchmark, User } from '@ghostfolio/common/interfaces';
import { GfBenchmarkComponent } from '@ghostfolio/ui/benchmark';
import { GfMarketSentimentSummaryComponent } from '@ghostfolio/ui/market-sentiment-summary';
import { GfPremiumIndicatorComponent } from '@ghostfolio/ui/premium-indicator';
import { DataService } from '@ghostfolio/ui/services';

import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { DeviceDetectorService } from 'ngx-device-detector';
import { of, Subject } from 'rxjs';

import { GfHomeWatchlistComponent } from './home-watchlist.component';

jest.mock('@ionic/angular/standalone', () => {
  class MockIonIconComponent {}

  return { IonIcon: MockIonIconComponent };
});

describe('GfHomeWatchlistComponent', () => {
  let component: GfHomeWatchlistComponent;
  let fixture: ComponentFixture<GfHomeWatchlistComponent>;

  const stateChanged = new Subject<{ user: User }>();

  beforeEach(async () => {
    TestBed.overrideComponent(GfHomeWatchlistComponent, {
      remove: {
        imports: [
          GfBenchmarkComponent,
          GfMarketSentimentSummaryComponent,
          GfPremiumIndicatorComponent,
          IonIcon
        ]
      }
    });

    await TestBed.configureTestingModule({
      imports: [GfHomeWatchlistComponent],
      providers: [
        {
          provide: DataService,
          useValue: {
            fetchWatchlist: jest.fn().mockReturnValue(of({ watchlist: [] }))
          }
        },
        {
          provide: DeviceDetectorService,
          useValue: {
            getDeviceInfo: () => ({ deviceType: 'desktop' })
          }
        },
        { provide: MatDialog, useValue: { open: jest.fn() } },
        {
          provide: ImpersonationStorageService,
          useValue: {
            onChangeHasImpersonation: () => of(null)
          }
        },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParams: of({})
          }
        },
        {
          provide: Router,
          useValue: { navigate: jest.fn() }
        },
        {
          provide: UserService,
          useValue: {
            stateChanged,
            get: jest.fn().mockReturnValue(of({}))
          }
        }
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(GfHomeWatchlistComponent);
    component = fixture.componentInstance;
    component.user = {
      permissions: [],
      settings: { locale: 'en' },
      subscription: { type: 'Basic' }
    } as unknown as User;
    fixture.detectChanges();
  });

  it('should sort market sentiment cards by buzz score', () => {
    component.watchlist = [
      {
        dataSource: 'YAHOO',
        marketSentiment: {
          averageBuzzScore: 31,
          coverage: 2,
          sourceAlignment: 'MIXED',
          sourceMetrics: [],
          trend: 'STABLE'
        },
        name: 'AAPL',
        symbol: 'AAPL'
      },
      {
        dataSource: 'YAHOO',
        marketSentiment: {
          averageBuzzScore: 57,
          coverage: 3,
          sourceAlignment: 'ALIGNED',
          sourceMetrics: [],
          trend: 'RISING'
        },
        name: 'TSLA',
        symbol: 'TSLA'
      },
      {
        dataSource: 'YAHOO',
        marketSentiment: undefined,
        name: 'BND',
        symbol: 'BND'
      }
    ] as Benchmark[];

    expect(
      component.watchlistWithMarketSentiment.map(({ symbol }) => symbol)
    ).toEqual(['TSLA', 'AAPL']);
  });
});
