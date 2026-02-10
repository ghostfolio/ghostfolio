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
  OnDestroy,
  Output,
  computed,
  inject,
  input,
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
import { Subject } from 'rxjs';

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
export class GfAccountsTableComponent implements OnDestroy {
  @Input() activitiesCount: number;
  @Input() baseCurrency: string;
  @Input() deviceType: string;
  @Input() hasPermissionToOpenDetails = true;
  @Input() locale = getLocale();
  @Input() showFooter = true;
  @Input() totalBalanceInBaseCurrency: number;
  @Input() totalValueInBaseCurrency: number;

  @Output() accountDeleted = new EventEmitter<string>();
  @Output() accountToUpdate = new EventEmitter<Account>();
  @Output() transferBalance = new EventEmitter<void>();

  public readonly accounts = input.required<Account[] | undefined>();
  public readonly showActions = input<boolean>();
  public readonly showActivitiesCount = input(true);
  public readonly showAllocationInPercentage = input<boolean>();
  public readonly showBalance = input(true);
  public readonly showValue = input(true);
  public readonly showValueInBaseCurrency = input(false);
  public readonly sort = viewChild.required(MatSort);

  protected readonly dataSource = computed(() => {
    const dataSource = new MatTableDataSource<Account>(this.accounts());
    dataSource.sortingDataAccessor = getLowercase;
    dataSource.sort = this.sort();
    return dataSource;
  });

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
  private readonly unsubscribeSubject = new Subject<void>();

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
