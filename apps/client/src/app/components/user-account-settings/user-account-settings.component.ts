import {
  KEY_STAY_SIGNED_IN,
  KEY_TOKEN,
  SettingsStorageService
} from '@ghostfolio/client/services/settings-storage.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { WebAuthnService } from '@ghostfolio/client/services/web-authn.service';
import {
  DEFAULT_LANGUAGE_CODE,
  E_MAIL_LINE_BREAK
} from '@ghostfolio/common/config';
import { ConfirmationDialogType } from '@ghostfolio/common/enums';
import { downloadAsFile } from '@ghostfolio/common/helper';
import { User } from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { internalRoutes } from '@ghostfolio/common/routes/routes';
import { GfCurrencySelectorComponent } from '@ghostfolio/ui/currency-selector';
import { NotificationService } from '@ghostfolio/ui/notifications';
import { DataService } from '@ghostfolio/ui/services';
import { GfValueComponent } from '@ghostfolio/ui/value';

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  DestroyRef,
  inject,
  OnInit
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormControl,
  FormGroup,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import {
  MatSlideToggleChange,
  MatSlideToggleModule
} from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterModule } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { format, parseISO } from 'date-fns';
import { addIcons } from 'ionicons';
import { eyeOffOutline, eyeOutline } from 'ionicons/icons';
import ms from 'ms';
import { DeviceDetectorService } from 'ngx-device-detector';
import { EMPTY, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    GfCurrencySelectorComponent,
    GfValueComponent,
    IonIcon,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    ReactiveFormsModule,
    RouterModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'gf-user-account-settings',
  styleUrls: ['./user-account-settings.scss'],
  templateUrl: './user-account-settings.html'
})
export class GfUserAccountSettingsComponent implements OnInit {
  protected readonly appearancePlaceholder = $localize`Auto`;
  protected readonly baseCurrencyForm = new FormGroup({
    baseCurrency: new FormControl<string | null>({
      disabled: true,
      value: null
    })
  });
  protected closeUserAccountMailHref: string;
  protected readonly currencies: string[] = [];
  protected readonly deleteOwnUserForm = inject(NonNullableFormBuilder).group({
    accessToken: ['', Validators.required]
  });
  protected hasPermissionToDeleteOwnUser: boolean;
  protected hasPermissionToRequestOwnUserDeletion: boolean;
  protected hasPermissionToUpdateViewMode: boolean;
  protected hasPermissionToUpdateUserSettings: boolean;
  protected isAccessTokenHidden = true;
  protected readonly isFingerprintSupported = this.doesBrowserSupportAuthn();
  protected isLoading = true;
  protected isWebAuthnEnabled: boolean;
  protected readonly language = document.documentElement.lang;
  protected locales = [
    'ca',
    'de',
    'de-CH',
    'en-GB',
    'en-US',
    'es',
    'fr',
    'it',
    // 'ja',
    'ko',
    'nl',
    'pl',
    'pt',
    'tr',
    'uk',
    'zh'
  ];
  protected readonly previewDate = new Date().toISOString();
  protected readonly previewValue = 9999.99;
  protected user: User;

