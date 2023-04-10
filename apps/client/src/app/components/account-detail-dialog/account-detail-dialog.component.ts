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
import { User } from '@ghostfolio/common/interfaces';
import { OrderWithAccount } from '@ghostfolio/common/types';
import { translate } from '@ghostfolio/ui/i18n';
import { format, parseISO } from 'date-fns';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { AccountDetailDialogParams } from './interfaces/interfaces';

@Component({
  host: { class: 'd-flex flex-column h-100' },
  selector: 'gf-account-detail-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: 'account-detail-dialog.html',
  styleUrls: ['./account-detail-dialog.component.scss']
})
export class AccountDetailDialog implements OnDestroy, OnInit {
  public accountType: string;
  public name: string;
  public orders: OrderWithAccount[];
  public platformName: string;
  public user: User;
  public valueInBaseCurrency: number;

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    @Inject(MAT_DIALOG_DATA) public data: AccountDetailDialogParams,
    private dataService: DataService,
    public dialogRef: MatDialogRef<AccountDetailDialog>,
    private userService: UserService
  ) {
    this.userService.stateChanged
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((state) => {
        if (state?.user) {
          this.user = state.user;

          this.changeDetectorRef.markForCheck();
        }
      });
  }

  public ngOnInit(): void {
    this.dataService
      .fetchAccount(this.data.accountId)
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(({ accountType, name, Platform, valueInBaseCurrency }) => {
        this.accountType = translate(accountType);
        this.name = name;
        this.platformName = Platform?.name ?? '-';
        this.valueInBaseCurrency = valueInBaseCurrency;

        this.changeDetectorRef.markForCheck();
      });

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
}
