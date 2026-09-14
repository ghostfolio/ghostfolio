import { ImpersonationStorageService } from '@ghostfolio/client/services/impersonation-storage.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { DEFAULT_LOCALE } from '@ghostfolio/common/config';
import { AccountsResponse, User } from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { internalRoutes } from '@ghostfolio/common/routes/routes';
import { hasScope, scopes } from '@ghostfolio/common/scopes';
import { AccountWithValue } from '@ghostfolio/common/types';
import { GfAccountsTableComponent } from '@ghostfolio/ui/accounts-table';
import { GfFabComponent } from '@ghostfolio/ui/fab';
import { DataService } from '@ghostfolio/ui/services';

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
  OnInit
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterModule } from '@angular/router';
import { filter, switchMap, tap } from 'rxjs';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'page' },
  imports: [GfAccountsTableComponent, GfFabComponent, RouterModule],
  selector: 'gf-accounts-page',
  styleUrls: ['./accounts-page.scss'],
  templateUrl: './accounts-page.html'
})
export class GfAccountsPageComponent implements OnInit {
  protected readonly DEFAULT_LOCALE = DEFAULT_LOCALE;

  protected accounts: AccountWithValue[] | undefined;
  protected activitiesCount = 0;
  protected hasPermissionToCreateAccount: boolean;
  protected hasPermissionToDeleteAccount: boolean;
  protected hasPermissionToUpdateAccount: boolean;
  protected readonly internalRoutes = internalRoutes;
  protected totalBalanceInBaseCurrency = 0;
  protected totalValueInBaseCurrency = 0;
  protected user: User;

  private hasImpersonationId: boolean;

  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly dataService = inject(DataService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly impersonationStorageService = inject(
    ImpersonationStorageService
  );
  private readonly router = inject(Router);
  private readonly userService = inject(UserService);

  public ngOnInit() {
    this.impersonationStorageService
      .onChangeHasImpersonation()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((impersonationId) => {
        this.hasImpersonationId = !!impersonationId;
      });

    this.userService.stateChanged
      .pipe(
        filter((state) => {
          return !!state?.user;
        }),
        tap((state) => {
          this.user = state.user;

          this.hasPermissionToCreateAccount =
            hasPermission(this.user.permissions, permissions.createAccount) &&
            hasScope(this.user.scopes, scopes.accountCreate);

          this.hasPermissionToDeleteAccount =
            hasPermission(this.user.permissions, permissions.deleteAccount) &&
            hasScope(this.user.scopes, scopes.accountDelete);

          this.hasPermissionToUpdateAccount =
            hasPermission(this.user.permissions, permissions.updateAccount) &&
            hasScope(this.user.scopes, scopes.accountUpdate);

          this.reset();

          this.changeDetectorRef.markForCheck();
        }),
        switchMap(() => this.fetchAccounts()),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((response) => {
        this.updateAccounts(response);
      });
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
      });
  }

  private fetchAccounts() {
    return this.dataService.fetchAccounts({
      filters: this.userService.getFilters()
    });
  }

  private reset() {
    this.accounts = undefined;
    this.activitiesCount = 0;
    this.totalBalanceInBaseCurrency = 0;
    this.totalValueInBaseCurrency = 0;
  }

  private updateAccounts({
    accounts,
    activitiesCount,
    totalBalanceInBaseCurrency,
    totalValueInBaseCurrency
  }: AccountsResponse) {
    this.accounts = accounts;
    this.activitiesCount = activitiesCount;
    this.totalBalanceInBaseCurrency = totalBalanceInBaseCurrency;
    this.totalValueInBaseCurrency = totalValueInBaseCurrency;

    if (
      !this.hasImpersonationId &&
      this.hasPermissionToCreateAccount &&
      this.user?.accounts?.length === 0
    ) {
      void this.router.navigate(
        internalRoutes.accounts.subRoutes.create.routerLink
      );
    }

    this.changeDetectorRef.markForCheck();
  }
}
