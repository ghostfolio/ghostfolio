import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { publicRoutes } from '@ghostfolio/common/routes/routes';
import {
  GfPageTabsComponent,
  TabConfiguration
} from '@ghostfolio/ui/page-tabs';
import { DataService } from '@ghostfolio/ui/services';

import { Component } from '@angular/core';
import { addIcons } from 'ionicons';
import { cloudyOutline, readerOutline, serverOutline } from 'ionicons/icons';

@Component({
  host: { class: 'page has-tabs' },
  imports: [GfPageTabsComponent],
  selector: 'gf-faq-page',
  styleUrls: ['./faq-page.scss'],
  templateUrl: './faq-page.html'
})
export class GfFaqPageComponent {
  public hasPermissionForSubscription: boolean;
  public tabs: TabConfiguration[] = [];

  public constructor(private dataService: DataService) {
    const { globalPermissions } = this.dataService.fetchInfo();

    this.hasPermissionForSubscription = hasPermission(
      globalPermissions,
      permissions.enableSubscription
    );

    this.tabs = [
      {
        iconName: 'reader-outline',
        label: $localize`General`,
        routerLink: publicRoutes.faq.routerLink
      },
      {
        iconName: 'cloudy-outline',
        label: $localize`Cloud` + ' (SaaS)',
        routerLink: publicRoutes.faq.subRoutes.saas.routerLink,
        showCondition: this.hasPermissionForSubscription
      },
      {
        iconName: 'server-outline',
        label: $localize`Self-Hosting`,
        routerLink: publicRoutes.faq.subRoutes.selfHosting.routerLink
      }
    ];

    addIcons({ cloudyOutline, readerOutline, serverOutline });
  }
}
