import { ImpersonationStorageService } from '@ghostfolio/client/services/impersonation-storage.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { TabConfiguration, User } from '@ghostfolio/common/interfaces';
import { internalRoutes, routes } from '@ghostfolio/common/routes/routes';

import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { DeviceDetectorService } from 'ngx-device-detector';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  host: { class: 'page has-tabs' },
  selector: 'gf-home-page',
  styleUrls: ['./home-page.scss'],
  templateUrl: './home-page.html',
  standalone: false
})
export class HomePageComponent implements OnDestroy, OnInit {
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
          this.tabs = [
            {
              iconName: 'analytics-outline',
              label: internalRoutes.home.title,
              path: internalRoutes.home.routerLink
            },
            {
              iconName: 'wallet-outline',
              label: internalRoutes.home.subRoutes.holdings.title,
              path: internalRoutes.home.subRoutes.holdings.routerLink
            },
            {
              iconName: 'reader-outline',
              label: internalRoutes.home.subRoutes.summary.title,
              path: internalRoutes.home.subRoutes.summary.routerLink
            },
            {
              iconName: 'bookmark-outline',
              label: internalRoutes.home.subRoutes.watchlist.title,
              path: internalRoutes.home.subRoutes.watchlist.routerLink
            },
            {
              iconName: 'newspaper-outline',
              label: $localize`Markets`,
              path: ['/' + internalRoutes.home.path, routes.market]
            }
          ];

          this.user = state.user;

          this.changeDetectorRef.markForCheck();
        }
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
