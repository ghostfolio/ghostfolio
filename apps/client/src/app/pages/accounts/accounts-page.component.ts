import { GfAccountDetailDialogComponent } from '@ghostfolio/client/components/account-detail-dialog/account-detail-dialog.component';
import {
  AccountDetailDialogParams,
  AccountDetailDialogResult
} from '@ghostfolio/client/components/account-detail-dialog/interfaces/interfaces';
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
import { GfFabComponent } from '@ghostfolio/ui/fab';
import { NotificationService } from '@ghostfolio/ui/notifications';
import { DataService } from '@ghostfolio/ui/services';

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Account as AccountModel, Tag } from '@prisma/client';
import { DeviceDetectorService } from 'ngx-device-detector';
import { EMPTY } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { GfCreateOrUpdateAccountDialogComponent } from './create-or-update-account-dialog/create-or-update-account-dialog.component';
import { CreateOrUpdateAccountDialogParams } from './create-or-update-account-dialog/interfaces/interfaces';
import { TransferBalanceDialogParams } from './transfer-balance/interfaces/interfaces';
import { GfTransferBalanceDialogComponent } from './transfer-balance/transfer-balance-dialog.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'page' },
  imports: [GfAccountsTableComponent, GfFabComponent, RouterModule],
  selector: 'gf-accounts-page',
  styleUrls: ['./accounts-page.scss'],
  templateUrl: './accounts-page.html'
})
export class GfAccountsPageComponent implements OnInit {
  protected accounts: AccountModel[];
  protected activitiesCount = 0;
  protected hasImpersonationId: boolean;
  protected hasPermissionToCreateAccount: boolean;
  protected hasPermissionToUpdateAccount: boolean;
  protected totalBalanceInBaseCurrency = 0;
  protected totalValueInBaseCurrency = 0;
  protected user: User;

  private readonly deviceType = computed(
    () => this.deviceDetectorService.deviceInfo().deviceType
  );

  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly dataService = inject(DataService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly deviceDetectorService = inject(DeviceDetectorService);
  private readonly dialog = inject(MatDialog);
  private readonly impersonationStorageService = inject(
    ImpersonationStorageService
  );
  private readonly notificationService = inject(NotificationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly userService = inject(UserService);

  public constructor() {
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

            if (account) {
              this.openUpdateAccountDialog(account);
            }
          } else {
            this.router.navigate(['.'], { relativeTo: this.route });
          }
        } else if (params['transferBalanceDialog']) {
          this.openTransferBalanceDialog();
        }
      });
  }

  public ngOnInit() {
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
        }

        this.changeDetectorRef.markForCheck();
      });

    this.fetchAccounts();
  }

  protected onDeleteAccount(aId: string) {
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

  protected onTransferBalance() {
    this.router.navigate([], {
      queryParams: { transferBalanceDialog: true }
    });
  }

  protected onUpdateAccount(aAccount: AccountModel) {
    this.router.navigate([], {
      queryParams: { accountId: aAccount.id, editDialog: true }
    });
  }

  private fetchAccounts() {
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

  private openUpdateAccountDialog({
    balance,
    comment,
    currency,
    id,
    isExcluded,
    name,
    platformId,
    tags
  }: AccountModel & { tags?: Tag[] }) {
    const dialogRef = this.dialog.open<
      GfCreateOrUpdateAccountDialogComponent,
      CreateOrUpdateAccountDialogParams
    >(GfCreateOrUpdateAccountDialogComponent, {
      data: {
        account: {
          balance,
          comment,
          currency,
          id,
          isExcluded,
          name,
          platformId,
          tags
        },
        user: this.user
      },
      height: this.deviceType() === 'mobile' ? '98vh' : '80vh',
      width: this.deviceType() === 'mobile' ? '100vw' : '50rem'
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
      AccountDetailDialogParams,
      AccountDetailDialogResult
    >(GfAccountDetailDialogComponent, {
      autoFocus: false,
      data: {
        accountId: aAccountId,
        deviceType: this.deviceType(),
        hasImpersonationId: this.hasImpersonationId,
        hasPermissionToCreateActivity:
          !this.hasImpersonationId &&
          hasPermission(this.user?.permissions, permissions.createActivity) &&
          !this.user?.settings?.isRestrictedView
      },
      height: this.deviceType() === 'mobile' ? '98vh' : '80vh',
      width: this.deviceType() === 'mobile' ? '100vw' : '50rem'
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (result?.isNavigating) {
          return;
        }

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
          balance: 0,
          comment: null,
          currency: this.user?.settings?.baseCurrency ?? null,
          id: null,
          isExcluded: false,
          name: null,
          platformId: null,
          tags: []
        },
        user: this.user
      } satisfies CreateOrUpdateAccountDialogParams,
      height: this.deviceType() === 'mobile' ? '98vh' : '80vh',
      width: this.deviceType() === 'mobile' ? '100vw' : '50rem'
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
      width: this.deviceType() === 'mobile' ? '100vw' : '50rem'
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
    this.accounts = [];
    this.activitiesCount = 0;
    this.totalBalanceInBaseCurrency = 0;
    this.totalValueInBaseCurrency = 0;
  }
}
