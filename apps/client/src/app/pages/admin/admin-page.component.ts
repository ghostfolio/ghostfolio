import { TokenStorageService } from '@ghostfolio/client/services/token-storage.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import {
  BULL_BOARD_COOKIE_NAME,
  BULL_BOARD_ROUTE
} from '@ghostfolio/common/config';
import { User } from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { internalRoutes } from '@ghostfolio/common/routes/routes';
import {
  GfPageTabsComponent,
  TabConfiguration
} from '@ghostfolio/ui/page-tabs';

import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { addIcons } from 'ionicons';
import {
  flashOutline,
  peopleOutline,
  readerOutline,
  serverOutline,
  settingsOutline
} from 'ionicons/icons';

@Component({
  host: { class: 'page' },
  imports: [GfPageTabsComponent],
  selector: 'gf-admin-page',
  styleUrls: ['./admin-page.scss'],
  templateUrl: './admin-page.html'
})
export class AdminPageComponent {
  public tabs: TabConfiguration[] = [];

  private user: User;

  private readonly tokenStorageService = inject(TokenStorageService);
  private readonly userService = inject(UserService);

  public constructor() {
    this.userService.stateChanged
      .pipe(takeUntilDestroyed())
      .subscribe((state) => {
        this.user = state?.user;

        this.initializeTabs();
      });

    addIcons({
      flashOutline,
      peopleOutline,
      readerOutline,
      serverOutline,
      settingsOutline
    });
  }

  private initializeTabs() {
    const hasPermissionToAccessBullBoard = hasPermission(
      this.user?.permissions,
      permissions.accessAdminControlBullBoard
    );

    this.tabs = [
      {
        iconName: 'reader-outline',
        label: $localize`Overview`,
        routerLink: internalRoutes.adminControl.routerLink
      },
      {
        iconName: 'settings-outline',
        label: internalRoutes.adminControl.subRoutes.settings.title,
        routerLink: internalRoutes.adminControl.subRoutes.settings.routerLink
      },
      {
        iconName: 'server-outline',
        label: internalRoutes.adminControl.subRoutes.marketData.title,
        routerLink: internalRoutes.adminControl.subRoutes.marketData.routerLink
      },
      hasPermissionToAccessBullBoard
        ? {
            iconName: 'flash-outline',
            label: $localize`Job Queue`,
            onClick: () => {
              this.onOpenBullBoard();
            }
          }
        : {
            iconName: 'flash-outline',
            label: internalRoutes.adminControl.subRoutes.jobs.title,
            routerLink: internalRoutes.adminControl.subRoutes.jobs.routerLink
          },
      {
        iconName: 'people-outline',
        label: internalRoutes.adminControl.subRoutes.users.title,
        routerLink: internalRoutes.adminControl.subRoutes.users.routerLink
      }
    ];
  }

  private onOpenBullBoard() {
    const token = this.tokenStorageService.getToken();

    document.cookie = [
      `${BULL_BOARD_COOKIE_NAME}=${encodeURIComponent(token)}`,
      'path=/',
      'SameSite=Strict'
    ].join('; ');

    window.open(BULL_BOARD_ROUTE, '_blank');
  }
}
