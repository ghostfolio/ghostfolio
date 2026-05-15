import { UserService } from '@ghostfolio/client/services/user/user.service';
import { User } from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { publicRoutes } from '@ghostfolio/common/routes/routes';
import {
  GfPageTabsComponent,
  TabConfiguration
} from '@ghostfolio/ui/page-tabs';
import { DataService } from '@ghostfolio/ui/services';

import { ChangeDetectorRef, Component, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { addIcons } from 'ionicons';
import {
  documentTextOutline,
  happyOutline,
  informationCircleOutline,
  ribbonOutline,
  shieldCheckmarkOutline,
  sparklesOutline
} from 'ionicons/icons';

@Component({
  host: { class: 'page has-tabs' },
  imports: [GfPageTabsComponent],
  selector: 'gf-about-page',
  styleUrls: ['./about-page.scss'],
  templateUrl: './about-page.html'
})
export class AboutPageComponent {
  public hasPermissionForSubscription: boolean;
  public tabs: TabConfiguration[] = [];
  public user: User;

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService,
    private destroyRef: DestroyRef,
    private userService: UserService
  ) {
    const { globalPermissions } = this.dataService.fetchInfo();

    this.hasPermissionForSubscription = hasPermission(
      globalPermissions,
      permissions.enableSubscription
    );

    this.userService.stateChanged
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((state) => {
        this.tabs = [
          {
            iconName: 'information-circle-outline',
            label: publicRoutes.about.title,
            routerLink: publicRoutes.about.routerLink
          },
          {
            iconName: 'sparkles-outline',
            label: publicRoutes.about.subRoutes.changelog.title,
            routerLink: publicRoutes.about.subRoutes.changelog.routerLink
          },
          {
            iconName: 'ribbon-outline',
            label: publicRoutes.about.subRoutes.license.title,
            routerLink: publicRoutes.about.subRoutes.license.routerLink,
            showCondition: !this.hasPermissionForSubscription
          }
        ];

        if (state?.user) {
          this.tabs.push({
            iconName: 'shield-checkmark-outline',
            label: publicRoutes.about.subRoutes.privacyPolicy.title,
            routerLink: publicRoutes.about.subRoutes.privacyPolicy.routerLink,
            showCondition: this.hasPermissionForSubscription
          });

          this.tabs.push({
            iconName: 'document-text-outline',
            label: publicRoutes.about.subRoutes.termsOfService.title,
            routerLink: publicRoutes.about.subRoutes.termsOfService.routerLink,
            showCondition: this.hasPermissionForSubscription
          });

          this.user = state.user;

          this.changeDetectorRef.markForCheck();
        }

        this.tabs.push({
          iconName: 'happy-outline',
          label: publicRoutes.about.subRoutes.ossFriends.title,
          routerLink: publicRoutes.about.subRoutes.ossFriends.routerLink
        });
      });

    addIcons({
      documentTextOutline,
      happyOutline,
      informationCircleOutline,
      ribbonOutline,
      shieldCheckmarkOutline,
      sparklesOutline
    });
  }
}
