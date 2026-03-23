import { GfAccountDetailDialogComponent } from '@ghostfolio/client/components/account-detail-dialog/account-detail-dialog.component';
import { AccountDetailDialogParams } from '@ghostfolio/client/components/account-detail-dialog/interfaces/interfaces';
import { ImpersonationStorageService } from '@ghostfolio/client/services/impersonation-storage.service';
import {
  PlaidItemSummary,
  PlaidLinkService
} from '@ghostfolio/client/services/plaid-link.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { AccountsResponse } from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { AccountWithValue } from '@ghostfolio/common/types';
import { GfValueComponent } from '@ghostfolio/ui/value';
import { DataService } from '@ghostfolio/ui/services';

import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnInit
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import { DeviceDetectorService } from 'ngx-device-detector';
import { switchMap } from 'rxjs';

import { User } from '@ghostfolio/common/interfaces';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    CurrencyPipe,
    DatePipe,
    GfValueComponent,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
    RouterModule
  ],
  selector: 'gf-fmv-page',
  standalone: true,
  templateUrl: './fmv-page.component.html',
  styleUrls: ['./fmv-page.component.scss']
})
export class FmvPageComponent implements OnInit {
  public accounts: AccountWithValue[] = [];
  public baseCurrency: string;
  public deviceType: string;
  public hasImpersonationId = false;
  public isLinkingPlaid = false;
  public isLoading = true;
  public isPlaidEnabled = false;
  public plaidItems: PlaidItemSummary[] = [];
  public totalValueInBaseCurrency = 0;
  public user: User;

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService,
    private destroyRef: DestroyRef,
    private deviceService: DeviceDetectorService,
    private dialog: MatDialog,
    private impersonationStorageService: ImpersonationStorageService,
    private plaidLinkService: PlaidLinkService,
    private snackBar: MatSnackBar,
    private userService: UserService
  ) {}

  public ngOnInit() {
    this.deviceType = this.deviceService.getDeviceInfo().deviceType;

    this.impersonationStorageService
      .onChangeHasImpersonation()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((aId) => {
        this.hasImpersonationId = !!aId;
      });

    this.userService.stateChanged
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((state) => {
        if (state?.user) {
          this.user = state.user;
          this.baseCurrency = this.user?.settings?.baseCurrency;
          this.fetchAccounts();
          this.fetchPlaidItems();
        }
      });
  }

  public onAccountClick(account: AccountWithValue) {
    this.openAccountDetailDialog(account.id);
  }

  public onRefreshPlaidItem(plaidItemId: string) {
    this.plaidLinkService
      .triggerSync(plaidItemId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.snackBar.open('Sync started', undefined, { duration: 2000 });
          // Refresh after a short delay to let the sync begin
          setTimeout(() => {
            this.fetchAccounts();
            this.fetchPlaidItems();
          }, 3000);
        },
        error: () => {
          this.snackBar.open('Failed to start sync', undefined, {
            duration: 3000
          });
        }
      });
  }

  public onLinkPlaid() {
    this.isLinkingPlaid = true;
    this.changeDetectorRef.markForCheck();

    this.plaidLinkService
      .createLinkToken()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        switchMap((response) =>
          this.plaidLinkService.openPlaidLink(response.linkToken)
        )
      )
      .subscribe({
        next: (result) => {
          // Exchange the public token
          this.plaidLinkService
            .exchangeToken({
              accounts: result.metadata.accounts,
              institutionId: result.metadata.institution.institution_id,
              institutionName: result.metadata.institution.name,
              publicToken: result.publicToken
            })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
              next: (exchangeResult) => {
                this.snackBar.open(
                  `Linked ${exchangeResult.accounts.length} account(s) — syncing holdings…`,
                  undefined,
                  { duration: 5000 }
                );
                this.isLinkingPlaid = false;
                this.fetchAccounts();
                this.fetchPlaidItems();

                // Re-fetch after sync has time to complete
                setTimeout(() => {
                  this.fetchAccounts();
                  this.fetchPlaidItems();
                }, 8000);
              },
              error: () => {
                this.snackBar.open(
                  'Failed to link account',
                  undefined,
                  { duration: 3000 }
                );
                this.isLinkingPlaid = false;
                this.changeDetectorRef.markForCheck();
              }
            });
        },
        error: () => {
          this.isLinkingPlaid = false;
          this.changeDetectorRef.markForCheck();
        },
        complete: () => {
          this.isLinkingPlaid = false;
          this.changeDetectorRef.markForCheck();
        }
      });
  }

  private fetchAccounts() {
    this.isLoading = true;

    this.dataService
      .fetchAccounts()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response: AccountsResponse) => {
          this.accounts = response.accounts.filter(
            (account) => !account.isExcluded
          );
          this.totalValueInBaseCurrency = response.totalValueInBaseCurrency;
          this.isLoading = false;
          this.changeDetectorRef.markForCheck();
        },
        error: () => {
          this.isLoading = false;
          this.changeDetectorRef.markForCheck();
        }
      });
  }

  private fetchPlaidItems() {
    this.plaidLinkService
      .getItems()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.isPlaidEnabled = response.enabled;
          this.plaidItems = response.items;
          this.changeDetectorRef.markForCheck();
        },
        error: () => {
          this.isPlaidEnabled = false;
        }
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
      });
  }
}
