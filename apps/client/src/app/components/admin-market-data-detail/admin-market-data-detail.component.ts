import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import {
  DATE_FORMAT,
  getDateFormatString,
  getLocale
} from '@ghostfolio/common/helper';
import { User } from '@ghostfolio/common/interfaces';
import { LineChartItem } from '@ghostfolio/ui/line-chart/interfaces/line-chart.interface';
import { DataSource, MarketData } from '@prisma/client';
import {
  addDays,
  format,
  isBefore,
  isSameDay,
  isValid,
  parse,
  parseISO
} from 'date-fns';
import { DeviceDetectorService } from 'ngx-device-detector';
import { Subject, takeUntil } from 'rxjs';

import { MarketDataDetailDialog } from './market-data-detail-dialog/market-data-detail-dialog.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'gf-admin-market-data-detail',
  styleUrls: ['./admin-market-data-detail.component.scss'],
  templateUrl: './admin-market-data-detail.component.html'
})
export class AdminMarketDataDetailComponent implements OnChanges, OnInit {
  @Input() dataSource: DataSource;
  @Input() dateOfFirstActivity: string;
  @Input() locale = getLocale();
  @Input() marketData: MarketData[];
  @Input() symbol: string;

  @Output() marketDataChanged = new EventEmitter<boolean>();

  public days = Array(31);
  public defaultDateFormat: string;
  public deviceType: string;
  public historicalDataItems: LineChartItem[];
  public marketDataByMonth: {
    [yearMonth: string]: {
      [day: string]: Pick<MarketData, 'date' | 'marketPrice'> & { day: number };
    };
  } = {};
  public user: User;

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private deviceService: DeviceDetectorService,
    private dialog: MatDialog,
    private userService: UserService
  ) {
    this.deviceType = this.deviceService.getDeviceInfo().deviceType;

    this.userService.stateChanged
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((state) => {
        if (state?.user) {
          this.user = state.user;
        }
      });
  }

  public ngOnInit() {}

  public ngOnChanges() {
    this.defaultDateFormat = getDateFormatString(this.locale);

    this.historicalDataItems = this.marketData.map((marketDataItem) => {
      return {
        date: format(marketDataItem.date, DATE_FORMAT),
        value: marketDataItem.marketPrice
      };
    });

    let date = parseISO(this.dateOfFirstActivity);

    const missingMarketData: Partial<MarketData>[] = [];

    if (this.historicalDataItems?.[0]?.date) {
      while (
        isBefore(
          date,
          parse(this.historicalDataItems[0].date, DATE_FORMAT, new Date())
        )
      ) {
        missingMarketData.push({
          date,
          marketPrice: undefined
        });

        date = addDays(date, 1);
      }
    }

    this.marketDataByMonth = {};

    for (const marketDataItem of [...missingMarketData, ...this.marketData]) {
      const currentDay = parseInt(format(marketDataItem.date, 'd'), 10);
      const key = format(marketDataItem.date, 'yyyy-MM');

      if (!this.marketDataByMonth[key]) {
        this.marketDataByMonth[key] = {};
      }

      this.marketDataByMonth[key][
        currentDay < 10 ? `0${currentDay}` : currentDay
      ] = {
        date: marketDataItem.date,
        day: currentDay,
        marketPrice: marketDataItem.marketPrice
      };
    }
  }

  public isDateOfInterest(aDateString: string) {
    // Date is valid and in the past
    const date = parse(aDateString, DATE_FORMAT, new Date());
    return isValid(date) && isBefore(date, new Date());
  }

  public isToday(aDateString: string) {
    const date = parse(aDateString, DATE_FORMAT, new Date());
    return isValid(date) && isSameDay(date, new Date());
  }

  public onOpenMarketDataDetail({
    day,
    yearMonth
  }: {
    day: string;
    yearMonth: string;
  }) {
    const date = new Date(`${yearMonth}-${day}`);
    const marketPrice = this.marketDataByMonth[yearMonth]?.[day]?.marketPrice;

    if (isSameDay(date, new Date())) {
      return;
    }

    const dialogRef = this.dialog.open(MarketDataDetailDialog, {
      data: {
        date,
        marketPrice,
        dataSource: this.dataSource,
        symbol: this.symbol,
        user: this.user
      },
      height: this.deviceType === 'mobile' ? '97.5vh' : '80vh',
      width: this.deviceType === 'mobile' ? '100vw' : '50rem'
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(({ withRefresh }) => {
        this.marketDataChanged.next(withRefresh);
      });
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
