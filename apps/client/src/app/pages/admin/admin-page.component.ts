import { internalRoutes } from '@ghostfolio/common/routes/routes';
import {
  GfPageTabsComponent,
  TabConfiguration
} from '@ghostfolio/ui/page-tabs';

import { Component, OnInit } from '@angular/core';
import { addIcons } from 'ionicons';
import {
  flashOutline,
  peopleOutline,
  readerOutline,
  serverOutline,
  settingsOutline
} from 'ionicons/icons';

@Component({
  host: { class: 'page has-tabs' },
  imports: [GfPageTabsComponent],
  selector: 'gf-admin-page',
  styleUrls: ['./admin-page.scss'],
  templateUrl: './admin-page.html'
})
export class AdminPageComponent implements OnInit {
  public tabs: TabConfiguration[] = [];

  public constructor() {
    addIcons({
      flashOutline,
      peopleOutline,
      readerOutline,
      serverOutline,
      settingsOutline
    });
  }

  public ngOnInit() {
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
      {
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
}
