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
import { ImpersonationStorageService } from '@ghostfolio/client/services/impersonation-storage.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { downloadAsFile } from '@ghostfolio/common/helper';
import {
  AccountBalancesResponse,
  HistoricalDataItem,
  User
} from '@ghostfolio/common/interfaces';
import { OrderWithAccount } from '@ghostfolio/common/types';
import Big from 'big.js';
import { format, parseISO } from 'date-fns';
import { isNumber } from 'lodash';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { AccountDetailDialogParams } from './interfaces/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';

@Component({
  host: { class: 'd-flex flex-column h-100' },
  selector: 'gf-account-detail-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: 'account-detail-dialog.html',
  styleUrls: ['./account-detail-dialog.component.scss']
})
export class AccountDetailDialog implements OnDestroy, OnInit {
  public accountBalances: AccountBalancesResponse['balances'];
  public activities: OrderWithAccount[];
  public balance: number;
  public currency: string;
  public equity: number;
  public hasImpersonationId: boolean;
  public hasPermissionToDeleteAccountBalance: boolean;
  public historicalDataItems: HistoricalDataItem[];
  public isLoadingActivities: boolean;
  public isLoadingChart: boolean;
  public name: string;
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

          this.hasPermissionToDeleteAccountBalance = hasPermission(
            this.user.permissions,
            permissions.deleteAccountBalance
          );

          this.changeDetectorRef.markForCheck();
        }
      });
  }

  public ngOnInit() {
    this.isLoadingActivities = true;

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
        this.activities = activities;

        this.isLoadingActivities = false;

        this.changeDetectorRef.markForCheck();
      });

    this.impersonationStorageService
      .onChangeHasImpersonation()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((impersonationId) => {
        this.hasImpersonationId = !!impersonationId;
      });

    this.fetchAccountBalances();
    this.fetchPortfolioPerformance();
  }

  public onClose() {
    this.dialogRef.close();
  }

  public onDeleteAccountBalance(aId: string) {
    this.dataService
      .deleteAccountBalance(aId)
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe({
        next: () => {
          this.fetchAccountBalances();
          this.fetchPortfolioPerformance();
        }
      });
  }

  public onExport() {
    this.dataService
      .fetchExport(
        this.activities.map(({ id }) => {
          return id;
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

  private fetchAccountBalances() {
    this.dataService
      .fetchAccountBalances(this.data.accountId)
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(({ balances }) => {
        this.accountBalances = balances;

        this.changeDetectorRef.markForCheck();
      });
  }

  private fetchPortfolioPerformance() {
    this.isLoadingChart = true;

    this.dataService
      .fetchPortfolioPerformance({
        filters: [
          {
            id: this.data.accountId,
            type: 'ACCOUNT'
          }
        ],
        range: 'max',
        withExcludedAccounts: true
      })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(({ chart }) => {
        this.historicalDataItems = chart.map(
          ({ date, netWorth, netWorthInPercentage }) => {
            return {
              date,
              value:
                this.hasImpersonationId || this.user.settings.isRestrictedView
                  ? netWorthInPercentage
                  : netWorth
            };
          }
        );

        this.isLoadingChart = false;

        this.changeDetectorRef.markForCheck();
      });
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
