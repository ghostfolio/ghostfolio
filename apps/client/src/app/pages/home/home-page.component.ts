import { ImpersonationStorageService } from '@ghostfolio/client/services/impersonation-storage.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { TabConfiguration, User } from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { internalRoutes } from '@ghostfolio/common/routes/routes';
import { GfPageTabsComponent } from '@ghostfolio/ui/page-tabs';

import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnInit
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { addIcons } from 'ionicons';
import {
  albumsOutline,
  analyticsOutline,
  bookmarkOutline,
  newspaperOutline,
  readerOutline
} from 'ionicons/icons';

@Component({
  host: { class: 'page has-tabs' },
  imports: [GfPageTabsComponent],
  selector: 'gf-home-page',
  styleUrls: ['./home-page.scss'],
  templateUrl: './home-page.html'
})
export class GfHomePageComponent implements OnInit {
  public hasImpersonationId: boolean;
  public tabs: TabConfiguration[] = [];
  public user: User;

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private destroyRef: DestroyRef,
    private impersonationStorageService: ImpersonationStorageService,
    private userService: UserService
  ) {
    this.userService.stateChanged
      .pipe(takeUntilDestroyed(this.destroyRef))
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
              iconName: 'albums-outline',
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
      albumsOutline,
      analyticsOutline,
      bookmarkOutline,
      newspaperOutline,
      readerOutline
    });
  }

  public ngOnInit() {
    this.impersonationStorageService
      .onChangeHasImpersonation()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((impersonationId) => {
        this.hasImpersonationId = !!impersonationId;
      });
  }
}
