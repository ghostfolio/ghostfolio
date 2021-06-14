import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AuthDeviceDto } from '@ghostfolio/api/app/auth-device/auth-device.dto';
import {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON
} from '@ghostfolio/api/app/auth/interfaces/simplewebauthn';
import { SettingsStorageService } from '@ghostfolio/client/services/settings-storage.service';
import { startAssertion, startAttestation } from '@simplewebauthn/browser';
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
        `/api/auth/webauthn/generate-attestation-options`,
        {}
      )
      .pipe(
        catchError((error) => {
          console.warn('Could not register device', error);
          return of(null);
        }),
        switchMap((attOps) => {
          return startAttestation(attOps);
        }),
        switchMap((attResp) => {
          return this.http.post<AuthDeviceDto>(
            `/api/auth/webauthn/verify-attestation`,
            {
              credential: attResp
            }
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
    return this.http.delete<AuthDeviceDto>(`/api/auth-device/${deviceId}`).pipe(
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
        `/api/auth/webauthn/generate-assertion-options`,
        { deviceId }
      )
      .pipe(
        switchMap(startAssertion),
        switchMap((assertionResponse) => {
          return this.http.post<{ authToken: string }>(
            `/api/auth/webauthn/verify-assertion`,
            {
              credential: assertionResponse,
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
