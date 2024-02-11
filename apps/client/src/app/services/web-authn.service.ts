import { AuthDeviceDto } from '@ghostfolio/api/app/auth-device/auth-device.dto';
import {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON
} from '@ghostfolio/api/app/auth/interfaces/simplewebauthn';
import { SettingsStorageService } from '@ghostfolio/client/services/settings-storage.service';

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import {
  startAuthentication,
  startRegistration
} from '@simplewebauthn/browser';
import { of } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class WebAuthnService {
  private static readonly WEB_AUTH_N_DEVICE_ID = 'WEB_AUTH_N_DEVICE_ID';

  public constructor(
    private http: HttpClient,
    private settingsStorageService: SettingsStorageService
  ) {}

  public isSupported() {
    return typeof PublicKeyCredential !== 'undefined';
  }

  public isEnabled() {
    return !!this.getDeviceId();
  }

  public register() {
    return this.http
      .get<PublicKeyCredentialCreationOptionsJSON>(
        `/api/v1/auth/webauthn/generate-registration-options`,
        {}
      )
      .pipe(
        catchError((error) => {
          console.warn('Could not register device', error);
          return of(null);
        }),
        switchMap((attOps) => {
          return startRegistration(attOps);
        }),
        switchMap((credential) => {
          return this.http.post<AuthDeviceDto>(
            `/api/v1/auth/webauthn/verify-attestation`,
            { credential }
          );
        }),
        tap((authDevice) =>
          this.settingsStorageService.setSetting(
            WebAuthnService.WEB_AUTH_N_DEVICE_ID,
            authDevice.id
          )
        )
      );
  }

  public deregister() {
    const deviceId = this.getDeviceId();

    return this.http
      .delete<AuthDeviceDto>(`/api/v1/auth-device/${deviceId}`)
      .pipe(
        catchError((error) => {
          console.warn(`Could not deregister device ${deviceId}`, error);
          return of(null);
        }),
        tap(() =>
          this.settingsStorageService.removeSetting(
            WebAuthnService.WEB_AUTH_N_DEVICE_ID
          )
        )
      );
  }

  public login() {
    const deviceId = this.getDeviceId();

    return this.http
      .post<PublicKeyCredentialRequestOptionsJSON>(
        `/api/v1/auth/webauthn/generate-assertion-options`,
        { deviceId }
      )
      .pipe(
        switchMap((requestOptionsJSON) => {
          return startAuthentication(requestOptionsJSON);
        }),
        switchMap((credential) => {
          return this.http.post<{ authToken: string }>(
            `/api/v1/auth/webauthn/verify-assertion`,
            {
              credential,
              deviceId
            }
          );
        })
      );
  }

  private getDeviceId() {
    return this.settingsStorageService.getSetting(
      WebAuthnService.WEB_AUTH_N_DEVICE_ID
    );
  }
}
