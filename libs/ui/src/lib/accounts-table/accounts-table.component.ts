import { ConfirmationDialogType } from '@ghostfolio/common/enums';
import { getLocale, getLowercase } from '@ghostfolio/common/helper';
import { GfEntityLogoComponent } from '@ghostfolio/ui/entity-logo';
import { NotificationService } from '@ghostfolio/ui/notifications';
import { GfValueComponent } from '@ghostfolio/ui/value';

import { CommonModule } from '@angular/common';
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
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { Router, RouterModule } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { Account } from '@prisma/client';
import { addIcons } from 'ionicons';
import {
  arrowRedoOutline,
  createOutline,
  documentTextOutline,
  ellipsisHorizontal,
  eyeOffOutline,
  trashOutline,
  walletOutline
} from 'ionicons/icons';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { Subject, Subscription } from 'rxjs';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    GfEntityLogoComponent,
    GfValueComponent,
    IonIcon,
    MatButtonModule,
    MatMenuModule,
    MatSortModule,
    MatTableModule,
    NgxSkeletonLoaderModule,
    RouterModule
  ],
  selector: 'gf-accounts-table',
  styleUrls: ['./accounts-table.component.scss'],
  templateUrl: './accounts-table.component.html'
})
export class GfAccountsTableComponent implements OnChanges, OnDestroy {
  @Input() accounts: Account[];
  @Input() activitiesCount: number;
  @Input() baseCurrency: string;
  @Input() deviceType: string;
  @Input() hasPermissionToOpenDetails = true;
  @Input() locale = getLocale();
  @Input() showActions: boolean;
  @Input() showActivitiesCount = true;
  @Input() showAllocationInPercentage: boolean;
  @Input() showBalance = true;
  @Input() showFooter = true;
  @Input() showValue = true;
  @Input() showValueInBaseCurrency = true;
  @Input() totalBalanceInBaseCurrency: number;
  @Input() totalValueInBaseCurrency: number;

  @Output() accountDeleted = new EventEmitter<string>();
  @Output() accountToUpdate = new EventEmitter<Account>();
  @Output() transferBalance = new EventEmitter<void>();

  @ViewChild(MatSort) sort: MatSort;

  public dataSource = new MatTableDataSource<Account>();
  public displayedColumns = [];
  public isLoading = true;
  public routeQueryParams: Subscription;

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private notificationService: NotificationService,
    private router: Router
  ) {
    addIcons({
      arrowRedoOutline,
      createOutline,
      documentTextOutline,
      ellipsisHorizontal,
      eyeOffOutline,
      trashOutline,
      walletOutline
    });
  }

  public ngOnChanges() {
    this.displayedColumns = ['status', 'account', 'platform'];

    if (this.showActivitiesCount) {
      this.displayedColumns.push('activitiesCount');
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

    if (this.showAllocationInPercentage) {
      this.displayedColumns.push('allocation');
    }

    this.displayedColumns.push('comment');

    if (this.showActions) {
      this.displayedColumns.push('actions');
    }

    this.isLoading = true;

    this.dataSource = new MatTableDataSource(this.accounts);
    this.dataSource.sortingDataAccessor = getLowercase;

    this.dataSource.sort = this.sort;

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

  public onUpdateAccount(aAccount: Account) {
    this.accountToUpdate.emit(aAccount);
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
