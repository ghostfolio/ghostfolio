import { ImpersonationStorageService } from '@ghostfolio/client/services/impersonation-storage.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { TabConfiguration, User } from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { internalRoutes } from '@ghostfolio/common/routes/routes';

import {
  ChangeDetectorRef,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  OnDestroy,
  OnInit
} from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { RouterModule } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  analyticsOutline,
  bookmarkOutline,
  newspaperOutline,
  readerOutline,
  walletOutline
} from 'ionicons/icons';
import { DeviceDetectorService } from 'ngx-device-detector';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  host: { class: 'page has-tabs' },
  imports: [IonIcon, MatTabsModule, RouterModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'gf-home-page',
  styleUrls: ['./home-page.scss'],
  templateUrl: './home-page.html'
})
export class GfHomePageComponent implements OnDestroy, OnInit {
  public deviceType: string;
  public hasImpersonationId: boolean;
  public tabs: TabConfiguration[] = [];
  public user: User;

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private deviceService: DeviceDetectorService,
    private impersonationStorageService: ImpersonationStorageService,
    private userService: UserService
  ) {
    this.userService.stateChanged
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((state) => {
        if (state?.user) {
          this.user = state.user;

          this.tabs = [
            {
              iconName: 'analytics-outline',
              label: internalRoutes.home.title,
              routerLink: internalRoutes.home.routerLink
            },
            {
              iconName: 'wallet-outline',
              label: internalRoutes.home.subRoutes.holdings.title,
              routerLink: internalRoutes.home.subRoutes.holdings.routerLink
            },
            {
              iconName: 'reader-outline',
              label: internalRoutes.home.subRoutes.summary.title,
              routerLink: internalRoutes.home.subRoutes.summary.routerLink
            },
            {
              iconName: 'bookmark-outline',
              label: internalRoutes.home.subRoutes.watchlist.title,
              routerLink: internalRoutes.home.subRoutes.watchlist.routerLink
            },
            {
              iconName: 'newspaper-outline',
              label: hasPermission(
                this.user?.permissions,
                permissions.readMarketDataOfMarkets
              )
                ? internalRoutes.home.subRoutes.marketsPremium.title
                : internalRoutes.home.subRoutes.markets.title,
              routerLink: hasPermission(
                this.user?.permissions,
                permissions.readMarketDataOfMarkets
              )
                ? internalRoutes.home.subRoutes.marketsPremium.routerLink
                : internalRoutes.home.subRoutes.markets.routerLink
            }
          ];

          this.changeDetectorRef.markForCheck();
        }
      });

    addIcons({
      analyticsOutline,
      bookmarkOutline,
      newspaperOutline,
      readerOutline,
      walletOutline
    });
  }

  public ngOnInit() {
    this.deviceType = this.deviceService.getDeviceInfo().deviceType;

    this.impersonationStorageService
      .onChangeHasImpersonation()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((impersonationId) => {
        this.hasImpersonationId = !!impersonationId;
      });
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
