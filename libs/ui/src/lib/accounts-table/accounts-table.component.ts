import { ConfirmationDialogType } from '@ghostfolio/common/enums';
import { getLocale, getLowercase } from '@ghostfolio/common/helper';
import { GfEntityLogoComponent } from '@ghostfolio/ui/entity-logo';
import { NotificationService } from '@ghostfolio/ui/notifications';
import { GfValueComponent } from '@ghostfolio/ui/value';

import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  viewChild
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
export class GfAccountsTableComponent {
  public readonly accounts = input.required<Account[]>();
  public readonly activitiesCount = input<number>();
  public readonly baseCurrency = input<string>();
  public readonly hasPermissionToOpenDetails = input(true);
  public readonly locale = input(getLocale());
  public readonly showActions = input<boolean>();
  public readonly showActivitiesCount = input(true);
  public readonly showAllocationInPercentage = input<boolean>();
  public readonly showBalance = input(true);
  public readonly showFooter = input(true);
  public readonly showValue = input(true);
  public readonly showValueInBaseCurrency = input(false);
  public readonly totalBalanceInBaseCurrency = input<number>();
  public readonly totalValueInBaseCurrency = input<number>();

  public readonly accountDeleted = output<string>();
  public readonly accountToUpdate = output<Account>();
  public readonly transferBalance = output<void>();

  public readonly sort = viewChild.required(MatSort);

  protected readonly dataSource = new MatTableDataSource<Account>([]);

  protected readonly displayedColumns = computed(() => {
    const columns = ['status', 'account', 'platform'];

    if (this.showActivitiesCount()) {
      columns.push('activitiesCount');
    }

    if (this.showBalance()) {
      columns.push('balance');
    }

    if (this.showValue()) {
      columns.push('value');
    }

    columns.push('currency');

    if (this.showValueInBaseCurrency()) {
      columns.push('valueInBaseCurrency');
    }

    if (this.showAllocationInPercentage()) {
      columns.push('allocation');
    }

    columns.push('comment');

    if (this.showActions()) {
      columns.push('actions');
    }

    return columns;
  });

  protected readonly isLoading = computed(() => !this.accounts());

  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);

  public constructor() {
    addIcons({
      arrowRedoOutline,
      createOutline,
      documentTextOutline,
      ellipsisHorizontal,
      eyeOffOutline,
      trashOutline,
      walletOutline
    });

    this.dataSource.sortingDataAccessor = getLowercase;

    // Reactive data update
    effect(() => {
      this.dataSource.data = this.accounts();
    });

    // Reactive view connection
    effect(() => {
      this.dataSource.sort = this.sort();
    });
  }

  protected onDeleteAccount(aId: string) {
    this.notificationService.confirm({
      confirmFn: () => {
        this.accountDeleted.emit(aId);
      },
      confirmType: ConfirmationDialogType.Warn,
      title: $localize`Do you really want to delete this account?`
    });
  }

  protected onOpenAccountDetailDialog(accountId: string) {
    if (this.hasPermissionToOpenDetails()) {
      this.router.navigate([], {
        queryParams: { accountId, accountDetailDialog: true }
      });
    }
  }

  protected onOpenComment(aComment: string) {
    this.notificationService.alert({
      title: aComment
    });
  }

  protected onTransferBalance() {
    this.transferBalance.emit();
  }

  protected onUpdateAccount(aAccount: Account) {
    this.accountToUpdate.emit(aAccount);
  }
}
