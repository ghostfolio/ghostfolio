import { OAuthResponse } from '@ghostfolio/common/interfaces';

import { HttpClient } from '@angular/common/http';
import { Injectable, OnDestroy } from '@angular/core';
import { AuthClient } from '@dfinity/auth-client';
import { EMPTY, Subject } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class InternetIdentityService implements OnDestroy {
  private unsubscribeSubject = new Subject<void>();

  public constructor(private http: HttpClient) {}

  public async login(): Promise<OAuthResponse> {
    const authClient = await AuthClient.create({
      idleOptions: {
        disableDefaultIdleCallback: true,
        disableIdle: true
      }
    });

    return new Promise((resolve, reject) => {
      authClient.login({
        onError: async () => {
          return reject();
        },
        onSuccess: () => {
          const principalId = authClient.getIdentity().getPrincipal();

          this.http
            .post<OAuthResponse>(`/api/v1/auth/internet-identity`, {
              principalId: principalId.toText()
            })
            .pipe(
              catchError(() => {
                reject();
                return EMPTY;
              }),
              takeUntil(this.unsubscribeSubject)
            )
            .subscribe((response) => {
              resolve(response);
            });
        }
      });
    });
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
