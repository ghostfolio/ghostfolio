import { MarketSentiment } from '@ghostfolio/common/interfaces';

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GfMarketSentimentSummaryComponent } from './market-sentiment-summary.component';

describe('GfMarketSentimentSummaryComponent', () => {
  let component: GfMarketSentimentSummaryComponent;
  let fixture: ComponentFixture<GfMarketSentimentSummaryComponent>;

  const marketSentiment: MarketSentiment = {
    averageBullishPct: 62.4,
    averageBuzzScore: 48.7,
    coverage: 3,
    sourceAlignment: 'ALIGNED',
    sourceMetrics: [
      {
        activityCount: 120,
        bullishPct: 61,
        buzzScore: 54.2,
        source: 'REDDIT',
        trend: 'RISING'
      },
      {
        activityCount: 88,
        bullishPct: 63,
        buzzScore: 49.9,
        source: 'X',
        trend: 'RISING'
      }
    ],
    trend: 'RISING'
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GfMarketSentimentSummaryComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(GfMarketSentimentSummaryComponent);
    component = fixture.componentInstance;
    component.marketSentiment = marketSentiment;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the summary metrics', () => {
    const textContent = fixture.nativeElement.textContent;

    expect(textContent).toContain('Buzz');
    expect(textContent).toContain('Bullish');
    expect(textContent).toContain('Coverage');
    expect(textContent).toContain('Alignment');
    expect(textContent).toContain('48.7');
    expect(textContent).toContain('62%');
  });

  it('should render source rows when requested', () => {
    fixture.componentRef.setInput('showSources', true);
    fixture.detectChanges();

    const textContent = fixture.nativeElement.textContent;

    expect(textContent).toContain('Reddit');
    expect(textContent).toContain('X');
    expect(textContent).toContain('Mentions: 120');
  });
});
