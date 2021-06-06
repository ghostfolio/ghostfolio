import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { switchMap, tap } from 'rxjs/operators';
import { startAssertion, startAttestation } from '@simplewebauthn/browser';
import { SettingsStorageService } from '@ghostfolio/client/services/settings-storage.service';
import {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON
} from '@ghostfolio/api/app/auth/interfaces/simplewebauthn';
import { AuthDeviceDto } from '@ghostfolio/api/app/auth-device/auth-device.dto';
import { UserService } from '@ghostfolio/client/services/user/user.service';

@Injectable({
  providedIn: 'root'
})
export class WebAuthnService {

  private static readonly WEB_AUTH_N_USER_ID = 'WEB_AUTH_N_USER_ID';
  private static readonly WEB_AUTH_N_DEVICE_ID = 'WEB_AUTH_N_DEVICE_ID';

  public constructor(
    private userService: UserService,
    private settingsStorageService: SettingsStorageService,
    private http: HttpClient,
  ) {
  }

  public startWebAuthn() {
    return this.http.get<PublicKeyCredentialCreationOptionsJSON>(`/api/auth/webauthn/generate-attestation-options`, {})
      .pipe(
        switchMap(attOps => {
          return startAttestation(attOps);
        })
      );
  }

  public verifyAttestation(attResp, deviceName) {
    return this.http.post<AuthDeviceDto>(`/api/auth/webauthn/verify-attestation`, {
      credential: attResp,
      deviceName: deviceName,
    }).pipe(tap(authDevice =>
      this.userService.get().subscribe((user) => {
        this.settingsStorageService.setSetting(WebAuthnService.WEB_AUTH_N_DEVICE_ID, authDevice.id);
        this.settingsStorageService.setSetting(WebAuthnService.WEB_AUTH_N_USER_ID, user.id);
      })
    ));
  }

  public verifyWebAuthn() {
    const userId = this.settingsStorageService.getSetting(WebAuthnService.WEB_AUTH_N_USER_ID);
    return this.http.post<PublicKeyCredentialRequestOptionsJSON>(`/api/auth/webauthn/generate-assertion-options`, {userId})
      .pipe(
        switchMap(startAssertion),
        switchMap(assertionResponse => {
          return this.http.post<{ authToken: string }>(`/api/auth/webauthn/verify-assertion`, {
            credential: assertionResponse,
            userId
          })
        })
      );
  }

  public getCurrentDeviceId() {
    return this.settingsStorageService.getSetting(WebAuthnService.WEB_AUTH_N_DEVICE_ID);
  }

  public isEnabled() {
    return !!this.settingsStorageService.getSetting(WebAuthnService.WEB_AUTH_N_DEVICE_ID);
  }

  public fetchAuthDevices() {
    return this.http.get<AuthDeviceDto[]>('/api/auth-device');
  }

  public updateAuthDevice(aAuthDevice: AuthDeviceDto) {
    return this.http.put<AuthDeviceDto>(`/api/auth-device/${aAuthDevice.id}`, aAuthDevice);
  }

  public deleteAuthDevice(aId: string) {
    return this.http.delete<AuthDeviceDto>(`/api/auth-device/${aId}`)
      .pipe(
        tap(() => {
          if (aId === this.getCurrentDeviceId()) {
            this.settingsStorageService.removeSetting(WebAuthnService.WEB_AUTH_N_DEVICE_ID);
            this.settingsStorageService.removeSetting(WebAuthnService.WEB_AUTH_N_USER_ID);
          }
        })
      );
  }
}
