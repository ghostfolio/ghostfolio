import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject,
  OnDestroy,
  OnInit
} from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { DataService } from '@ghostfolio/client/services/data.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { downloadAsFile } from '@ghostfolio/common/helper';
import { User, HistoricalDataItem } from '@ghostfolio/common/interfaces';
import { OrderWithAccount } from '@ghostfolio/common/types';
import { translate } from '@ghostfolio/ui/i18n';
import Big from 'big.js';
import { format, parseISO, differenceInDays } from 'date-fns';
import { isNumber } from 'lodash';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ImpersonationStorageService } from '@ghostfolio/client/services/impersonation-storage.service';

import { AccountDetailDialogParams } from './interfaces/interfaces';

@Component({
  host: { class: 'd-flex flex-column h-100' },
  selector: 'gf-account-detail-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: 'account-detail-dialog.html',
  styleUrls: ['./account-detail-dialog.component.scss']
})
export class AccountDetailDialog implements OnDestroy, OnInit {
  public balance: number;
  public currency: string;
  public daysInMarket: number;
  public equity: number;
  public hasImpersonationId: boolean;
  public isLoadingBenchmarkComparator: boolean;
  public name: string;
  public orders: OrderWithAccount[];
  public performanceDataItems: HistoricalDataItem[];
  public platformName: string;
  public transactionCount: number;
  public user: User;
  public valueInBaseCurrency: number;

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    @Inject(MAT_DIALOG_DATA) public data: AccountDetailDialogParams,
    private dataService: DataService,
    public dialogRef: MatDialogRef<AccountDetailDialog>,
    private impersonationStorageService: ImpersonationStorageService,
    private userService: UserService
  ) {
    this.userService.stateChanged
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((state) => {
        if (state?.user) {
          this.user = state.user;

          this.update();

          this.changeDetectorRef.markForCheck();
        }
      });
  }

  public ngOnInit(): void {
    this.impersonationStorageService
      .onChangeHasImpersonation()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((impersonationId) => {
        this.hasImpersonationId = !!impersonationId;
      });

    this.dataService
      .fetchAccount(this.data.accountId)
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(
        ({
          balance,
          currency,
          name,
          Platform,
          transactionCount,
          value,
          valueInBaseCurrency
        }) => {
          this.balance = balance;
          this.currency = currency;

          if (isNumber(balance) && isNumber(value)) {
            this.equity = new Big(value).minus(balance).toNumber();
          } else {
            this.equity = null;
          }

          this.name = name;
          this.platformName = Platform?.name ?? '-';
          this.transactionCount = transactionCount;
          this.valueInBaseCurrency = valueInBaseCurrency;

          this.changeDetectorRef.markForCheck();
        }
      );

    this.dataService
      .fetchActivities({
        filters: [{ id: this.data.accountId, type: 'ACCOUNT' }]
      })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(({ activities }) => {
        this.orders = activities;

        this.changeDetectorRef.markForCheck();
      });
  }

  public onClose(): void {
    this.dialogRef.close();
  }

  public onExport() {
    this.dataService
      .fetchExport(
        this.orders.map((order) => {
          return order.id;
        })
      )
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((data) => {
        downloadAsFile({
          content: data,
          fileName: `ghostfolio-export-${this.name
            .replace(/\s+/g, '-')
            .toLowerCase()}-${format(
            parseISO(data.meta.date),
            'yyyyMMddHHmm'
          )}.json`,
          format: 'json'
        });
      });
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }

  private update() {
    this.isLoadingBenchmarkComparator = false;

    this.dataService
      .fetchPortfolioPerformance({
        range: this.user?.settings?.dateRange
      })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(({ chart, firstOrderDate }) => {
        this.daysInMarket = differenceInDays(new Date(), firstOrderDate);

        this.performanceDataItems = [];

        for (const [
          index,
          { date, value, valueInPercentage }
        ] of chart.entries()) {
          if (index > 0 || this.user?.settings?.dateRange === 'max') {
            // Ignore first item where value is 0
            this.performanceDataItems.push({
              date,
              value: isNumber(value) ? value : valueInPercentage
            });
          }
        }
        this.changeDetectorRef.markForCheck();
      });

    this.changeDetectorRef.markForCheck();
  }
}
