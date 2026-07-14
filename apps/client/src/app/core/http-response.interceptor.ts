import { UserService } from '@ghostfolio/client/services/user/user.service';
import { WebAuthnService } from '@ghostfolio/client/services/web-authn.service';
import { InfoItem } from '@ghostfolio/common/interfaces';
import { internalRoutes, publicRoutes } from '@ghostfolio/common/routes/routes';
import { DataService } from '@ghostfolio/ui/services';

import {
  HTTP_INTERCEPTORS,
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest
} from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
  MatSnackBar,
  MatSnackBarRef,
  TextOnlySnackBar
} from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { StatusCodes } from 'http-status-codes';
import ms from 'ms';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class HttpResponseInterceptor implements HttpInterceptor {
  private readonly info: InfoItem;
  private snackBarRef: MatSnackBarRef<TextOnlySnackBar> | undefined;

  private readonly dataService = inject(DataService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly userService = inject(UserService);
  private readonly webAuthnService = inject(WebAuthnService);

  public constructor() {
    this.info = this.dataService.fetchInfo();
  }

  public intercept<T>(
    request: HttpRequest<T>,
    next: HttpHandler
  ): Observable<HttpEvent<T>> {
    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === StatusCodes.FORBIDDEN) {
          if (!this.snackBarRef) {
            if (this.info.isReadOnlyMode) {
              this.snackBarRef = this.snackBar.open(
                $localize`This feature is currently unavailable.` +
                  ' ' +
                  $localize`Please try again later.`,
                undefined,
                {
                  duration: ms('6 seconds')
                }
              );
            } else if (
              !error.url?.includes(internalRoutes.auth.routerLink.join(''))
            ) {
              this.snackBarRef = this.snackBar.open(
                $localize`This action is not allowed.`,
                undefined,
                {
                  duration: ms('6 seconds')
                }
              );
            }

            this.snackBarRef?.afterDismissed().subscribe(() => {
              this.snackBarRef = undefined;
            });

            this.snackBarRef?.onAction().subscribe(() => {
              this.router.navigate(publicRoutes.pricing.routerLink);
            });
          }
        } else if (error.status === StatusCodes.INTERNAL_SERVER_ERROR) {
          if (!this.snackBarRef) {
            this.snackBarRef = this.snackBar.open(
              $localize`Oops! Something went wrong.` +
                ' ' +
                $localize`Please try again later.`,
              $localize`Okay`,
              {
                duration: ms('6 seconds')
              }
            );

            this.snackBarRef?.afterDismissed().subscribe(() => {
              this.snackBarRef = undefined;
            });

            this.snackBarRef?.onAction().subscribe(() => {
              window.location.reload();
            });
          }
        } else if (error.status === StatusCodes.TOO_MANY_REQUESTS) {
          // Replace an already visible snack bar so that the rate limiting
          // feedback is not swallowed
          const snackBarRef = this.snackBar.open(
            $localize`Oops! It looks like you’re making too many requests. Please slow down a bit.`,
            undefined,
            {
              duration: ms('6 seconds')
            }
          );

          snackBarRef.afterDismissed().subscribe(() => {
            if (this.snackBarRef === snackBarRef) {
              this.snackBarRef = undefined;
            }
          });

          this.snackBarRef = snackBarRef;
        } else if (error.status === StatusCodes.UNAUTHORIZED) {
          if (!error.url?.includes('/data-providers/ghostfolio/status')) {
            if (this.webAuthnService.isEnabled()) {
              this.router.navigate(internalRoutes.webauthn.routerLink);
            } else {
              this.userService.signOut();
            }
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
