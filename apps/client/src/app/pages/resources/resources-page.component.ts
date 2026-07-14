import { publicRoutes } from '@ghostfolio/common/routes/routes';
import {
  GfPageTabsComponent,
  TabConfiguration
} from '@ghostfolio/ui/page-tabs';

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { addIcons } from 'ionicons';
import {
  bookOutline,
  libraryOutline,
  newspaperOutline,
  readerOutline
} from 'ionicons/icons';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'page' },
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
