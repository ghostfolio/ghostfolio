import { DataService } from '@ghostfolio/client/services/data.service';
import { TokenStorageService } from '@ghostfolio/client/services/token-storage.service';
import { WebAuthnService } from '@ghostfolio/client/services/web-authn.service';
import { InfoItem } from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';

import {
  HTTP_INTERCEPTORS,
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import {
  MatSnackBar,
  MatSnackBarRef,
  TextOnlySnackBar
} from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { StatusCodes } from 'http-status-codes';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

@Injectable()
export class HttpResponseInterceptor implements HttpInterceptor {
  public hasPermissionForSubscription: boolean;
  public info: InfoItem;
  public snackBarRef: MatSnackBarRef<TextOnlySnackBar>;

  public constructor(
    private dataService: DataService,
    private router: Router,
    private tokenStorageService: TokenStorageService,
    private snackBar: MatSnackBar,
    private webAuthnService: WebAuthnService
  ) {
    this.info = this.dataService.fetchInfo();

    this.hasPermissionForSubscription = hasPermission(
      this.info?.globalPermissions,
      permissions.enableSubscription
    );
  }

  public intercept(
    request: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    return next.handle(request).pipe(
      tap((event: HttpEvent<any>) => {
        return event;
      }),
      catchError((error: HttpErrorResponse) => {
        if (error.status === StatusCodes.FORBIDDEN) {
          if (!this.snackBarRef) {
            if (this.info.isReadOnlyMode) {
              this.snackBarRef = this.snackBar.open(
                $localize`This feature is currently unavailable.` +
                  ' ' +
                  $localize`Please try again later.`,
                undefined,
                { duration: 6000 }
              );
            } else if (!error.url.endsWith('auth/anonymous')) {
              this.snackBarRef = this.snackBar.open(
                $localize`This feature requires a subscription.`,
                this.hasPermissionForSubscription
                  ? $localize`Upgrade Plan`
                  : undefined,
                { duration: 6000 }
              );
            }

            this.snackBarRef.afterDismissed().subscribe(() => {
              this.snackBarRef = undefined;
            });

            this.snackBarRef.onAction().subscribe(() => {
              this.router.navigate(['/' + $localize`pricing`]);
            });
          }
        } else if (error.status === StatusCodes.INTERNAL_SERVER_ERROR) {
          if (!this.snackBarRef) {
            this.snackBarRef = this.snackBar.open(
              $localize`Oops! Something went wrong.` +
                ' ' +
                $localize`Please try again later.`,
              $localize`Okay`,
              { duration: 6000 }
            );

            this.snackBarRef.afterDismissed().subscribe(() => {
              this.snackBarRef = undefined;
            });

            this.snackBarRef.onAction().subscribe(() => {
              window.location.reload();
            });
          }
        } else if (error.status === StatusCodes.TOO_MANY_REQUESTS) {
          if (!this.snackBarRef) {
            this.snackBarRef = this.snackBar.open(
              $localize`Oops! It looks like you’re making too many requests. Please slow down a bit.`
            );

            this.snackBarRef.afterDismissed().subscribe(() => {
              this.snackBarRef = undefined;
            });
          }
        } else if (error.status === StatusCodes.UNAUTHORIZED) {
          if (this.webAuthnService.isEnabled()) {
            this.router.navigate(['/webauthn']);
          } else {
            this.tokenStorageService.signOut();
          }
        }

        return throwError(error);
      })
    );
  }
}

export const httpResponseInterceptorProviders = [
  { provide: HTTP_INTERCEPTORS, useClass: HttpResponseInterceptor, multi: true }
];
