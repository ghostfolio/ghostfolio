import { ImpersonationStorageService } from '@ghostfolio/client/services/impersonation-storage.service';
import { TokenStorageService } from '@ghostfolio/client/services/token-storage.service';
import {
  HEADER_KEY_IMPERSONATION,
  HEADER_KEY_TIMEZONE,
  HEADER_KEY_TOKEN
} from '@ghostfolio/common/config';

import { HTTP_INTERCEPTORS, HttpEvent } from '@angular/common/http';
import {
  HttpHandler,
  HttpInterceptor,
  HttpRequest
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  public constructor(
    private impersonationStorageService: ImpersonationStorageService,
    private tokenStorageService: TokenStorageService
  ) {}

  public intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    let request = req;
    let headers = request.headers.set(
      HEADER_KEY_TIMEZONE,
      Intl?.DateTimeFormat().resolvedOptions().timeZone
    );

    const token = this.tokenStorageService.getToken();

    if (token !== null) {
      headers = headers.set(HEADER_KEY_TOKEN, `Bearer ${token}`);

      const impersonationId = this.impersonationStorageService.getId();

      if (impersonationId !== null) {
        headers = headers.set(HEADER_KEY_IMPERSONATION, impersonationId);
      }
    }

    request = request.clone({ headers });

    return next.handle(request);
  }
}

export const authInterceptorProviders = [
  { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }
];
