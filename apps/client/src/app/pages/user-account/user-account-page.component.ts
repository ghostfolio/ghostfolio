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
import { diamondOutline, keyOutline, settingsOutline } from 'ionicons/icons';

@Component({
  host: { class: 'page has-tabs' },
  imports: [GfPageTabsComponent],
  selector: 'gf-user-account-page',
  styleUrls: ['./user-account-page.scss'],
  templateUrl: './user-account-page.html'
})
export class GfUserAccountPageComponent {
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
          this.user = state.user;

          this.tabs = [
            {
              iconName: 'settings-outline',
              label: internalRoutes.account.title,
              routerLink: internalRoutes.account.routerLink
            },
            {
              iconName: 'diamond-outline',
              label: internalRoutes.account.subRoutes.membership.title,
              routerLink:
                internalRoutes.account.subRoutes.membership.routerLink,
              showCondition: !!this.user?.subscription
            },
            {
              iconName: 'key-outline',
              label: internalRoutes.account.subRoutes.access.title,
              routerLink: internalRoutes.account.subRoutes.access.routerLink
            }
          ];

          this.changeDetectorRef.markForCheck();
        }
      });

    addIcons({ diamondOutline, keyOutline, settingsOutline });
  }
}
