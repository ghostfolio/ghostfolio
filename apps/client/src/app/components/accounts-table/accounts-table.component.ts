import { ConfirmationDialogType } from '@ghostfolio/client/core/notification/confirmation-dialog/confirmation-dialog.type';
import { NotificationService } from '@ghostfolio/client/core/notification/notification.service';
import { getLocale } from '@ghostfolio/common/helper';

import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  ViewChild
} from '@angular/core';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Router } from '@angular/router';
import { Account as AccountModel } from '@prisma/client';
import { get } from 'lodash';
import { Subject, Subscription } from 'rxjs';

@Component({
  selector: 'gf-accounts-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './accounts-table.component.html',
  styleUrls: ['./accounts-table.component.scss'],
  standalone: false
})
export class AccountsTableComponent implements OnChanges, OnDestroy {
  @Input() accounts: AccountModel[];
  @Input() baseCurrency: string;
  @Input() deviceType: string;
  @Input() hasPermissionToOpenDetails = true;
  @Input() locale = getLocale();
  @Input() showActions: boolean;
  @Input() showBalance = true;
  @Input() showFooter = true;
  @Input() showTransactions = true;
  @Input() showValue = true;
  @Input() showValueInBaseCurrency = true;
  @Input() totalBalanceInBaseCurrency: number;
  @Input() totalValueInBaseCurrency: number;
  @Input() transactionCount: number;

  @Output() accountDeleted = new EventEmitter<string>();
  @Output() accountToUpdate = new EventEmitter<AccountModel>();
  @Output() transferBalance = new EventEmitter<void>();

  @ViewChild(MatSort) sort: MatSort;

  public dataSource = new MatTableDataSource<AccountModel>();
  public displayedColumns = [];
  public isLoading = true;
  public routeQueryParams: Subscription;

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private notificationService: NotificationService,
    private router: Router
  ) {}

  public ngOnChanges() {
    this.displayedColumns = ['status', 'account', 'platform'];

    if (this.showTransactions) {
      this.displayedColumns.push('transactions');
    }

    if (this.showBalance) {
      this.displayedColumns.push('balance');
    }

    if (this.showValue) {
      this.displayedColumns.push('value');
    }

    this.displayedColumns.push('currency');

    if (this.showValueInBaseCurrency) {
      this.displayedColumns.push('valueInBaseCurrency');
    }

    this.displayedColumns.push('comment');

    if (this.showActions) {
      this.displayedColumns.push('actions');
    }

    this.isLoading = true;

    this.dataSource = new MatTableDataSource(this.accounts);
    this.dataSource.sort = this.sort;
    this.dataSource.sortingDataAccessor = get;

    if (this.accounts) {
      this.isLoading = false;
    }
  }

  public onDeleteAccount(aId: string) {
    this.notificationService.confirm({
      confirmFn: () => {
        this.accountDeleted.emit(aId);
      },
      confirmType: ConfirmationDialogType.Warn,
      title: $localize`Do you really want to delete this account?`
    });
  }

  public onOpenAccountDetailDialog(accountId: string) {
    if (this.hasPermissionToOpenDetails) {
      this.router.navigate([], {
        queryParams: { accountId, accountDetailDialog: true }
      });
    }
  }

  public onOpenComment(aComment: string) {
    this.notificationService.alert({
      title: aComment
    });
  }

  public onTransferBalance() {
    this.transferBalance.emit();
  }

  public onUpdateAccount(aAccount: AccountModel) {
    this.accountToUpdate.emit(aAccount);
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
