import { GfHoldingDetailDialogComponent } from '@ghostfolio/client/components/holding-detail-dialog/holding-detail-dialog.component';
import { HoldingDetailDialogParams } from '@ghostfolio/client/components/holding-detail-dialog/interfaces/interfaces';
import { getCssVariable } from '@ghostfolio/common/helper';
import { InfoItem, User } from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import {
  internalRoutes,
  publicRoutes,
  routes
} from '@ghostfolio/common/routes/routes';
import { ColorScheme } from '@ghostfolio/common/types';

import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  HostBinding,
  Inject,
  OnDestroy,
  OnInit
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Title } from '@angular/platform-browser';
import {
  ActivatedRoute,
  NavigationEnd,
  PRIMARY_OUTLET,
  Router
} from '@angular/router';
import { DataSource } from '@prisma/client';
import { DeviceDetectorService } from 'ngx-device-detector';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';

import { NotificationService } from './core/notification/notification.service';
import { DataService } from './services/data.service';
import { ImpersonationStorageService } from './services/impersonation-storage.service';
import { TokenStorageService } from './services/token-storage.service';
import { UserService } from './services/user/user.service';

@Component({
  selector: 'gf-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: false
})
export class AppComponent implements OnDestroy, OnInit {
  @HostBinding('class.has-info-message') get getHasMessage() {
    return this.hasInfoMessage;
  }

