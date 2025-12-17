import { DataService } from '@ghostfolio/client/services/data.service';
import {
  KEY_STAY_SIGNED_IN,
  KEY_TOKEN,
  SettingsStorageService
} from '@ghostfolio/client/services/settings-storage.service';
import { TokenStorageService } from '@ghostfolio/client/services/token-storage.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { WebAuthnService } from '@ghostfolio/client/services/web-authn.service';
import { ConfirmationDialogType } from '@ghostfolio/common/enums';
import { downloadAsFile } from '@ghostfolio/common/helper';
import { User } from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { NotificationService } from '@ghostfolio/ui/notifications';

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  OnDestroy,
  OnInit
} from '@angular/core';
import {
  FormBuilder,
  FormsModule,
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
import { ActivatedRoute, RouterModule } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { format, parseISO } from 'date-fns';
import { addIcons } from 'ionicons';
import { eyeOffOutline, eyeOutline, linkOutline } from 'ionicons/icons';
import ms from 'ms';
import { EMPTY, Subject, throwError } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
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
export class GfUserAccountSettingsComponent implements OnDestroy, OnInit {
  public appearancePlaceholder = $localize`Auto`;
  public baseCurrency: string;
  public canLinkOidc = false;
  public currencies: string[] = [];
  public deleteOwnUserForm = this.formBuilder.group({
    accessToken: ['', Validators.required]
  });
  public hasOidcLinked = false;
  public hasPermissionForAuthOidc = false;
  public hasPermissionForAuthToken = false;
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
    'uk',
    'zh'
  ];
  public user: User;

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private activatedRoute: ActivatedRoute,
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
    const { baseCurrency, currencies, globalPermissions } =
      this.dataService.fetchInfo();

    this.baseCurrency = baseCurrency;
    this.currencies = currencies;

    this.hasPermissionForAuthOidc = hasPermission(
      globalPermissions,
      permissions.enableAuthOidc
    );

    this.hasPermissionForAuthToken = hasPermission(
      globalPermissions,
      permissions.enableAuthToken
    );

    this.userService.stateChanged
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((state) => {
        if (state?.user) {
          this.user = state.user;

          // Check if user can link OIDC
          // Both OIDC and Token auth must be enabled to show linking feature
          // Only show for users with token auth (provider ANONYMOUS)
          this.hasOidcLinked =
            this.hasPermissionForAuthOidc &&
            this.hasPermissionForAuthToken &&
            this.user.provider === 'ANONYMOUS' &&
            !!this.user.thirdPartyId;

          this.canLinkOidc =
            this.hasPermissionForAuthOidc &&
            this.hasPermissionForAuthToken &&
            this.user.provider === 'ANONYMOUS' &&
            !this.user.thirdPartyId;

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
          this.locales = Array.from(new Set(this.locales)).sort();

          this.changeDetectorRef.markForCheck();
        }
      });

    addIcons({ eyeOffOutline, eyeOutline, linkOutline });
  }

  public ngOnInit() {
    this.update();

    // Handle query params for link results
    this.activatedRoute.queryParams
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((params) => {
        if (params['linkSuccess'] === 'true') {
          this.snackBar.open(
            $localize`Your OIDC account has been successfully linked.`,
            undefined,
            { duration: ms('5 seconds') }
          );
          // Refresh user data
          this.userService.get(true).subscribe();
        } else if (params['linkError']) {
          let errorMessage = $localize`Failed to link OIDC account.`;
          switch (params['linkError']) {
            case 'already-linked':
              errorMessage = $localize`This OIDC account is already linked to another user.`;
              break;
            case 'invalid-session':
              errorMessage = $localize`Your session is invalid. Please log in again.`;
              break;
            case 'invalid-provider':
              errorMessage = $localize`Only token-authenticated users can link OIDC.`;
              break;
          }
          this.snackBar.open(errorMessage, undefined, {
            duration: ms('5 seconds')
          });
        }
      });
  }

  public getAuthProviderDisplayName(): string {
    switch (this.user?.provider) {
      case 'ANONYMOUS':
        return 'Security Token';
      case 'GOOGLE':
        return 'Google';
      case 'OIDC':
        return 'OpenID Connect (OIDC)';
      default:
        return this.user?.provider || 'Unknown';
    }
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

  public onLinkOidc() {
    this.notificationService.confirm({
      confirmFn: () => {
        // Get current JWT token and navigate to OIDC with linkMode
        const token = this.tokenStorageService.getToken();
        if (token) {
          // Navigate to OIDC endpoint with linkMode and token
          window.location.href = `../api/auth/oidc?linkMode=true&token=${encodeURIComponent(token)}`;
        } else {
          this.snackBar.open(
            $localize`Unable to initiate linking. Please log in again.`,
            undefined,
            { duration: ms('3 seconds') }
          );
        }
      },
      confirmType: ConfirmationDialogType.Warn,
      discardLabel: $localize`Cancel`,
      title: $localize`Link OIDC Provider`,
      message: $localize`This will link your current account to an OIDC provider. After linking, you will be able to sign in using both your Security Token and OIDC. This action cannot be undone. Do you want to continue?`
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
              {
                duration: ms('3 seconds')
              }
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
          error: (error: Error) => {
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
