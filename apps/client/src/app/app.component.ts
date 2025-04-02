import { GfHoldingDetailDialogComponent } from '@ghostfolio/client/components/holding-detail-dialog/holding-detail-dialog.component';
import { HoldingDetailDialogParams } from '@ghostfolio/client/components/holding-detail-dialog/interfaces/interfaces';
import { getCssVariable } from '@ghostfolio/common/helper';
import { InfoItem, User } from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
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
  public routerLinkAbout = ['/' + $localize`:snake-case:about`];
  public routerLinkAboutChangelog = [
    '/' + $localize`:snake-case:about`,
    'changelog'
  ];
  public routerLinkAboutLicense = [
    '/' + $localize`:snake-case:about`,
    $localize`:snake-case:license`
  ];
  public routerLinkAboutPrivacyPolicy = [
    '/' + $localize`:snake-case:about`,
    $localize`:snake-case:privacy-policy`
  ];
  public routerLinkAboutTermsOfService = [
    '/' + $localize`:snake-case:about`,
    $localize`:snake-case:terms-of-service`
  ];
  public routerLinkFaq = ['/' + $localize`:snake-case:faq`];
  public routerLinkFeatures = ['/' + $localize`:snake-case:features`];
  public routerLinkMarkets = ['/' + $localize`:snake-case:markets`];
  public routerLinkPricing = ['/' + $localize`:snake-case:pricing`];
  public routerLinkRegister = ['/' + $localize`:snake-case:register`];
  public routerLinkResources = ['/' + $localize`:snake-case:resources`];
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
      !!this.info?.subscriptionOffers?.default?.coupon ||
      !!this.info?.subscriptionOffers?.default?.durationExtension;

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
          (this.currentRoute === 'home' && !this.currentSubRoute) ||
          (this.currentRoute === 'home' &&
            this.currentSubRoute === 'holdings') ||
          (this.currentRoute === 'portfolio' && !this.currentSubRoute) ||
          (this.currentRoute === 'zen' && !this.currentSubRoute) ||
          (this.currentRoute === 'zen' && this.currentSubRoute === 'holdings')
        ) {
          this.hasPermissionToChangeDateRange = true;
        } else {
          this.hasPermissionToChangeDateRange = false;
        }

        if (
          (this.currentRoute === 'home' &&
            this.currentSubRoute === 'holdings') ||
          (this.currentRoute === 'portfolio' && !this.currentSubRoute) ||
          (this.currentRoute === 'portfolio' &&
            this.currentSubRoute === 'activities') ||
          (this.currentRoute === 'portfolio' &&
            this.currentSubRoute === 'allocations') ||
          (this.currentRoute === 'zen' && this.currentSubRoute === 'holdings')
        ) {
          this.hasPermissionToChangeFilters = true;
        } else {
          this.hasPermissionToChangeFilters = false;
        }

        this.hasTabs =
          (this.currentRoute === this.routerLinkAbout[0].slice(1) ||
            this.currentRoute === this.routerLinkFaq[0].slice(1) ||
            this.currentRoute === this.routerLinkResources[0].slice(1) ||
            this.currentRoute === 'account' ||
            this.currentRoute === 'admin' ||
            this.currentRoute === 'home' ||
            this.currentRoute === 'portfolio' ||
            this.currentRoute === 'zen') &&
          this.deviceType !== 'mobile';

        this.showFooter =
          (this.currentRoute === 'blog' ||
            this.currentRoute === this.routerLinkFeatures[0].slice(1) ||
            this.currentRoute === this.routerLinkMarkets[0].slice(1) ||
            this.currentRoute === 'open' ||
            this.currentRoute === 'p' ||
            this.currentRoute === this.routerLinkPricing[0].slice(1) ||
            this.currentRoute === this.routerLinkRegister[0].slice(1) ||
            this.currentRoute === 'start') &&
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
          !!this.info?.subscriptionOffers?.[
            this.user?.subscription?.offer ?? 'default'
          ]?.coupon ||
          !!this.info?.subscriptionOffers?.[
            this.user?.subscription?.offer ?? 'default'
          ]?.durationExtension;

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
