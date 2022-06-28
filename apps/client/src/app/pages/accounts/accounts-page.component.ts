import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { CreateAccountDto } from '@ghostfolio/api/app/account/create-account.dto';
import { UpdateAccountDto } from '@ghostfolio/api/app/account/update-account.dto';
import { AccountDetailDialog } from '@ghostfolio/client/components/account-detail-dialog/account-detail-dialog.component';
import { AccountDetailDialogParams } from '@ghostfolio/client/components/account-detail-dialog/interfaces/interfaces';
import { DataService } from '@ghostfolio/client/services/data.service';
import { ImpersonationStorageService } from '@ghostfolio/client/services/impersonation-storage.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { User } from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { Account as AccountModel, AccountType } from '@prisma/client';
import { DeviceDetectorService } from 'ngx-device-detector';
import { Subject, Subscription } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { CreateOrUpdateAccountDialog } from './create-or-update-account-dialog/create-or-update-account-dialog.component';

@Component({
  host: { class: 'page' },
  selector: 'gf-accounts-page',
  styleUrls: ['./accounts-page.scss'],
  templateUrl: './accounts-page.html'
})
export class AccountsPageComponent implements OnDestroy, OnInit {
  public accounts: AccountModel[];
  public deviceType: string;
  public hasImpersonationId: boolean;
  public hasPermissionToCreateAccount: boolean;
  public hasPermissionToDeleteAccount: boolean;
  public routeQueryParams: Subscription;
  public totalBalanceInBaseCurrency = 0;
  public totalValueInBaseCurrency = 0;
  public transactionCount = 0;
  public user: User;

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService,
    private deviceService: DeviceDetectorService,
    private dialog: MatDialog,
    private impersonationStorageService: ImpersonationStorageService,
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserService
  ) {
    this.route.queryParams
      .pipe(takeUntil(this.unsubscribeSubject))
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
            const account = this.accounts.find((account) => {
              return account.id === params['accountId'];
            });

            this.openUpdateAccountDialog(account);
          } else {
            this.router.navigate(['.'], { relativeTo: this.route });
          }
        }
      });
  }

  public ngOnInit() {
    this.deviceType = this.deviceService.getDeviceInfo().deviceType;

    this.impersonationStorageService
      .onChangeHasImpersonation()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((aId) => {
        this.hasImpersonationId = !!aId;
      });

    this.userService.stateChanged
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((state) => {
        if (state?.user) {
          this.user = state.user;

          this.hasPermissionToCreateAccount = hasPermission(
            this.user.permissions,
            permissions.createAccount
          );
          this.hasPermissionToDeleteAccount = hasPermission(
            this.user.permissions,
            permissions.deleteAccount
          );

          this.changeDetectorRef.markForCheck();
        }
      });

    this.fetchAccounts();
  }

  public fetchAccounts() {
    this.dataService
      .fetchAccounts()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(
        ({
          accounts,
          totalBalanceInBaseCurrency,
          totalValueInBaseCurrency,
          transactionCount
        }) => {
          this.accounts = accounts;
          this.totalBalanceInBaseCurrency = totalBalanceInBaseCurrency;
          this.totalValueInBaseCurrency = totalValueInBaseCurrency;
          this.transactionCount = transactionCount;

          if (this.accounts?.length <= 0) {
            this.router.navigate([], { queryParams: { createDialog: true } });
          }

          this.changeDetectorRef.markForCheck();
        }
      );
  }

  public onDeleteAccount(aId: string) {
    this.dataService
      .deleteAccount(aId)
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe({
        next: () => {
          this.userService
            .get(true)
            .pipe(takeUntil(this.unsubscribeSubject))
            .subscribe();

          this.fetchAccounts();
        }
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
    currency,
    id,
    name,
    platformId
  }: AccountModel): void {
    const dialogRef = this.dialog.open(CreateOrUpdateAccountDialog, {
      data: {
        account: {
          accountType,
          balance,
          currency,
          id,
          name,
          platformId
        }
      },
      height: this.deviceType === 'mobile' ? '97.5vh' : '80vh',
      width: this.deviceType === 'mobile' ? '100vw' : '50rem'
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((data: any) => {
        const account: UpdateAccountDto = data?.account;

        if (account) {
          this.dataService
            .putAccount(account)
            .pipe(takeUntil(this.unsubscribeSubject))
            .subscribe({
              next: () => {
                this.userService
                  .get(true)
                  .pipe(takeUntil(this.unsubscribeSubject))
                  .subscribe();

                this.fetchAccounts();
              }
            });
        }

        this.router.navigate(['.'], { relativeTo: this.route });
      });
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }

  private openAccountDetailDialog(aAccountId: string) {
    const dialogRef = this.dialog.open(AccountDetailDialog, {
      autoFocus: false,
      data: <AccountDetailDialogParams>{
        accountId: aAccountId,
        deviceType: this.deviceType,
        hasImpersonationId: this.hasImpersonationId
      },
      height: this.deviceType === 'mobile' ? '97.5vh' : '80vh',
      width: this.deviceType === 'mobile' ? '100vw' : '50rem'
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(() => {
        this.router.navigate(['.'], { relativeTo: this.route });
      });
  }

  private openCreateAccountDialog(): void {
    const dialogRef = this.dialog.open(CreateOrUpdateAccountDialog, {
      data: {
        account: {
          accountType: AccountType.SECURITIES,
          balance: 0,
          currency: this.user?.settings?.baseCurrency,
          name: null,
          platformId: null
        }
      },
      height: this.deviceType === 'mobile' ? '97.5vh' : '80vh',
      width: this.deviceType === 'mobile' ? '100vw' : '50rem'
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((data: any) => {
        const account: CreateAccountDto = data?.account;

        if (account) {
          this.dataService
            .postAccount(account)
            .pipe(takeUntil(this.unsubscribeSubject))
            .subscribe({
              next: () => {
                this.userService
                  .get(true)
                  .pipe(takeUntil(this.unsubscribeSubject))
                  .subscribe();

                this.fetchAccounts();
              }
            });
        }

        this.router.navigate(['.'], { relativeTo: this.route });
      });
  }
}