  protected readonly deviceType = computed(
    () => this.deviceDetectorService.deviceInfo().deviceType
  );

  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly dataService = inject(DataService);
  private readonly deviceDetectorService = inject(DeviceDetectorService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly notificationService = inject(NotificationService);
  private readonly settingsStorageService = inject(SettingsStorageService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly userService = inject(UserService);
  private readonly webAuthnService = inject(WebAuthnService);

  public constructor() {
    const { currencies } = this.dataService.fetchInfo();

    this.currencies = currencies;

    this.userService.stateChanged
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((state) => {
        if (state?.user) {
          this.user = state.user;

          const userDetailUrl = [
            window.location.origin,
            DEFAULT_LANGUAGE_CODE,
            internalRoutes.adminControl.path,
            internalRoutes.adminControl.subRoutes.users.path,
            this.user.id
          ].join('/');

          this.closeUserAccountMailHref = `mailto:hi@ghostfol.io?subject=Delete Account&body=${[
            'Hello',
            '',
            'Please delete my Ghostfolio account.',
            '',
            `User ID: ${this.user.id}`,
            '',
            'Kind regards',
            '',
            '',
            '---',
            userDetailUrl
          ].join(E_MAIL_LINE_BREAK)}`;

          this.hasPermissionToDeleteOwnUser = hasPermission(
            this.user.permissions,
            permissions.deleteOwnUser
          );

          this.hasPermissionToRequestOwnUserDeletion = hasPermission(
            this.user.permissions,
            permissions.requestOwnUserDeletion
          );

          this.hasPermissionToUpdateUserSettings = hasPermission(
            this.user.permissions,
            permissions.updateUserSettings
          );

          this.hasPermissionToUpdateViewMode = hasPermission(
            this.user.permissions,
            permissions.updateViewMode
          );

          this.baseCurrencyForm.setValue({
            baseCurrency: this.user.settings.baseCurrency ?? null
          });

          if (this.hasPermissionToUpdateUserSettings) {
            this.baseCurrencyForm.enable({ emitEvent: false });
          } else {
            this.baseCurrencyForm.disable({ emitEvent: false });
          }

          if (this.user.settings.locale) {
            this.locales.push(this.user.settings.locale);
          }

          this.locales = Array.from(new Set(this.locales)).sort();

          this.isLoading = false;

          this.changeDetectorRef.markForCheck();
        }
      });

    this.baseCurrencyForm.controls.baseCurrency.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        // The currency selector emits null while the user is typing and only
        // emits a currency once an option has been selected
        if (value && value !== this.user?.settings.baseCurrency) {
          this.onChangeUserSetting('baseCurrency', value);
        }
      });

    addIcons({ eyeOffOutline, eyeOutline });
  }

  public ngOnInit() {
    this.update();
  }

  protected isCommunityLanguage() {
    return !['de', 'en'].includes(this.language);
  }

  protected onChangeUserSetting(aKey: string, aValue: string) {
    this.dataService
      .putUserSetting({ [aKey]: aValue })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.userService
          .get(true)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe((user) => {
            this.user = user;

            this.changeDetectorRef.markForCheck();

            if (aKey === 'language') {
              if (aValue) {
                window.location.href = `../${aValue}/${internalRoutes.account.path}`;
              } else {
                window.location.href = '../';
              }
            }
          });
      });
  }

  protected onCloseAccount() {
    this.notificationService.confirm({
      confirmFn: () => {
        this.dataService
          .deleteOwnUser({
            accessToken: this.deleteOwnUserForm.controls.accessToken.value
          })
          .pipe(
            catchError(() => {
              this.notificationService.alert({
                title: $localize`Oops! Incorrect Security Token.`
              });

              return EMPTY;
            }),
            takeUntilDestroyed(this.destroyRef)
          )
          .subscribe(() => {
            this.userService.signOut();

            document.location.href = `/${document.documentElement.lang}`;
          });
      },
      confirmType: ConfirmationDialogType.Warn,
      title: $localize`Do you really want to close your Ghostfolio account?`
    });
  }

  protected onExperimentalFeaturesChange(aEvent: MatSlideToggleChange) {
    this.dataService
      .putUserSetting({ isExperimentalFeatures: aEvent.checked })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.userService
          .get(true)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe((user) => {
            this.user = user;

            this.changeDetectorRef.markForCheck();
          });
      });
  }

  protected onExport() {
    this.dataService
      .fetchExport()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((data) => {
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

  protected onRestrictedViewChange(aEvent: MatSlideToggleChange) {
    this.dataService
      .putUserSetting({ isRestrictedView: aEvent.checked })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.userService
          .get(true)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe((user) => {
            this.user = user;

            this.changeDetectorRef.markForCheck();
          });
      });
  }

  protected async onSignInWithFingerprintChange(aEvent: MatSlideToggleChange) {
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

  protected onViewModeChange(aEvent: MatSlideToggleChange) {
    this.dataService
      .putUserSetting({ viewMode: aEvent.checked === true ? 'ZEN' : 'DEFAULT' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.userService
          .get(true)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe((user) => {
            this.user = user;

            this.changeDetectorRef.markForCheck();
          });
      });
  }

  private deregisterDevice() {
    this.webAuthnService
      .deregister()
      .pipe(
        catchError(() => {
          this.update();

          return EMPTY;
        }),
        takeUntilDestroyed(this.destroyRef)
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
              {
                duration: ms('3 seconds')
              }
            );

            return throwError(() => {
              return error;
            });
          }),
          takeUntilDestroyed(this.destroyRef)
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
