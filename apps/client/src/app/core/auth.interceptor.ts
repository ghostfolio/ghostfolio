import {
  HTTP_INTERCEPTORS,
  HttpErrorResponse,
  HttpEvent
} from '@angular/common/http';
import {
  HttpHandler,
  HttpInterceptor,
  HttpRequest
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import { ImpersonationStorageService } from '../services/impersonation-storage.service';
import { TokenStorageService } from '../services/token-storage.service';

const IMPERSONATION_KEY = 'Impersonation-Id';
const TOKEN_HEADER_KEY = 'Authorization';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  public constructor(
    private impersonationStorageService: ImpersonationStorageService,
    private router: Router,
    private tokenStorageService: TokenStorageService
  ) {}

  public intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    let authReq = req;
    const token = this.tokenStorageService.getToken();
    const impersonationId = this.impersonationStorageService.getId();

    if (token !== null) {
      let headers = req.headers.set(TOKEN_HEADER_KEY, `Bearer ${token}`);

      if (impersonationId !== null) {
        headers = headers.set(IMPERSONATION_KEY, impersonationId);
      }

      authReq = req.clone({ headers });
    }

    return next.handle(authReq);
  }
}

export const authInterceptorProviders = [
  { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }
];
