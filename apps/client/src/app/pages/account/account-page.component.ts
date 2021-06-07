import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { DataService } from '@ghostfolio/client/services/data.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { DEFAULT_DATE_FORMAT } from '@ghostfolio/common/config';
import { Access, User } from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { Currency } from '@prisma/client';
import { ReplaySubject, Subject } from 'rxjs';
import { filter, switchMap, takeUntil } from 'rxjs/operators';
import { AuthDeviceDialog } from '@ghostfolio/client/pages/account/auth-device-dialog/auth-device-dialog.component';
import { AuthDeviceDto } from '@ghostfolio/api/app/auth-device/auth-device.dto';
import { isNonNull } from '@ghostfolio/client/util/rxjs.util';
import { MatDialog } from '@angular/material/dialog';
import { WebAuthnService } from '@ghostfolio/client/services/web-authn.service';

@Component({
  selector: 'gf-account-page',
  templateUrl: './account-page.html',
  styleUrls: ['./account-page.scss']
})
export class AccountPageComponent implements OnDestroy, OnInit {
  public accesses: Access[];
  public baseCurrency: Currency;
  public currencies: Currency[] = [];
  public defaultDateFormat = DEFAULT_DATE_FORMAT;
  public hasPermissionToUpdateUserSettings: boolean;
  public user: User;
  public authDevices$: ReplaySubject<AuthDeviceDto[]> = new ReplaySubject(1);

  private unsubscribeSubject = new Subject<void>();

  /**
   * @constructor
   */
  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private dialog: MatDialog,
    private dataService: DataService,
    private userService: UserService,
    public webAuthnService: WebAuthnService
  ) {
    this.dataService
      .fetchInfo()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(({ currencies }) => {
        this.currencies = currencies;
      });

    this.userService.stateChanged
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((state) => {
        if (state?.user) {
          this.user = state.user;

          this.hasPermissionToUpdateUserSettings = hasPermission(
            this.user.permissions,
            permissions.updateUserSettings
          );

          this.changeDetectorRef.markForCheck();
        }
      });

    this.fetchAuthDevices();
  }

  /**
   * Initializes the controller
   */
  public ngOnInit() {
    this.update();
  }

  public onChangeUserSettings(aKey: string, aValue: string) {
    const settings = { ...this.user.settings, [aKey]: aValue };

    this.dataService
      .putUserSettings({
        baseCurrency: settings?.baseCurrency,
        viewMode: settings?.viewMode
      })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(() => {
        this.userService.remove();

        this.userService
          .get()
          .pipe(takeUntil(this.unsubscribeSubject))
          .subscribe((user) => {
            this.user = user;

            this.changeDetectorRef.markForCheck();
          });
      });
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }

  public startWebAuthn() {
    this.webAuthnService
      .startWebAuthn()
      .pipe(
        switchMap((attResp) => {
          const dialogRef = this.dialog.open(AuthDeviceDialog, {
            data: {
              authDevice: {}
            }
          });
          return dialogRef.afterClosed().pipe(
            switchMap((data) => {
              return this.webAuthnService.verifyAttestation(
                attResp,
                data.authDevice.name
              );
            })
          );
        })
      )
      .subscribe(() => {
        this.fetchAuthDevices();
      });
  }

  public deleteAuthDevice(aId: string) {
    this.webAuthnService.deleteAuthDevice(aId).subscribe({
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

    dialogRef
      .afterClosed()
      .pipe(
        filter(isNonNull),
        switchMap((data) =>
          this.webAuthnService.updateAuthDevice(data.authDevice)
        )
      )
      .subscribe({
        next: () => {
          this.fetchAuthDevices();
        }
      });
  }

  private fetchAuthDevices() {
    this.webAuthnService
      .fetchAuthDevices()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((authDevices) => {
        this.authDevices$.next(authDevices);
      });
  }

  private update() {
    this.dataService
      .fetchAccesses()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((response) => {
        this.accesses = response;

        this.changeDetectorRef.markForCheck();
      });
  }
}
