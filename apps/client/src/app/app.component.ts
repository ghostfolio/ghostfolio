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
import { Title } from '@angular/platform-browser';
import { NavigationEnd, PRIMARY_OUTLET, Router } from '@angular/router';
import { DeviceDetectorService } from 'ngx-device-detector';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';

import { DataService } from './services/data.service';
import { TokenStorageService } from './services/token-storage.service';
import { UserService } from './services/user/user.service';

@Component({
  selector: 'gf-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnDestroy, OnInit {
  @HostBinding('class.has-info-message') get getHasMessage() {
    return this.hasInfoMessage;
  }

  public canCreateAccount: boolean;
  public currentRoute: string;
  public currentYear = new Date().getFullYear();
  public deviceType: string;
  public hasInfoMessage: boolean;
  public hasPermissionForStatistics: boolean;
  public hasPermissionForSubscription: boolean;
  public hasPermissionToAccessFearAndGreedIndex: boolean;
  public hasTabs = false;
  public info: InfoItem;
  public pageTitle: string;
  public routerLinkAbout = ['/' + $localize`about`];
  public routerLinkAboutChangelog = ['/' + $localize`about`, 'changelog'];
  public routerLinkAboutLicense = ['/' + $localize`about`, $localize`license`];
  public routerLinkAboutPrivacyPolicy = [
    '/' + $localize`about`,
    $localize`privacy-policy`
  ];
  public routerLinkFaq = ['/' + $localize`faq`];
  public routerLinkFeatures = ['/' + $localize`features`];
  public routerLinkMarkets = ['/' + $localize`markets`];
  public routerLinkPricing = ['/' + $localize`pricing`];
  public routerLinkRegister = ['/' + $localize`register`];
  public routerLinkResources = ['/' + $localize`resources`];
  public showFooter = false;
  public user: User;

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService,
    private deviceService: DeviceDetectorService,
    @Inject(DOCUMENT) private document: Document,
    private router: Router,
    private title: Title,
    private tokenStorageService: TokenStorageService,
    private userService: UserService
  ) {
    this.initializeTheme();
    this.user = undefined;
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

    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        const urlTree = this.router.parseUrl(this.router.url);
        const urlSegmentGroup = urlTree.root.children[PRIMARY_OUTLET];
        const urlSegments = urlSegmentGroup.segments;
        this.currentRoute = urlSegments[0].path;

        this.hasTabs =
          (this.currentRoute === this.routerLinkAbout[0].slice(1) ||
            this.currentRoute === this.routerLinkFaq[0].slice(1) ||
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
            this.currentRoute === this.routerLinkResources[0].slice(1) ||
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

        this.initializeTheme(this.user?.settings.colorScheme);

        this.changeDetectorRef.markForCheck();
      });
  }

  public onClickSystemMessage() {
    if (this.user.systemMessage.routerLink) {
      this.router.navigate(this.user.systemMessage.routerLink);
    } else {
      alert(this.user.systemMessage.message);
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

  private toggleTheme(isDarkTheme: boolean) {
    const themeColor = getCssVariable(
      isDarkTheme ? '--dark-background' : '--light-background'
    );

    if (isDarkTheme) {
      this.document.body.classList.add('is-dark-theme');
    } else {
      this.document.body.classList.remove('is-dark-theme');
    }

    this.document
      .querySelector('meta[name="theme-color"]')
      .setAttribute('content', themeColor);
  }
}
