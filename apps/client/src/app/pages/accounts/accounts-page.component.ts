import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { CreateAccountDto } from '@ghostfolio/api/app/account/create-account.dto';
import { UpdateAccountDto } from '@ghostfolio/api/app/account/update-account.dto';
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
  selector: 'gf-accounts-page',
  templateUrl: './accounts-page.html',
  styleUrls: ['./accounts-page.scss']
})
export class AccountsPageComponent implements OnInit {
  public accounts: AccountModel[];
  public deviceType: string;
  public hasImpersonationId: boolean;
  public hasPermissionToCreateAccount: boolean;
  public hasPermissionToDeleteAccount: boolean;
  public routeQueryParams: Subscription;
  public user: User;

  private unsubscribeSubject = new Subject<void>();

  /**
   * @constructor
   */
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
    this.routeQueryParams = route.queryParams
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((params) => {
        if (params['createDialog']) {
          this.openCreateAccountDialog();
        } else if (params['editDialog']) {
          if (this.accounts) {
            const account = this.accounts.find((account) => {
              return account.id === params['transactionId'];
            });

            this.openUpdateAccountDialog(account);
          } else {
            this.router.navigate(['.'], { relativeTo: this.route });
          }
        }
      });
  }

  /**
   * Initializes the controller
   */
  public ngOnInit() {
    this.deviceType = this.deviceService.getDeviceInfo().deviceType;

    this.impersonationStorageService
      .onChangeHasImpersonation()
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
    this.dataService.fetchAccounts().subscribe((response) => {
      this.accounts = response;

      if (this.accounts?.length <= 0) {
        this.router.navigate([], { queryParams: { createDialog: true } });
      }

      this.changeDetectorRef.markForCheck();
    });
  }

  public onDeleteAccount(aId: string) {
    this.dataService.deleteAccount(aId).subscribe({
      next: () => {
        this.fetchAccounts();
      }
    });
  }

  public onUpdateAccount(aAccount: AccountModel) {
    this.router.navigate([], {
      queryParams: { editDialog: true, transactionId: aAccount.id }
    });
  }

  public openUpdateAccountDialog({
    accountType,
    id,
    name,
    platformId
  }: AccountModel): void {
    const dialogRef = this.dialog.open(CreateOrUpdateAccountDialog, {
      data: {
        account: {
          accountType,
          id,
          name,
          platformId
        }
      },
      height: this.deviceType === 'mobile' ? '97.5vh' : '80vh',
      width: this.deviceType === 'mobile' ? '100vw' : '50rem'
    });

    dialogRef.afterClosed().subscribe((data: any) => {
      const account: UpdateAccountDto = data?.account;

      if (account) {
        this.dataService.putAccount(account).subscribe({
          next: () => {
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

  private openCreateAccountDialog(): void {
    const dialogRef = this.dialog.open(CreateOrUpdateAccountDialog, {
      data: {
        account: {
          accountType: AccountType.SECURITIES,
          name: null,
          platformId: null
        }
      },
      height: this.deviceType === 'mobile' ? '97.5vh' : '80vh',
      width: this.deviceType === 'mobile' ? '100vw' : '50rem'
    });

    dialogRef.afterClosed().subscribe((data: any) => {
      const account: CreateAccountDto = data?.account;

      if (account) {
        this.dataService.postAccount(account).subscribe({
          next: () => {
            this.fetchAccounts();
          }
        });
      }

      this.router.navigate(['.'], { relativeTo: this.route });
    });
  }
}
