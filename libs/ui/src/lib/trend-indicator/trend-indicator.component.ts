import { DateRange, MarketState } from '@ghostfolio/common/types';

import {
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
  Component,
  Input
} from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowDownCircleOutline,
  arrowForwardCircleOutline,
  arrowUpCircleOutline,
  pauseCircleOutline,
  timeOutline
} from 'ionicons/icons';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonIcon, NgxSkeletonLoaderModule],
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

  public constructor() {
    addIcons({
      arrowDownCircleOutline,
      arrowForwardCircleOutline,
      arrowUpCircleOutline,
      pauseCircleOutline,
      timeOutline
    });
  }
}
