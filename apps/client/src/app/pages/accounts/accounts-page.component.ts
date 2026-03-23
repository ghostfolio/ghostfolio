import { GfAccountDetailDialogComponent } from '@ghostfolio/client/components/account-detail-dialog/account-detail-dialog.component';
import { AccountDetailDialogParams } from '@ghostfolio/client/components/account-detail-dialog/interfaces/interfaces';
import { ImpersonationStorageService } from '@ghostfolio/client/services/impersonation-storage.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import {
  CreateAccountDto,
  TransferBalanceDto,
  UpdateAccountDto
} from '@ghostfolio/common/dtos';
import { User } from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { GfAccountsTableComponent } from '@ghostfolio/ui/accounts-table';
import { NotificationService } from '@ghostfolio/ui/notifications';
import { DataService } from '@ghostfolio/ui/services';

import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnInit
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Account as AccountModel } from '@prisma/client';
import { addIcons } from 'ionicons';
import { addOutline } from 'ionicons/icons';
import { DeviceDetectorService } from 'ngx-device-detector';
import { EMPTY, Subscription } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { GfCreateOrUpdateAccountDialogComponent } from './create-or-update-account-dialog/create-or-update-account-dialog.component';
import { CreateOrUpdateAccountDialogParams } from './create-or-update-account-dialog/interfaces/interfaces';
import { TransferBalanceDialogParams } from './transfer-balance/interfaces/interfaces';
import { GfTransferBalanceDialogComponent } from './transfer-balance/transfer-balance-dialog.component';

