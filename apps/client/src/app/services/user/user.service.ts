import { Filter, User } from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ObservableStore } from '@codewithdan/observable-store';
import { parseISO } from 'date-fns';
import { DeviceDetectorService } from 'ngx-device-detector';
import { Observable, Subject, of } from 'rxjs';
import { throwError } from 'rxjs';
import { catchError, map, takeUntil } from 'rxjs/operators';

import { SubscriptionInterstitialDialogParams } from '../../components/subscription-interstitial-dialog/interfaces/interfaces';
import { SubscriptionInterstitialDialog } from '../../components/subscription-interstitial-dialog/subscription-interstitial-dialog.component';
import { UserStoreActions } from './user-store.actions';
import { UserStoreState } from './user-store.state';

@Injectable({
  providedIn: 'root'
})
export class UserService extends ObservableStore<UserStoreState> {
  private deviceType: string;
  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private deviceService: DeviceDetectorService,
    private dialog: MatDialog,
    private http: HttpClient
  ) {
    super({ trackStateHistory: true });

    this.setState({ user: undefined }, UserStoreActions.Initialize);

    this.deviceType = this.deviceService.getDeviceInfo().deviceType;
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
        id: user.settings['filters.accounts'].join(','),
        type: 'ACCOUNT'
      });
    }

    if (user?.settings['filters.assetClasses']) {
      filters.push({
        id: user.settings['filters.assetClasses'].join(','),
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
        id: user.settings['filters.tags'].join(','),
        type: 'TAG'
      });
    }

    return filters;
  }

  public hasFilters() {
    return this.getFilters().length > 0;
  }

  public remove() {
    this.setState({ user: null }, UserStoreActions.RemoveUser);
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

        this.setState({ user }, UserStoreActions.GetUser);

        if (
          hasPermission(
            user.permissions,
            permissions.enableSubscriptionInterstitial
          )
        ) {
          const dialogRef = this.dialog.open(SubscriptionInterstitialDialog, {
            autoFocus: false,
            data: {
              user
            } as SubscriptionInterstitialDialogParams,
            disableClose: true,
            height: this.deviceType === 'mobile' ? '98vh' : '80vh',
            width: this.deviceType === 'mobile' ? '100vw' : '50rem'
          });

          dialogRef
            .afterClosed()
            .pipe(takeUntil(this.unsubscribeSubject))
            .subscribe();
        }

        return user;
      }),
      catchError(this.handleError)
    );
  }

  private handleError(error: any) {
    if (error.error instanceof Error) {
      const errMessage = error.error.message;
      return throwError(errMessage);
    }

    return throwError(error || 'Server error');
  }
}
