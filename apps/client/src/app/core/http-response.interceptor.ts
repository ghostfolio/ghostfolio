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
import { DataService } from '@ghostfolio/client/services/data.service';
import { TokenStorageService } from '@ghostfolio/client/services/token-storage.service';
import { WebAuthnService } from '@ghostfolio/client/services/web-authn.service';
import { InfoItem } from '@ghostfolio/common/interfaces';
import { StatusCodes } from 'http-status-codes';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

@Injectable()
export class HttpResponseInterceptor implements HttpInterceptor {
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
                'This feature is currently unavailable. Please try again later.',
                undefined,
                { duration: 6000 }
              );
            } else {
              this.snackBarRef = this.snackBar.open(
                'This feature requires a subscription.',
                'Upgrade Plan',
                { duration: 6000 }
              );
            }

            this.snackBarRef.afterDismissed().subscribe(() => {
              this.snackBarRef = undefined;
            });

            this.snackBarRef.onAction().subscribe(() => {
              this.router.navigate(['/pricing']);
            });
          }
        } else if (error.status === StatusCodes.INTERNAL_SERVER_ERROR) {
          if (!this.snackBarRef) {
            this.snackBarRef = this.snackBar.open(
              'Oops! Something went wrong. Please try again later.',
              'Okay',
              { duration: 6000 }
            );

            this.snackBarRef.afterDismissed().subscribe(() => {
              this.snackBarRef = undefined;
            });

            this.snackBarRef.onAction().subscribe(() => {
              window.location.reload();
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
