import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges,
  OnInit
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { DEFAULT_DATE_FORMAT } from '@ghostfolio/common/config';
import { DATE_FORMAT } from '@ghostfolio/common/helper';
import { MarketData } from '@prisma/client';
import { format, isBefore, isValid, parse } from 'date-fns';
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
  @Input() marketData: MarketData[];

  public days = Array(31);
  public defaultDateFormat = DEFAULT_DATE_FORMAT;
  public deviceType: string;
  public marketDataByMonth: {
    [yearMonth: string]: { [day: string]: MarketData & { day: number } };
  } = {};

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private deviceService: DeviceDetectorService,
    private dialog: MatDialog
  ) {
    this.deviceType = this.deviceService.getDeviceInfo().deviceType;
  }

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

  public isDateOfInterest(aDateString: string) {
    // Date is valid and in the past
    const date = parse(aDateString, DATE_FORMAT, new Date());
    return isValid(date) && isBefore(date, new Date());
  }

  public onOpenMarketDataDetail({ date, marketPrice, symbol }: MarketData) {
    const dialogRef = this.dialog.open(MarketDataDetailDialog, {
      data: {
        marketPrice,
        symbol,
        date: format(date, DEFAULT_DATE_FORMAT)
      },
      height: this.deviceType === 'mobile' ? '97.5vh' : '80vh',
      width: this.deviceType === 'mobile' ? '100vw' : '50rem'
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(() => {});
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
