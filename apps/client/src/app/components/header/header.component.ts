import {
  LoginWithAccessTokenDialogParams,
  LoginWithAccessTokenDialogResult
} from '@ghostfolio/client/components/login-with-access-token-dialog/interfaces/interfaces';
import { GfLoginWithAccessTokenDialogComponent } from '@ghostfolio/client/components/login-with-access-token-dialog/login-with-access-token-dialog.component';
import { LayoutService } from '@ghostfolio/client/core/layout.service';
import { ImpersonationStorageService } from '@ghostfolio/client/services/impersonation-storage.service';
import {
  KEY_STAY_SIGNED_IN,
  SettingsStorageService
} from '@ghostfolio/client/services/settings-storage.service';
import { TokenStorageService } from '@ghostfolio/client/services/token-storage.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { UpdateUserSettingDto } from '@ghostfolio/common/dtos';
import { Filter, InfoItem, User } from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { internalRoutes, publicRoutes } from '@ghostfolio/common/routes/routes';
import { DateRange } from '@ghostfolio/common/types';
import { GfAssistantComponent } from '@ghostfolio/ui/assistant/assistant.component';
import { GfLogoComponent } from '@ghostfolio/ui/logo';
import { NotificationService } from '@ghostfolio/ui/notifications';
import { GfPremiumIndicatorComponent } from '@ghostfolio/ui/premium-indicator';
import { DataService } from '@ghostfolio/ui/services';

