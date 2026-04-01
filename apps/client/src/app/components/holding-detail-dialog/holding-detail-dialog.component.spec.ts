import { UserService } from '@ghostfolio/client/services/user/user.service';
import { GfAccountsTableComponent } from '@ghostfolio/ui/accounts-table';
import { GfActivitiesTableComponent } from '@ghostfolio/ui/activities-table';
import { GfDataProviderCreditsComponent } from '@ghostfolio/ui/data-provider-credits';
import { GfDialogFooterComponent } from '@ghostfolio/ui/dialog-footer';
import { GfDialogHeaderComponent } from '@ghostfolio/ui/dialog-header';
import { GfHistoricalMarketDataEditorComponent } from '@ghostfolio/ui/historical-market-data-editor';
import { GfLineChartComponent } from '@ghostfolio/ui/line-chart';
import { GfMarketSentimentSummaryComponent } from '@ghostfolio/ui/market-sentiment-summary';
import { GfPortfolioProportionChartComponent } from '@ghostfolio/ui/portfolio-proportion-chart';
import { DataService } from '@ghostfolio/ui/services';
import { GfTagsSelectorComponent } from '@ghostfolio/ui/tags-selector';
import { GfValueComponent } from '@ghostfolio/ui/value';

import { Component, CUSTOM_ELEMENTS_SCHEMA, forwardRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { FormBuilder } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { of, Subject } from 'rxjs';

import { GfHoldingDetailDialogComponent } from './holding-detail-dialog.component';

jest.mock('@ionic/angular/standalone', () => {
  class MockIonIconComponent {}

  return { IonIcon: MockIonIconComponent };
});

jest.mock('color', () => {
  return () => ({
    alpha: () => ({
      rgb: () => ({
        string: () => 'rgba(0,0,0,1)'
      })
    })
  });
});

@Component({
  providers: [
    {
      multi: true,
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MockTagsSelectorComponent)
    }
  ],
  selector: 'gf-tags-selector',
  standalone: true,
  template: ''
})
class MockTagsSelectorComponent implements ControlValueAccessor {
  public registerOnChange(fn: (value: unknown) => void) {
    void fn;
  }

  public registerOnTouched(fn: () => void) {
    void fn;
  }

  public setDisabledState(isDisabled: boolean) {
    void isDisabled;
  }

  public writeValue(value: unknown) {
    void value;
  }
}

describe('GfHoldingDetailDialogComponent', () => {
  let component: GfHoldingDetailDialogComponent;
  let fixture: ComponentFixture<GfHoldingDetailDialogComponent>;

  const stateChanged = new Subject<any>();

  beforeEach(async () => {
    TestBed.overrideComponent(GfHoldingDetailDialogComponent, {
      remove: {
        imports: [
          GfAccountsTableComponent,
          GfActivitiesTableComponent,
          GfDataProviderCreditsComponent,
          GfDialogFooterComponent,
          GfDialogHeaderComponent,
          GfHistoricalMarketDataEditorComponent,
          GfLineChartComponent,
          GfMarketSentimentSummaryComponent,
          GfPortfolioProportionChartComponent,
          GfTagsSelectorComponent,
          GfValueComponent,
          IonIcon
        ]
      },
      add: {
        imports: [MockTagsSelectorComponent]
      }
    });

    await TestBed.configureTestingModule({
      imports: [GfHoldingDetailDialogComponent],
      providers: [
        {
          provide: DataService,
          useValue: {
            fetchAccounts: jest.fn().mockReturnValue(of({ accounts: [] })),
            fetchActivities: jest.fn().mockReturnValue(of({ activities: [] })),
            fetchHoldingDetail: jest.fn().mockReturnValue(
              of({
                activitiesCount: 1,
                averagePrice: 100,
                dataProviderInfo: undefined,
                dateOfFirstActivity: '2024-01-02',
                dividendInBaseCurrency: 0,
                dividendYieldPercentWithCurrencyEffect: 0,
                feeInBaseCurrency: 0,
                historicalData: [],
                investmentInBaseCurrencyWithCurrencyEffect: 1000,
                marketPrice: 120,
                marketPriceMax: 130,
                marketPriceMin: 90,
                marketSentiment: {
                  averageBullishPct: 58,
                  averageBuzzScore: 44,
                  coverage: 3,
                  sourceAlignment: 'MIXED',
                  sourceMetrics: [],
                  trend: 'RISING'
                },
                netPerformance: 20,
                netPerformancePercent: 0.2,
                netPerformancePercentWithCurrencyEffect: 0.2,
                netPerformanceWithCurrencyEffect: 20,
                quantity: 5,
                SymbolProfile: {
                  assetSubClass: 'STOCK',
                  countries: [],
                  currency: 'USD',
                  dataSource: 'YAHOO',
                  sectors: [],
                  symbol: 'AAPL'
                },
                tags: [],
                value: 600
              })
            ),
            fetchMarketData: jest.fn().mockReturnValue(of([])),
            postActivity: jest.fn(),
            postTag: jest.fn(),
            putHoldingTags: jest.fn()
          }
        },
        { provide: FormBuilder, useValue: new FormBuilder() },
        { provide: MatDialogRef, useValue: { close: jest.fn() } },
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            baseCurrency: 'USD',
            colorScheme: 'light',
            dataSource: 'YAHOO',
            deviceType: 'desktop',
            locale: 'en',
            symbol: 'AAPL'
          }
        },
        { provide: Router, useValue: { navigate: jest.fn() } },
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

    fixture = TestBed.createComponent(GfHoldingDetailDialogComponent);
    component = fixture.componentInstance;
    component.user = {
      permissions: [],
      settings: { isExperimentalFeatures: false }
    } as any;
    fixture.detectChanges();
  });

  it('should expose market sentiment from the holding detail response', () => {
    expect(component.marketSentiment?.averageBuzzScore).toBe(44);
    expect(component.marketSentiment?.coverage).toBe(3);
  });
});
