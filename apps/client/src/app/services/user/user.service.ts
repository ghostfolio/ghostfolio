import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { ObservableStore } from '@codewithdan/observable-store';
import { SubscriptionInterstitialDialogParams } from '@ghostfolio/client/components/subscription-interstitial-dialog/interfaces/interfaces';
import { SubscriptionInterstitialDialog } from '@ghostfolio/client/components/subscription-interstitial-dialog/subscription-interstitial-dialog.component';
import { User } from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { DeviceDetectorService } from 'ngx-device-detector';
import { Subject, of } from 'rxjs';
import { throwError } from 'rxjs';
import { catchError, map, takeUntil } from 'rxjs/operators';

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

  public remove() {
    this.setState({ user: null }, UserStoreActions.RemoveUser);
  }

  private fetchUser() {
    return this.http.get<User>('/api/v1/user').pipe(
      map((user) => {
        this.setState({ user }, UserStoreActions.GetUser);

        if (
          hasPermission(
            user.permissions,
            permissions.enableSubscriptionInterstitial
          )
        ) {
          const dialogRef = this.dialog.open(SubscriptionInterstitialDialog, {
            autoFocus: false,
            data: <SubscriptionInterstitialDialogParams>{},
            height: this.deviceType === 'mobile' ? '97.5vh' : '80vh',
            width: this.deviceType === 'mobile' ? '100vw' : '50rem'
          });

          dialogRef
            .afterClosed()
            .pipe(takeUntil(this.unsubscribeSubject))
            .subscribe(() => {});
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
