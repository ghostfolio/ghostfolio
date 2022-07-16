import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AuthClient } from '@dfinity/auth-client';
import { OAuthResponse } from '@ghostfolio/common/interfaces';
import { EMPTY } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class InternetIdentityService {
  public constructor(private http: HttpClient) {}

  public async login(): Promise<OAuthResponse> {
    const authClient = await AuthClient.create();

    return await new Promise((resolve, reject) => {
      authClient.login({
        onError: async () => {
          return reject();
        },
        onSuccess: () => {
          const principalId = authClient.getIdentity().getPrincipal();

          this.http
            .get<OAuthResponse>(
              `/api/v1/auth/internet-identity/${principalId.toText()}`
            )
            .pipe(
              catchError(() => {
                reject();
                return EMPTY;
              })
            )
            .subscribe((response) => {
              resolve(response);
            });
        }
      });
    });
  }
}