@Component({
  host: { class: 'has-fab page' },
  imports: [GfAccountsTableComponent, MatButtonModule, RouterModule],
  selector: 'gf-accounts-page',
  styleUrls: ['./accounts-page.scss'],
  templateUrl: './accounts-page.html'
})
export class GfAccountsPageComponent implements OnInit {
  public accounts: AccountModel[];
  public activitiesCount = 0;
  public deviceType: string;
  public hasImpersonationId: boolean;
  public hasPermissionToCreateAccount: boolean;
  public hasPermissionToUpdateAccount: boolean;
  public routeQueryParams: Subscription;
  public totalBalanceInBaseCurrency = 0;
  public totalValueInBaseCurrency = 0;
  public user: User;

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService,
    private destroyRef: DestroyRef,
    private deviceService: DeviceDetectorService,
    private dialog: MatDialog,
    private impersonationStorageService: ImpersonationStorageService,
    private notificationService: NotificationService,
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserService
  ) {
    this.route.queryParams
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        if (params['accountId'] && params['accountDetailDialog']) {
          this.openAccountDetailDialog(params['accountId']);
        } else if (
          params['createDialog'] &&
          this.hasPermissionToCreateAccount
        ) {
          this.openCreateAccountDialog();
        } else if (params['editDialog']) {
          if (this.accounts) {
            const account = this.accounts.find(({ id }) => {
              return id === params['accountId'];
            });

            this.openUpdateAccountDialog(account);
          } else {
            this.router.navigate(['.'], { relativeTo: this.route });
          }
        } else if (params['transferBalanceDialog']) {
          this.openTransferBalanceDialog();
        }
      });

    addIcons({ addOutline });
  }

  public ngOnInit() {
    this.deviceType = this.deviceService.getDeviceInfo().deviceType;

    this.impersonationStorageService
      .onChangeHasImpersonation()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((impersonationId) => {
        this.hasImpersonationId = !!impersonationId;
      });

    this.userService.stateChanged
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((state) => {
        if (state?.user) {
          this.user = state.user;

          this.hasPermissionToCreateAccount = hasPermission(
            this.user.permissions,
            permissions.createAccount
          );
          this.hasPermissionToUpdateAccount = hasPermission(
            this.user.permissions,
            permissions.updateAccount
          );

          this.changeDetectorRef.markForCheck();
        }
      });

    this.fetchAccounts();
  }

  public fetchAccounts() {
    this.dataService
      .fetchAccounts()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(
        ({
          accounts,
          activitiesCount,
          totalBalanceInBaseCurrency,
          totalValueInBaseCurrency
        }) => {
          this.accounts = accounts;
          this.activitiesCount = activitiesCount;
          this.totalBalanceInBaseCurrency = totalBalanceInBaseCurrency;
          this.totalValueInBaseCurrency = totalValueInBaseCurrency;

          if (this.accounts?.length <= 0) {
            this.router.navigate([], { queryParams: { createDialog: true } });
          }

          this.changeDetectorRef.markForCheck();
        }
      );
  }

  public onDeleteAccount(aId: string) {
    this.reset();

    this.dataService
      .deleteAccount(aId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.userService
          .get(true)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe();

        this.fetchAccounts();
      });
  }

  public onTransferBalance() {
    this.router.navigate([], {
      queryParams: { transferBalanceDialog: true }
    });
  }

  public onUpdateAccount(aAccount: AccountModel) {
    this.router.navigate([], {
      queryParams: { accountId: aAccount.id, editDialog: true }
    });
  }

  public openUpdateAccountDialog({
    accountType,
    balance,
    comment,
    currency,
    id,
    isExcluded,
    name,
    plaidAccountId,
    plaidItemId,
    platformId
  }: AccountModel) {
    const dialogRef = this.dialog.open<
      GfCreateOrUpdateAccountDialogComponent,
      CreateOrUpdateAccountDialogParams
    >(GfCreateOrUpdateAccountDialogComponent, {
      data: {
        account: {
          accountType,
          balance,
          comment,
          currency,
          id,
          isExcluded,
          name,
          plaidAccountId,
          plaidItemId,
          platformId
        }
      },
      height: this.deviceType === 'mobile' ? '98vh' : '80vh',
      width: this.deviceType === 'mobile' ? '100vw' : '50rem'
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((account: UpdateAccountDto | null) => {
        if (account) {
          this.reset();

          this.dataService
            .putAccount(account)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => {
              this.userService
                .get(true)
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe();

              this.fetchAccounts();
            });

          this.changeDetectorRef.markForCheck();
        }

        this.router.navigate(['.'], { relativeTo: this.route });
      });
  }

  private openAccountDetailDialog(aAccountId: string) {
    const dialogRef = this.dialog.open<
      GfAccountDetailDialogComponent,
      AccountDetailDialogParams
    >(GfAccountDetailDialogComponent, {
      autoFocus: false,
      data: {
        accountId: aAccountId,
        deviceType: this.deviceType,
        hasImpersonationId: this.hasImpersonationId,
        hasPermissionToCreateActivity:
          !this.hasImpersonationId &&
          hasPermission(this.user?.permissions, permissions.createActivity) &&
          !this.user?.settings?.isRestrictedView
      },
      height: this.deviceType === 'mobile' ? '98vh' : '80vh',
      width: this.deviceType === 'mobile' ? '100vw' : '50rem'
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.fetchAccounts();

        this.router.navigate(['.'], { relativeTo: this.route });
      });
  }

  private openCreateAccountDialog() {
    const dialogRef = this.dialog.open<
      GfCreateOrUpdateAccountDialogComponent,
      CreateOrUpdateAccountDialogParams
    >(GfCreateOrUpdateAccountDialogComponent, {
      data: {
        account: {
          accountType: null,
          balance: 0,
          comment: null,
          currency: this.user?.settings?.baseCurrency,
          id: null,
          isExcluded: false,
          name: null,
          plaidAccountId: null,
          plaidItemId: null,
          platformId: null
        }
      },
      height: this.deviceType === 'mobile' ? '98vh' : '80vh',
      width: this.deviceType === 'mobile' ? '100vw' : '50rem'
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((account: CreateAccountDto | null) => {
        if (account) {
          this.reset();

          this.dataService
            .postAccount(account)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => {
              this.userService
                .get(true)
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe();

              this.fetchAccounts();
            });

          this.changeDetectorRef.markForCheck();
        }

        this.router.navigate(['.'], { relativeTo: this.route });
      });
  }

  private openTransferBalanceDialog() {
    const dialogRef = this.dialog.open<
      GfTransferBalanceDialogComponent,
      TransferBalanceDialogParams
    >(GfTransferBalanceDialogComponent, {
      data: {
        accounts: this.accounts
      },
      width: this.deviceType === 'mobile' ? '100vw' : '50rem'
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((data: any) => {
        if (data) {
          this.reset();

          const { accountIdFrom, accountIdTo, balance }: TransferBalanceDto =
            data?.account;

          this.dataService
            .transferAccountBalance({
              accountIdFrom,
              accountIdTo,
              balance
            })
            .pipe(
              catchError(() => {
                this.notificationService.alert({
                  title: $localize`Oops, cash balance transfer has failed.`
                });

                return EMPTY;
              }),
              takeUntilDestroyed(this.destroyRef)
            )
            .subscribe(() => {
              this.fetchAccounts();
            });

          this.changeDetectorRef.markForCheck();
        }

        this.router.navigate(['.'], { relativeTo: this.route });
      });
  }

  private reset() {
    this.accounts = undefined;
    this.activitiesCount = 0;
    this.totalBalanceInBaseCurrency = 0;
    this.totalValueInBaseCurrency = 0;
  }
}
