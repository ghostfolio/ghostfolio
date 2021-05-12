import { Component, OnDestroy, OnInit } from '@angular/core';
import { startAssertion, startAttestation } from '@simplewebauthn/browser';
import { filter, switchMap, takeUntil } from 'rxjs/operators';
import { TokenStorageService } from '@ghostfolio/client/services/token-storage.service';
import { HttpClient } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { ReplaySubject, Subject } from 'rxjs';
import { AuthDeviceDto } from '@ghostfolio/api/app/auth-device/auth-device.dto';
import { DataService } from '@ghostfolio/client/services/data.service';
import { AuthDeviceDialog } from '@ghostfolio/client/pages/auth-devices/auth-device-dialog/auth-device-dialog.component';
import { isNonNull } from '@ghostfolio/client/util/rxjs.util';

@Component({
  selector: 'gf-auth-devices-page',
  templateUrl: './auth-devices-page.component.html',
  styleUrls: ['./auth-devices-page.component.scss']
})
export class AuthDevicesPageComponent implements OnDestroy, OnInit {

  public authDevices$: ReplaySubject<AuthDeviceDto[]> = new ReplaySubject(1);

  private unsubscribeSubject = new Subject<void>();


  constructor(
    private dataService: DataService,
    private tokenStorageService: TokenStorageService,
    private http: HttpClient,
    private dialog: MatDialog
  ) {
    this.fetchAuthDevices();
  }

  public ngOnInit() {
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }

  public startWebAuthn() {
    this.http.get<any>(`/api/auth/webauthn/generate-attestation-options`, {})
      .pipe(
        switchMap(attOps => {
          return startAttestation(attOps);
        }),
        switchMap(attResp => {
          const dialogRef = this.dialog.open(AuthDeviceDialog, {
            data: {
              authDevice: {}
            }
          });
          return dialogRef.afterClosed().pipe(switchMap(data => {
            const reqBody = {
              ...attResp,
              deviceName: data.authDevice.name
            };
            return this.http.post<any>(`/api/auth/webauthn/verify-attestation`, reqBody);
          }));
        })
      )
      .subscribe(() => {
        this.fetchAuthDevices();
      });
  }

  public verifyWebAuthn() {
    this.http.get<any>(`/api/auth/webauthn/generate-assertion-options`, {})
      .pipe(
        switchMap(startAssertion),
        switchMap(assertionResponse => this.http.post<any>(`/api/auth/webauthn/verify-assertion`, assertionResponse))
      )
      .subscribe(res => {
        if (res?.verified) alert('success');
        else alert('fail');
      });
  }

  public deleteAuthDevice(aId: string) {
    this.dataService.deleteAuthDevice(aId).subscribe({
      next: () => {
        this.fetchAuthDevices();
      }
    });
  }

  public updateAuthDevice(aAuthDevice: AuthDeviceDto) {
    const dialogRef = this.dialog.open(AuthDeviceDialog, {
      data: {
        authDevice: aAuthDevice
      }
    });

    dialogRef.afterClosed()
      .pipe(
        filter(isNonNull),
        switchMap(data => this.dataService.updateAuthDevice(data.authDevice))
      )
      .subscribe({
        next: () => {
          this.fetchAuthDevices();
        }
      });
  }

  private fetchAuthDevices() {
    this.dataService
      .fetchAuthDevices()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(authDevices => {
        this.authDevices$.next(authDevices);
      });
  }
}
