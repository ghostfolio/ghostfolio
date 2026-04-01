import {
  MarketSentiment,
  MarketSentimentSource
} from '@ghostfolio/common/interfaces';

import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  selector: 'gf-market-sentiment-summary',
  styleUrls: ['./market-sentiment-summary.component.scss'],
  templateUrl: './market-sentiment-summary.component.html'
})
export class GfMarketSentimentSummaryComponent {
  @Input({ required: true }) marketSentiment: MarketSentiment;
  @Input() showSources = false;

  public get alignmentLabel() {
    return this.marketSentiment?.sourceAlignment
      ?.replaceAll('_', ' ')
      .toLowerCase();
  }

  public get sortedSourceMetrics() {
    return [...(this.marketSentiment?.sourceMetrics ?? [])].sort((a, b) => {
      return b.buzzScore - a.buzzScore;
    });
  }

  public get trendLabel() {
    return this.marketSentiment?.trend?.toLowerCase();
  }

  public getActivityLabel(sourceMetric: MarketSentimentSource) {
    return sourceMetric.source === 'POLYMARKET' ? 'Trades' : 'Mentions';
  }

  public getSourceLabel(sourceMetric: MarketSentimentSource) {
    switch (sourceMetric.source) {
      case 'NEWS':
        return 'Finance News';
      case 'POLYMARKET':
        return 'Polymarket';
      case 'REDDIT':
        return 'Reddit';
      case 'X':
        return 'X.com';
    }
  }

  public getTrendClass(sourceMetric?: MarketSentimentSource) {
    switch (sourceMetric?.trend ?? this.marketSentiment?.trend) {
      case 'FALLING':
        return 'is-falling';
      case 'RISING':
        return 'is-rising';
      default:
        return 'is-neutral';
    }
  }
}
