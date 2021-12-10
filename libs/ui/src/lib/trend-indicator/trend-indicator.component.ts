import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { MarketState } from '@ghostfolio/api/services/interfaces/interfaces';
import { DateRange } from '@ghostfolio/common/types';

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
  @Input() value = 0;

  public constructor() {}
}
