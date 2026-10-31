import { KEY_SUBSCRIPTION_INTERSTITIAL_SHOWN } from '@ghostfolio/client/services/settings-storage.service';
import { WebAuthnService } from '@ghostfolio/client/services/web-authn.service';
import { BULL_BOARD_COOKIE_NAME } from '@ghostfolio/common/config';
import { getStoredDateRange } from '@ghostfolio/common/date-range.helper';
import { Filter, User } from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';

import { HttpClient } from '@angular/common/http';
import { computed, DestroyRef, inject, Service } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { ObservableStore } from '@codewithdan/observable-store';
import { parseISO } from 'date-fns';
import { DeviceDetectorService } from 'ngx-device-detector';
import { EMPTY, Observable, of } from 'rxjs';
import { throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { SubscriptionInterstitialDialogParams } from '../../components/subscription-interstitial-dialog/interfaces/interfaces';
import { GfSubscriptionInterstitialDialogComponent } from '../../components/subscription-interstitial-dialog/subscription-interstitial-dialog.component';
import { UserStoreActions } from './user-store.actions';
import { UserStoreState } from './user-store.state';

@Service()
export class UserService extends ObservableStore<UserStoreState> {
  private readonly deviceType = computed(
    () => this.deviceDetectorService.deviceInfo().deviceType
  );

  private hasRestoredDateRange = false;

  private readonly destroyRef = inject(DestroyRef);
  private readonly deviceDetectorService = inject(DeviceDetectorService);
  private readonly dialog = inject(MatDialog);
  private readonly http = inject(HttpClient);
  private readonly webAuthnService = inject(WebAuthnService);

  public constructor() {
    super({ trackStateHistory: true });

    this.setState({ user: undefined }, UserStoreActions.Initialize);
  }

  public get(force = false) {
    const state = this.getState();

    if (state?.user && force !== true) {
      // Get from cache
      return of(state.user);
    } else {
      // Get from endpoint
      return this.fetchUser().pipe(catchError(this.handleError));
    }
  }

  public getFilters() {
    const filters: Filter[] = [];
    const user = this.getState().user;

    if (user?.settings['filters.accounts']) {
      filters.push({
        id: user.settings['filters.accounts'][0],
        type: 'ACCOUNT'
      });
    }

    if (user?.settings['filters.assetClasses']) {
      filters.push({
        id: user.settings['filters.assetClasses'][0],
        type: 'ASSET_CLASS'
      });
    }

    if (user?.settings['filters.dataSource']) {
      filters.push({
        id: user.settings['filters.dataSource'],
        type: 'DATA_SOURCE'
      });
    }

    if (user?.settings['filters.symbol']) {
      filters.push({
        id: user.settings['filters.symbol'],
        type: 'SYMBOL'
      });
    }

    if (user?.settings['filters.tags']) {
      filters.push({
        id: user.settings['filters.tags'][0],
        type: 'TAG'
      });
    }

    return filters;
  }

  public hasFilters() {
    return this.getFilters().length > 0;
  }

  public reset() {
    this.setState({ user: undefined }, UserStoreActions.RemoveUser);
  }

  public signOut() {
    const utmSource = window.localStorage.getItem('utm_source');

    if (this.webAuthnService.isEnabled()) {
      this.webAuthnService.deregister().subscribe();
    }

    window.localStorage.clear();
    window.sessionStorage.clear();

    this.clearBullBoardCookie();

    this.reset();

    if (utmSource) {
      window.localStorage.setItem('utm_source', utmSource);
    }
  }

  private clearBullBoardCookie() {
    document.cookie = `${BULL_BOARD_COOKIE_NAME}=; Max-Age=0; path=/`;
  }

  private fetchUser(): Observable<User> {
    return this.http.get<any>('/api/v1/user').pipe(
      map((user) => {
        if (user.dateOfFirstActivity) {
          user.dateOfFirstActivity = parseISO(user.dateOfFirstActivity);
        }

        if (user.settings?.retirementDate) {
          user.settings.retirementDate = parseISO(user.settings.retirementDate);
        }

        if (user.subscription?.expiresAt) {
          user.subscription.expiresAt = parseISO(user.subscription.expiresAt);
        }

        if (user.subscription?.subscribedAt) {
          user.subscription.subscribedAt = parseISO(
            user.subscription.subscribedAt
          );
        }

        this.restoreStoredDateRange(user);

        this.setState({ user }, UserStoreActions.GetUser);

        if (
          hasPermission(
            user.permissions,
            permissions.enableSubscriptionInterstitial
          ) &&
          !window.sessionStorage.getItem(KEY_SUBSCRIPTION_INTERSTITIAL_SHOWN)
        ) {
          window.sessionStorage.setItem(
            KEY_SUBSCRIPTION_INTERSTITIAL_SHOWN,
            'true'
          );

          const dialogRef = this.dialog.open<
            GfSubscriptionInterstitialDialogComponent,
            SubscriptionInterstitialDialogParams
          >(GfSubscriptionInterstitialDialogComponent, {
            autoFocus: false,
            data: {
              user
            },
            disableClose: true,
            height: this.deviceType() === 'mobile' ? '98vh' : '80vh',
            width: this.deviceType() === 'mobile' ? '100vw' : '50rem'
          });

          dialogRef
            .afterClosed()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe();
        }

        return user;
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Restores the date range selected last on this device once per page load,
   * e.g. if the stored user setting has been changed from another device.
   */
  private restoreStoredDateRange(user: User) {
    if (this.hasRestoredDateRange || !user.settings) {
      return;
    }

    this.hasRestoredDateRange = true;

    const storedDateRange = getStoredDateRange();

    if (
      !storedDateRange ||
      storedDateRange === user.settings.dateRange ||
      user.settings.viewMode === 'ZEN'
    ) {
      return;
    }

    user.settings.dateRange = storedDateRange;

    this.http
      .put('/api/v1/user/setting', { dateRange: storedDateRange })
      .pipe(
        catchError(() => EMPTY),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe();
  }

  private handleError(error: any) {
    if (error.error instanceof Error) {
      const errMessage = error.error.message;
      return throwError(errMessage);
    }

    return throwError(error ?? 'Server error');
  }
}
