import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

import { MarketState } from '../../../../../apps/api/src/services/interfaces/interfaces'; // TODO: @ghostfolio/api/services/interfaces/interfaces
import { DateRange } from '../../../../common/src/lib/types'; // TODO: @ghostfolio/common/types

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
