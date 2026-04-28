import { TabConfiguration } from '@ghostfolio/common/interfaces';
import { publicRoutes } from '@ghostfolio/common/routes/routes';
import { GfPageTabsComponent } from '@ghostfolio/ui/page-tabs';

import { Component } from '@angular/core';
import { addIcons } from 'ionicons';
import {
  bookOutline,
  libraryOutline,
  newspaperOutline,
  readerOutline
} from 'ionicons/icons';

@Component({
  host: { class: 'page has-tabs' },
  imports: [GfPageTabsComponent],
  selector: 'gf-resources-page',
  styleUrls: ['./resources-page.scss'],
  templateUrl: './resources-page.html'
})
export class ResourcesPageComponent {
  public tabs: TabConfiguration[] = [
    {
      iconName: 'reader-outline',
      label: $localize`Overview`,
      routerLink: publicRoutes.resources.routerLink
    },
    {
      label: $localize`Guides`,
      iconName: 'book-outline',
      routerLink: publicRoutes.resources.subRoutes.guides.routerLink
    },
    {
      iconName: 'newspaper-outline',
      label: $localize`Markets`,
      routerLink: publicRoutes.resources.subRoutes.markets.routerLink
    },
    {
      iconName: 'library-outline',
      label: $localize`Glossary`,
      routerLink: publicRoutes.resources.subRoutes.glossary.routerLink
    }
  ];

  public constructor() {
    addIcons({ bookOutline, libraryOutline, newspaperOutline, readerOutline });
  }
}
