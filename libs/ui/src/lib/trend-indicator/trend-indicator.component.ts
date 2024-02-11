import { DateRange, MarketState } from '@ghostfolio/common/types';

import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'gf-trend-indicator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './trend-indicator.component.html',
  styleUrls: ['./trend-indicator.component.scss']
})
export class TrendIndicatorComponent {
  @Input() isLoading = false;
  @Input() marketState: MarketState = 'open';
  @Input() range: DateRange = 'max';
  @Input() size: 'large' | 'medium' | 'small' = 'small';
  @Input() value = 0;

  public constructor() {}
}
