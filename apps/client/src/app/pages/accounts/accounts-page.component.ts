import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { UpdateOrderDto } from '@ghostfolio/api/app/order/update-order.dto';
import { User } from '@ghostfolio/api/app/user/interfaces/user.interface';
import { DataService } from '@ghostfolio/client/services/data.service';
import { ImpersonationStorageService } from '@ghostfolio/client/services/impersonation-storage.service';
import { TokenStorageService } from '@ghostfolio/client/services/token-storage.service';
import { hasPermission, permissions } from '@ghostfolio/helper';
import { Order as OrderModel } from '@prisma/client';
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
  public accounts: OrderModel[];
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
    private cd: ChangeDetectorRef,
    private dataService: DataService,
    private deviceService: DeviceDetectorService,
    private dialog: MatDialog,
    private impersonationStorageService: ImpersonationStorageService,
    private route: ActivatedRoute,
    private router: Router,
    private tokenStorageService: TokenStorageService
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

    this.tokenStorageService
      .onChangeHasToken()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(() => {
        this.dataService.fetchUser().subscribe((user) => {
          this.user = user;
          this.hasPermissionToCreateAccount = hasPermission(
            user.permissions,
            permissions.createAccount
          );
          this.hasPermissionToDeleteAccount = hasPermission(
            user.permissions,
            permissions.deleteAccount
          );

          this.cd.markForCheck();
        });
      });

    this.fetchAccounts();
  }

  public fetchAccounts() {
    this.dataService.fetchAccounts().subscribe((response) => {
      this.accounts = response;

      if (this.accounts?.length <= 0) {
        this.router.navigate([], { queryParams: { createDialog: true } });
      }

      this.cd.markForCheck();
    });
  }

  public onDeleteAccount(aId: string) {
    this.dataService.deleteAccount(aId).subscribe({
      next: () => {
        this.fetchAccounts();
      }
    });
  }

  public onUpdateAccount(aAccount: OrderModel) {
    this.router.navigate([], {
      queryParams: { editDialog: true, transactionId: aAccount.id }
    });
  }

  public openUpdateAccountDialog({
    accountId,
    currency,
    dataSource,
    date,
    fee,
    id,
    platformId,
    quantity,
    symbol,
    type,
    unitPrice
  }: OrderModel): void {
    const dialogRef = this.dialog.open(CreateOrUpdateAccountDialog, {
      data: {
        accounts: this.user.accounts,
        transaction: {
          accountId,
          currency,
          dataSource,
          date,
          fee,
          id,
          platformId,
          quantity,
          symbol,
          type,
          unitPrice
        }
      },
      height: this.deviceType === 'mobile' ? '97.5vh' : '80vh',
      width: this.deviceType === 'mobile' ? '100vw' : '50rem'
    });

    dialogRef.afterClosed().subscribe((data: any) => {
      const transaction: UpdateOrderDto = data?.transaction;

      if (transaction) {
        this.dataService.putAccount(transaction).subscribe({
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
        accounts: this.user?.accounts,
        transaction: {
          accountId: this.user?.accounts.find((account) => {
            return account.isDefault;
          })?.id,
          currency: null,
          date: new Date(),
          fee: 0,
          platformId: null,
          quantity: null,
          symbol: null,
          type: 'BUY',
          unitPrice: null
        }
      },
      height: this.deviceType === 'mobile' ? '97.5vh' : '80vh',
      width: this.deviceType === 'mobile' ? '100vw' : '50rem'
    });

    dialogRef.afterClosed().subscribe((data: any) => {
      const transaction: UpdateOrderDto = data?.transaction;

      if (transaction) {
        this.dataService.postAccount(transaction).subscribe({
          next: () => {
            this.fetchAccounts();
          }
        });
      }

      this.router.navigate(['.'], { relativeTo: this.route });
    });
  }
}