  public canCreateAccount: boolean;
  public currentRoute: string;
  public currentSubRoute: string;
  public currentYear = new Date().getFullYear();
  public deviceType: string;
  public hasImpersonationId: boolean;
  public hasInfoMessage: boolean;
  public hasPermissionForStatistics: boolean;
  public hasPermissionForSubscription: boolean;
  public hasPermissionToAccessFearAndGreedIndex: boolean;
  public hasPermissionToChangeDateRange: boolean;
  public hasPermissionToChangeFilters: boolean;
  public hasPromotion = false;
  public hasTabs = false;
  public info: InfoItem;
  public pageTitle: string;
  public routerLinkAbout = ['/' + routes.about];
  public routerLinkAboutChangelog = ['/' + routes.about, routes.changelog];
  public routerLinkAboutLicense = ['/' + routes.about, routes.license];
  public routerLinkAboutPrivacyPolicy = [
    '/' + routes.about,
    routes.privacyPolicy
  ];
  public routerLinkAboutTermsOfService = [
    '/' + routes.about,
    routes.termsOfService
  ];
  public routerLinkBlog = ['/' + routes.blog];
  public routerLinkFaq = ['/' + routes.faq];
  public routerLinkFeatures = publicRoutes.features.routerLink;
  public routerLinkMarkets = ['/' + routes.markets];
  public routerLinkOpenStartup = publicRoutes.openStartup.routerLink;
  public routerLinkPricing = ['/' + routes.pricing];
  public routerLinkRegister = publicRoutes.register.routerLink;
  public routerLinkResources = ['/' + routes.resources];
  public showFooter = false;
  public user: User;

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService,
    private deviceService: DeviceDetectorService,
    private dialog: MatDialog,
    @Inject(DOCUMENT) private document: Document,
    private impersonationStorageService: ImpersonationStorageService,
    private notificationService: NotificationService,
    private route: ActivatedRoute,
    private router: Router,
    private title: Title,
    private tokenStorageService: TokenStorageService,
    private userService: UserService
  ) {
    this.initializeTheme();
    this.user = undefined;

    this.route.queryParams
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((params) => {
        if (
          params['dataSource'] &&
          params['holdingDetailDialog'] &&
          params['symbol']
        ) {
          this.openHoldingDetailDialog({
            dataSource: params['dataSource'],
            symbol: params['symbol']
          });
        }
      });
  }

  public ngOnInit() {
    this.deviceType = this.deviceService.getDeviceInfo().deviceType;
    this.info = this.dataService.fetchInfo();

    this.hasPermissionForSubscription = hasPermission(
      this.info?.globalPermissions,
      permissions.enableSubscription
    );

    this.hasPermissionForStatistics = hasPermission(
      this.info?.globalPermissions,
      permissions.enableStatistics
    );

    this.hasPermissionToAccessFearAndGreedIndex = hasPermission(
      this.info?.globalPermissions,
      permissions.enableFearAndGreedIndex
    );

    this.hasPromotion =
      !!this.info?.subscriptionOffer?.coupon ||
      !!this.info?.subscriptionOffer?.durationExtension;

    this.impersonationStorageService
      .onChangeHasImpersonation()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((impersonationId) => {
        this.hasImpersonationId = !!impersonationId;
      });

    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        const urlTree = this.router.parseUrl(this.router.url);
        const urlSegmentGroup = urlTree.root.children[PRIMARY_OUTLET];
        const urlSegments = urlSegmentGroup.segments;
        this.currentRoute = urlSegments[0].path;
        this.currentSubRoute = urlSegments[1]?.path;

        if (
          ((this.currentRoute === internalRoutes.home.path &&
            !this.currentSubRoute) ||
            (this.currentRoute === internalRoutes.home.path &&
              this.currentSubRoute ===
                internalRoutes.home.subRoutes.holdings.path) ||
            (this.currentRoute === internalRoutes.portfolio.path &&
              !this.currentSubRoute)) &&
          this.user?.settings?.viewMode !== 'ZEN'
        ) {
          this.hasPermissionToChangeDateRange = true;
        } else {
          this.hasPermissionToChangeDateRange = false;
        }

        if (
          (this.currentRoute === internalRoutes.home.path &&
            this.currentSubRoute ===
              internalRoutes.home.subRoutes.holdings.path) ||
          (this.currentRoute === internalRoutes.portfolio.path &&
            !this.currentSubRoute) ||
          (this.currentRoute === internalRoutes.portfolio.path &&
            this.currentSubRoute ===
              internalRoutes.portfolio.subRoutes.activities.path) ||
          (this.currentRoute === internalRoutes.portfolio.path &&
            this.currentSubRoute ===
              internalRoutes.portfolio.subRoutes.allocations.path) ||
          (this.currentRoute === internalRoutes.zen.path &&
            this.currentSubRoute ===
              internalRoutes.home.subRoutes.holdings.path)
        ) {
          this.hasPermissionToChangeFilters = true;
        } else {
          this.hasPermissionToChangeFilters = false;
        }

        this.hasTabs =
          (this.currentRoute === routes.about ||
            this.currentRoute === routes.faq ||
            this.currentRoute === routes.resources ||
            this.currentRoute === internalRoutes.account.path ||
            this.currentRoute === routes.adminControl ||
            this.currentRoute === internalRoutes.home.path ||
            this.currentRoute === internalRoutes.portfolio.path ||
            this.currentRoute === internalRoutes.zen.path) &&
          this.deviceType !== 'mobile';

        this.showFooter =
          (this.currentRoute === routes.blog ||
            this.currentRoute === publicRoutes.features.path ||
            this.currentRoute === routes.markets ||
            this.currentRoute === publicRoutes.openStartup.path ||
            this.currentRoute === routes.public ||
            this.currentRoute === routes.pricing ||
            this.currentRoute === publicRoutes.register.path ||
            this.currentRoute === routes.start) &&
          this.deviceType !== 'mobile';

        if (this.deviceType === 'mobile') {
          setTimeout(() => {
            const index = this.title.getTitle().indexOf('–');
            const title =
              index === -1
                ? ''
                : this.title.getTitle().substring(0, index).trim();
            this.pageTitle = title.length <= 15 ? title : 'Ghostfolio';

            this.changeDetectorRef.markForCheck();
          });
        }

        this.changeDetectorRef.markForCheck();
      });

    this.userService.stateChanged
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((state) => {
        this.user = state.user;

        this.canCreateAccount = hasPermission(
          this.user?.permissions,
          permissions.createUserAccount
        );

        this.hasInfoMessage =
          this.canCreateAccount || !!this.user?.systemMessage;

        this.hasPromotion =
          !!this.user?.subscription?.offer?.coupon ||
          !!this.user?.subscription?.offer?.durationExtension;

        this.initializeTheme(this.user?.settings.colorScheme);

        this.changeDetectorRef.markForCheck();
      });
  }

  public onClickSystemMessage() {
    if (this.user.systemMessage.routerLink) {
      this.router.navigate(this.user.systemMessage.routerLink);
    } else {
      this.notificationService.alert({
        title: this.user.systemMessage.message
      });
    }
  }

  public onCreateAccount() {
    this.tokenStorageService.signOut();
  }

  public onSignOut() {
    this.tokenStorageService.signOut();
    this.userService.remove();

    document.location.href = `/${document.documentElement.lang}`;
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }

  private initializeTheme(userPreferredColorScheme?: ColorScheme) {
    const isDarkTheme = userPreferredColorScheme
      ? userPreferredColorScheme === 'DARK'
      : window.matchMedia('(prefers-color-scheme: dark)').matches;

    this.toggleTheme(isDarkTheme);

    window.matchMedia('(prefers-color-scheme: dark)').addListener((event) => {
      if (!this.user?.settings.colorScheme) {
        this.toggleTheme(event.matches);
      }
    });
  }

  private openHoldingDetailDialog({
    dataSource,
    symbol
  }: {
    dataSource: DataSource;
    symbol: string;
  }) {
    this.userService
      .get()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((user) => {
        this.user = user;

        const dialogRef = this.dialog.open(GfHoldingDetailDialogComponent, {
          autoFocus: false,
          data: {
            dataSource,
            symbol,
            baseCurrency: this.user?.settings?.baseCurrency,
            colorScheme: this.user?.settings?.colorScheme,
            deviceType: this.deviceType,
            hasImpersonationId: this.hasImpersonationId,
            hasPermissionToCreateOrder:
              !this.hasImpersonationId &&
              hasPermission(this.user?.permissions, permissions.createOrder) &&
              !this.user?.settings?.isRestrictedView,
            hasPermissionToReportDataGlitch: hasPermission(
              this.user?.permissions,
              permissions.reportDataGlitch
            ),
            hasPermissionToUpdateOrder:
              !this.hasImpersonationId &&
              hasPermission(this.user?.permissions, permissions.updateOrder) &&
              !this.user?.settings?.isRestrictedView,
            locale: this.user?.settings?.locale
          } as HoldingDetailDialogParams,
          height: this.deviceType === 'mobile' ? '98vh' : '80vh',
          width: this.deviceType === 'mobile' ? '100vw' : '50rem'
        });

        dialogRef
          .afterClosed()
          .pipe(takeUntil(this.unsubscribeSubject))
          .subscribe(() => {
            this.router.navigate([], {
              queryParams: {
                dataSource: null,
                holdingDetailDialog: null,
                symbol: null
              },
              queryParamsHandling: 'merge',
              relativeTo: this.route
            });
          });
      });
  }

  private toggleTheme(isDarkTheme: boolean) {
    const themeColor = getCssVariable(
      isDarkTheme ? '--dark-background' : '--light-background'
    );

    if (isDarkTheme) {
      this.document.body.classList.add('theme-dark');
    } else {
      this.document.body.classList.remove('theme-dark');
    }

    this.document
      .querySelector('meta[name="theme-color"]')
      .setAttribute('content', themeColor);
  }
}
