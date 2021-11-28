import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges,
  OnInit
} from '@angular/core';
import { DEFAULT_DATE_FORMAT } from '@ghostfolio/common/config';
import { MarketData } from '@prisma/client';
import { format } from 'date-fns';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'gf-admin-market-data-detail',
  styleUrls: ['./admin-market-data-detail.component.scss'],
  templateUrl: './admin-market-data-detail.component.html'
})
export class AdminMarketDataDetailComponent implements OnChanges, OnInit {
  @Input() marketData: MarketData[];

  public days = Array(31);
  public defaultDateFormat = DEFAULT_DATE_FORMAT;
  public marketDataByMonth: {
    [yearMonth: string]: { [day: string]: MarketData & { day: number } };
  } = {};

  public constructor() {}

  public ngOnInit() {}

  public ngOnChanges() {
    this.marketDataByMonth = {};

    for (const marketDataItem of this.marketData) {
      const currentDay = parseInt(format(marketDataItem.date, 'd'), 10);
      const key = format(marketDataItem.date, 'yyyy-MM');

      if (!this.marketDataByMonth[key]) {
        this.marketDataByMonth[key] = {};
      }

      this.marketDataByMonth[key][currentDay] = {
        ...marketDataItem,
        day: currentDay
      };
    }
  }
}
