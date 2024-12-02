import { ConfirmationDialogType } from '@ghostfolio/client/core/notification/confirmation-dialog/confirmation-dialog.type';
import { NotificationService } from '@ghostfolio/client/core/notification/notification.service';
import { DataService } from '@ghostfolio/client/services/data.service';
import {
  KEY_STAY_SIGNED_IN,
  KEY_TOKEN,
  SettingsStorageService
} from '@ghostfolio/client/services/settings-storage.service';
import { TokenStorageService } from '@ghostfolio/client/services/token-storage.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { WebAuthnService } from '@ghostfolio/client/services/web-authn.service';
import { downloadAsFile } from '@ghostfolio/common/helper';
import { User } from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit
} from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MatSlideToggleChange } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { format, parseISO } from 'date-fns';
import { uniq } from 'lodash';
import { EMPTY, Subject, throwError } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'gf-user-account-settings',
  styleUrls: ['./user-account-settings.scss'],
  templateUrl: './user-account-settings.html'
})
export class UserAccountSettingsComponent implements OnDestroy, OnInit {
  public appearancePlaceholder = $localize`Auto`;
  public baseCurrency: string;
  public currencies: string[] = [];
  public deleteOwnUserForm = this.formBuilder.group({
    accessToken: ['', Validators.required]
  });
  public hasPermissionToDeleteOwnUser: boolean;
  public hasPermissionToUpdateViewMode: boolean;
  public hasPermissionToUpdateUserSettings: boolean;
  public isAccessTokenHidden = true;
  public isFingerprintSupported = this.doesBrowserSupportAuthn();
  public isWebAuthnEnabled: boolean;
  public language = document.documentElement.lang;
  public locales = [
    'ca',
    'de',
    'de-CH',
    'en-GB',
    'en-US',
    'es',
    'fr',
    'it',
    'nl',
    'pl',
    'pt',
    'tr',
    'zh'
  ];
  public user: User;

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService,
    private formBuilder: FormBuilder,
    private notificationService: NotificationService,
    private settingsStorageService: SettingsStorageService,
    private snackBar: MatSnackBar,
    private tokenStorageService: TokenStorageService,
    private userService: UserService,
    public webAuthnService: WebAuthnService
  ) {
    const { baseCurrency, currencies } = this.dataService.fetchInfo();

    this.baseCurrency = baseCurrency;
    this.currencies = currencies;

    this.userService.stateChanged
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((state) => {
        if (state?.user) {
          this.user = state.user;

          this.hasPermissionToDeleteOwnUser = hasPermission(
            this.user.permissions,
            permissions.deleteOwnUser
          );

          this.hasPermissionToUpdateUserSettings = hasPermission(
            this.user.permissions,
            permissions.updateUserSettings
          );

          this.hasPermissionToUpdateViewMode = hasPermission(
            this.user.permissions,
            permissions.updateViewMode
          );

          this.locales.push(this.user.settings.locale);
          this.locales = uniq(this.locales.sort());

          this.changeDetectorRef.markForCheck();
        }
      });
  }

  public ngOnInit() {
    this.update();
  }

  public isCommunityLanguage() {
    return !['de', 'en'].includes(this.language);
  }

  public onChangeUserSetting(aKey: string, aValue: string) {
    this.dataService
      .putUserSetting({ [aKey]: aValue })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(() => {
        this.userService
          .get(true)
          .pipe(takeUntil(this.unsubscribeSubject))
          .subscribe((user) => {
            this.user = user;

            this.changeDetectorRef.markForCheck();

            if (aKey === 'language') {
              if (aValue) {
                window.location.href = `../${aValue}/account`;
              } else {
                window.location.href = `../`;
              }
            }
          });
      });
  }

  public onCloseAccount() {
    this.notificationService.confirm({
      confirmFn: () => {
        this.dataService
          .deleteOwnUser({
            accessToken: this.deleteOwnUserForm.get('accessToken').value
          })
          .pipe(
            catchError(() => {
              this.notificationService.alert({
                title: $localize`Oops! Incorrect Security Token.`
              });

              return EMPTY;
            }),
            takeUntil(this.unsubscribeSubject)
          )
          .subscribe(() => {
            this.tokenStorageService.signOut();
            this.userService.remove();

            document.location.href = `/${document.documentElement.lang}`;
          });
      },
      confirmType: ConfirmationDialogType.Warn,
      title: $localize`Do you really want to close your Ghostfolio account?`
    });
  }

  public onExperimentalFeaturesChange(aEvent: MatSlideToggleChange) {
    this.dataService
      .putUserSetting({ isExperimentalFeatures: aEvent.checked })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(() => {
        this.userService
          .get(true)
          .pipe(takeUntil(this.unsubscribeSubject))
          .subscribe((user) => {
            this.user = user;

            this.changeDetectorRef.markForCheck();
          });
      });
  }

  public onExport() {
    this.dataService
      .fetchExport()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((data) => {
        for (const activity of data.activities) {
          delete activity.id;
        }

        downloadAsFile({
          content: data,
          fileName: `ghostfolio-export-${format(
            parseISO(data.meta.date),
            'yyyyMMddHHmm'
          )}.json`,
          format: 'json'
        });
      });
  }

  public onRestrictedViewChange(aEvent: MatSlideToggleChange) {
    this.dataService
      .putUserSetting({ isRestrictedView: aEvent.checked })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(() => {
        this.userService
          .get(true)
          .pipe(takeUntil(this.unsubscribeSubject))
          .subscribe((user) => {
            this.user = user;

            this.changeDetectorRef.markForCheck();
          });
      });
  }

  public async onSignInWithFingerprintChange(aEvent: MatSlideToggleChange) {
    if (aEvent.checked) {
      try {
        await this.registerDevice();
      } catch {
        aEvent.source.checked = false;

        this.changeDetectorRef.markForCheck();
      }
    } else {
      this.notificationService.confirm({
        confirmFn: () => {
          this.deregisterDevice();
        },
        discardFn: () => {
          this.update();
        },
        confirmType: ConfirmationDialogType.Warn,
        title: $localize`Do you really want to remove this sign in method?`
      });
    }
  }

  public onViewModeChange(aEvent: MatSlideToggleChange) {
    this.dataService
      .putUserSetting({ viewMode: aEvent.checked === true ? 'ZEN' : 'DEFAULT' })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(() => {
        this.userService
          .get(true)
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

  private deregisterDevice() {
    this.webAuthnService
      .deregister()
      .pipe(
        catchError(() => {
          this.update();

          return EMPTY;
        }),
        takeUntil(this.unsubscribeSubject)
      )
      .subscribe(() => {
        this.update();
      });
  }

  private doesBrowserSupportAuthn() {
    // Authn is built on top of PublicKeyCredential: https://stackoverflow.com/a/55868189
    return typeof PublicKeyCredential !== 'undefined';
  }

  private registerDevice(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.webAuthnService
        .register()
        .pipe(
          catchError((error: Error) => {
            this.snackBar.open(
              $localize`Oops! There was an error setting up biometric authentication.`,
              undefined,
              { duration: 3000 }
            );

            return throwError(() => {
              return error;
            });
          }),
          takeUntil(this.unsubscribeSubject)
        )
        .subscribe({
          next: () => {
            this.settingsStorageService.removeSetting(KEY_STAY_SIGNED_IN);
            this.settingsStorageService.removeSetting(KEY_TOKEN);

            this.update();
            resolve();
          },
          error: (error) => {
            reject(error);
          }
        });
    });
  }

  private update() {
    this.isWebAuthnEnabled = this.webAuthnService.isEnabled() ?? false;

    this.changeDetectorRef.markForCheck();
  }
}
