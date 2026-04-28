import { UserService } from '@ghostfolio/client/services/user/user.service';
import { User } from '@ghostfolio/common/interfaces';
import { internalRoutes } from '@ghostfolio/common/routes/routes';
import {
  GfPageTabsComponent,
  TabConfiguration
} from '@ghostfolio/ui/page-tabs';

import { ChangeDetectorRef, Component, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { addIcons } from 'ionicons';
import { albumsOutline, analyticsOutline } from 'ionicons/icons';

@Component({
  host: { class: 'page has-tabs' },
  imports: [GfPageTabsComponent],
  selector: 'gf-zen-page',
  styleUrls: ['./zen-page.scss'],
  templateUrl: './zen-page.html'
})
export class GfZenPageComponent {
  public tabs: TabConfiguration[] = [];
  public user: User;

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private destroyRef: DestroyRef,
    private userService: UserService
  ) {
    this.userService.stateChanged
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((state) => {
        if (state?.user) {
          this.tabs = [
            {
              iconName: 'analytics-outline',
              label: internalRoutes.zen.title,
              routerLink: internalRoutes.zen.routerLink
            },
            {
              iconName: 'albums-outline',
              label: internalRoutes.zen.subRoutes.holdings.title,
              routerLink: internalRoutes.zen.subRoutes.holdings.routerLink
            }
          ];
          this.user = state.user;

          this.changeDetectorRef.markForCheck();
        }
      });

    addIcons({ albumsOutline, analyticsOutline });
  }
}