import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  DestroyRef,
  HostListener,
  inject,
  input,
  OnChanges,
  output,
  viewChild
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Router, RouterModule } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { StatusCodes } from 'http-status-codes';
import { addIcons } from 'ionicons';
import {
  closeOutline,
  logoGithub,
  menuOutline,
  optionsOutline,
  personCircleOutline,
  radioButtonOffOutline,
  radioButtonOnOutline
} from 'ionicons/icons';
import { EMPTY } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    GfAssistantComponent,
    GfLogoComponent,
    GfPremiumIndicatorComponent,
    IonIcon,
    MatBadgeModule,
    MatButtonModule,
    MatMenuModule,
    MatToolbarModule,
    RouterModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'gf-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class GfHeaderComponent implements OnChanges {
  public readonly currentRoute = input.required<string>();
  public readonly deviceType = input.required<string>();
  public readonly hasPermissionToChangeDateRange = input.required<boolean>();
  public readonly hasPermissionToChangeFilters = input.required<boolean>();
  public readonly hasPromotion = input.required<boolean>();
  public readonly hasTabs = input.required<boolean>();
  public readonly info = input.required<InfoItem | undefined>();
  public readonly pageTitle = input.required<string>();
  public readonly user = input.required<User | undefined>();

  public readonly signOut = output<void>();

  protected readonly assistantElement =
    viewChild.required<GfAssistantComponent>('assistant');
  protected readonly assistentMenuTriggerElement =
    viewChild.required<MatMenuTrigger>('assistantTrigger');

  protected hasFilters: boolean;
  protected hasImpersonationId: boolean;
  protected hasPermissionForAuthGoogle: boolean;
  protected hasPermissionForAuthOidc: boolean;
  protected hasPermissionForAuthToken: boolean;
  protected hasPermissionForSubscription: boolean;
  protected hasPermissionToAccessAdminControl: boolean;
  protected hasPermissionToAccessAssistant: boolean;
  protected hasPermissionToAccessFearAndGreedIndex: boolean;
  protected hasPermissionToCreateUser: boolean;
  protected impersonationId: string | null;
  protected readonly internalRoutes = internalRoutes;
  protected isMenuOpen: boolean;
  protected readonly routeAbout = publicRoutes.about.path;
  protected readonly routeFeatures = publicRoutes.features.path;
  protected readonly routeMarkets = publicRoutes.markets.path;
  protected readonly routePricing = publicRoutes.pricing.path;
  protected readonly routeResources = publicRoutes.resources.path;
  protected readonly routerLinkAbout = publicRoutes.about.routerLink;
  protected readonly routerLinkAccount = internalRoutes.account.routerLink;
  protected readonly routerLinkAccounts = internalRoutes.accounts.routerLink;
  protected readonly routerLinkAdminControl =
    internalRoutes.adminControl.routerLink;
  protected readonly routerLinkFeatures = publicRoutes.features.routerLink;
  protected readonly routerLinkMarkets = publicRoutes.markets.routerLink;
  protected readonly routerLinkPortfolio = internalRoutes.portfolio.routerLink;
  protected readonly routerLinkPricing = publicRoutes.pricing.routerLink;
  protected readonly routerLinkRegister = publicRoutes.register.routerLink;
  protected readonly routerLinkResources = publicRoutes.resources.routerLink;

  private readonly dataService = inject(DataService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = inject(MatDialog);
  private readonly impersonationStorageService = inject(
    ImpersonationStorageService
  );
  private readonly layoutService = inject(LayoutService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly settingsStorageService = inject(SettingsStorageService);
  private readonly tokenStorageService = inject(TokenStorageService);
  private readonly userService = inject(UserService);

  public constructor() {
    this.impersonationStorageService
      .onChangeHasImpersonation()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((impersonationId) => {
        this.hasImpersonationId = !!impersonationId;
        this.impersonationId = impersonationId;
      });

    addIcons({
      closeOutline,
      logoGithub,
      menuOutline,
      optionsOutline,
      personCircleOutline,
      radioButtonOffOutline,
      radioButtonOnOutline
    });
  }

  @HostListener('window:keydown', ['$event'])
  protected openAssistantWithHotKey(event: KeyboardEvent) {
    if (
      event.key === '/' &&
      event.target instanceof Element &&
      event.target?.nodeName?.toLowerCase() !== 'input' &&
      event.target?.nodeName?.toLowerCase() !== 'textarea' &&
      this.hasPermissionToAccessAssistant
    ) {
      this.assistantElement().setIsOpen(true);
      this.assistentMenuTriggerElement().openMenu();

      event.preventDefault();
    }
  }

  public ngOnChanges() {
    this.hasFilters = this.userService.hasFilters();

    this.hasPermissionForAuthGoogle = hasPermission(
      this.info()?.globalPermissions,
      permissions.enableAuthGoogle
    );

    this.hasPermissionForAuthOidc = hasPermission(
      this.info()?.globalPermissions,
      permissions.enableAuthOidc
    );

    this.hasPermissionForAuthToken = hasPermission(
      this.info()?.globalPermissions,
      permissions.enableAuthToken
    );

    this.hasPermissionForSubscription = hasPermission(
      this.info()?.globalPermissions,
      permissions.enableSubscription
    );

    this.hasPermissionToAccessAdminControl = hasPermission(
      this.user()?.permissions,
      permissions.accessAdminControl
    );

    this.hasPermissionToAccessAssistant = hasPermission(
      this.user()?.permissions,
      permissions.accessAssistant
    );

    this.hasPermissionToAccessFearAndGreedIndex = hasPermission(
      this.info()?.globalPermissions,
      permissions.enableFearAndGreedIndex
    );

    this.hasPermissionToCreateUser = hasPermission(
      this.info()?.globalPermissions,
      permissions.createUserAccount
    );
  }

  protected closeAssistant() {
    this.assistentMenuTriggerElement().closeMenu();
  }

  protected impersonateAccount(aId: string) {
    if (aId) {
      this.impersonationStorageService.setId(aId);
    } else {
      this.impersonationStorageService.removeId();
    }

    window.location.reload();
  }

  protected onDateRangeChange(dateRange: DateRange) {
    this.dataService
      .putUserSetting({ dateRange })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.userService
          .get(true)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe();
      });
  }

  protected onFiltersChanged(filters: Filter[]) {
    const userSetting: UpdateUserSettingDto = {};

    for (const filter of filters) {
      if (filter.type === 'ACCOUNT') {
        userSetting['filters.accounts'] = filter.id ? [filter.id] : null;
      } else if (filter.type === 'ASSET_CLASS') {
        userSetting['filters.assetClasses'] = filter.id ? [filter.id] : null;
      } else if (filter.type === 'DATA_SOURCE') {
        userSetting['filters.dataSource'] = filter.id ? filter.id : null;
      } else if (filter.type === 'SYMBOL') {
        userSetting['filters.symbol'] = filter.id ? filter.id : null;
      } else if (filter.type === 'TAG') {
        userSetting['filters.tags'] = filter.id ? [filter.id] : null;
      }
    }

    this.dataService
      .putUserSetting(userSetting)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.userService
          .get(true)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe();
      });
  }

  protected onLogoClick() {
    if (['home', 'zen'].includes(this.currentRoute())) {
      this.layoutService.getShouldReloadSubject().next();
    }
  }

  protected onMenuClosed() {
    this.isMenuOpen = false;
  }

  protected onMenuOpened() {
    this.isMenuOpen = true;
  }

  protected onOpenAssistant() {
    this.assistantElement().initialize();
  }

  protected onSignOut() {
    this.signOut.emit();
  }

  protected openLoginDialog() {
    const dialogRef = this.dialog.open<
      GfLoginWithAccessTokenDialogComponent,
      LoginWithAccessTokenDialogParams,
      LoginWithAccessTokenDialogResult
    >(GfLoginWithAccessTokenDialogComponent, {
      autoFocus: false,
      data: {
        accessToken: '',
        hasPermissionToUseAuthGoogle: this.hasPermissionForAuthGoogle,
        hasPermissionToUseAuthOidc: this.hasPermissionForAuthOidc,
        hasPermissionToUseAuthToken: this.hasPermissionForAuthToken,
        title: $localize`Sign in`
      },
      width: '30rem'
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((data) => {
        if (data?.accessToken) {
          this.dataService
            .loginAnonymous(data?.accessToken)
            .pipe(
              catchError((error: HttpErrorResponse) => {
                if (error.status !== StatusCodes.TOO_MANY_REQUESTS) {
                  // The notification for too many requests is handled in the
                  // HttpResponseInterceptor

                  this.notificationService.alert({
                    title: $localize`Oops! Incorrect Security Token.`
                  });
                }

                return EMPTY;
              }),
              takeUntilDestroyed(this.destroyRef)
            )
            .subscribe(({ authToken }) => {
              this.setToken(authToken);
            });
        }
      });
  }

  private setToken(aToken: string) {
    this.tokenStorageService.saveToken(
      aToken,
      this.settingsStorageService.getSetting(KEY_STAY_SIGNED_IN) === 'true'
    );

    this.userService
      .get()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((user) => {
        const userLanguage = user?.settings?.language;

        if (userLanguage && document.documentElement.lang !== userLanguage) {
          window.location.href = `../${userLanguage}`;
        } else {
          this.router.navigate(['/']);
        }
      });
  }
}
