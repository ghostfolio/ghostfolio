import { UpdateMarketDataDto } from '@ghostfolio/api/app/admin/update-market-data.dto';
import { AdminService } from '@ghostfolio/client/services/admin.service';
import {
  DATE_FORMAT,
  getDateFormatString,
  getLocale
} from '@ghostfolio/common/helper';
import { LineChartItem, User } from '@ghostfolio/common/interfaces';
import { AssetProfileDialogParams } from '@ghostfolio/ui/admin-market-data-detail/interfaces/interfaces';

import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Inject,
  Input,
  OnChanges,
  OnInit,
  Output
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DataSource, MarketData } from '@prisma/client';
import {
  addDays,
  addMonths,
  format,
  isBefore,
  isSameDay,
  isToday,
  isValid,
  min,
  parse,
  parseISO
} from 'date-fns';
import { first, last } from 'lodash';
import { DeviceDetectorService } from 'ngx-device-detector';
import { parse as csvToJson } from 'papaparse';
import { EMPTY, Subject, takeUntil } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { MarketDataDetailDialogParams } from './market-data-detail-dialog/interfaces/interfaces';
import { MarketDataDetailDialogComponent } from './market-data-detail-dialog/market-data-detail-dialog.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, MatButtonModule, MatInputModule],
  selector: 'gf-admin-market-data-detail',
  standalone: true,
  styleUrls: ['./admin-market-data-detail.component.scss'],
  templateUrl: './admin-market-data-detail.component.html'
})
export class AdminMarketDataDetailComponent implements OnChanges, OnInit {
  @Input() currency: string;
  @Input() dataSource: DataSource;
  @Input() dateOfFirstActivity: string;
  @Input() locale = getLocale();
  @Input() marketData: MarketData[];
  @Input() symbol: string;
  @Input() user: User;

  @Output() marketDataChanged = new EventEmitter<boolean>();
  @Output() updateHistoricalData = new EventEmitter();

  public days = Array(31);
  public defaultDateFormat: string;
  public deviceType: string;
  public historicalDataItems: LineChartItem[];
  public marketDataByMonth: {
    [yearMonth: string]: {
      [day: string]: Pick<MarketData, 'date' | 'marketPrice'> & { day: number };
    };
  } = {};

  public historicalDataForm = this.formBuilder.group({
    historicalData: this.formBuilder.group({
      csvString: ''
    })
  });

  private static readonly HISTORICAL_DATA_TEMPLATE = `date;marketPrice\n${format(
    new Date(),
    DATE_FORMAT
  )};123.45`;

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private adminService: AdminService,
    @Inject(MAT_DIALOG_DATA) public data: AssetProfileDialogParams,
    private deviceService: DeviceDetectorService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private formBuilder: FormBuilder
  ) {
    this.deviceType = this.deviceService.getDeviceInfo().deviceType;
  }

  public ngOnInit() {
    this.initializeHistoricalDataForm();
  }

  public ngOnChanges() {
    this.defaultDateFormat = getDateFormatString(this.locale);

    this.historicalDataItems = this.marketData.map(({ date, marketPrice }) => {
      return {
        date: format(date, DATE_FORMAT),
        value: marketPrice
      };
    });

    if (this.dateOfFirstActivity) {
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

      const marketDataItems = [...missingMarketData, ...this.marketData];

      if (!isToday(last(marketDataItems)?.date)) {
        marketDataItems.push({ date: new Date() });
      }

      this.marketDataByMonth = {};

      for (const marketDataItem of marketDataItems) {
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

      // Fill up missing months
      const dates = Object.keys(this.marketDataByMonth).sort();
      const startDate = min([
        parseISO(this.dateOfFirstActivity),
        parseISO(first(dates))
      ]);
      const endDate = parseISO(last(dates));

      let currentDate = startDate;

      while (isBefore(currentDate, endDate)) {
        const key = format(currentDate, 'yyyy-MM');
        if (!this.marketDataByMonth[key]) {
          this.marketDataByMonth[key] = {};
        }

        currentDate = addMonths(currentDate, 1);
      }
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
    const marketPrice = this.marketDataByMonth[yearMonth]?.[day]?.marketPrice;

    const dialogRef = this.dialog.open(MarketDataDetailDialogComponent, {
      data: {
        marketPrice,
        currency: this.currency,
        dataSource: this.dataSource,
        dateString: `${yearMonth}-${day}`,
        symbol: this.symbol,
        user: this.user
      } as MarketDataDetailDialogParams,
      height: this.deviceType === 'mobile' ? '98vh' : '80vh',
      width: this.deviceType === 'mobile' ? '100vw' : '50rem'
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(({ withRefresh } = { withRefresh: false }) => {
        this.marketDataChanged.next(withRefresh);
      });
  }

  public onImportHistoricalData() {
    try {
      const marketData = csvToJson(
        this.historicalDataForm.controls['historicalData'].controls['csvString']
          .value,
        {
          dynamicTyping: true,
          header: true,
          skipEmptyLines: true
        }
      ).data as UpdateMarketDataDto[];

      this.adminService
        .postMarketData({
          dataSource: this.data.dataSource,
          marketData: {
            marketData
          },
          symbol: this.data.symbol
        })
        .pipe(
          catchError(({ error, message }) => {
            this.snackBar.open(`${error}: ${message[0]}`, undefined, {
              duration: 3000
            });
            return EMPTY;
          }),
          takeUntil(this.unsubscribeSubject)
        )
        .subscribe(() => {
          this.updateHistoricalData.emit();
          this.initializeHistoricalDataForm();
        });
    } catch {
      this.snackBar.open(
        $localize`Oops! Could not parse historical data.`,
        undefined,
        { duration: 3000 }
      );
    }
  }

  public initializeHistoricalDataForm() {
    this.historicalDataForm.setValue({
      historicalData: {
        csvString: AdminMarketDataDetailComponent.HISTORICAL_DATA_TEMPLATE
      }
    });
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
