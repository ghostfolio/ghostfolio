import { DateRange, MarketState } from '@ghostfolio/common/types';


import {
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
  Component,
  Input
} from '@angular/core';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgxSkeletonLoaderModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'gf-trend-indicator',
  styleUrls: ['./trend-indicator.component.scss'],
  templateUrl: './trend-indicator.component.html'
})
export class GfTrendIndicatorComponent {
  @Input() dateRange: DateRange;
  @Input() isLoading = false;
  @Input() marketState: MarketState = 'open';
  @Input() size: 'large' | 'medium' | 'small' = 'small';
  @Input() value = 0;
}
