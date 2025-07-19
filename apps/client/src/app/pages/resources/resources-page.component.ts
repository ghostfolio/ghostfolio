import { TabConfiguration } from '@ghostfolio/common/interfaces';
import { publicRoutes } from '@ghostfolio/common/routes/routes';

import { Component, OnInit } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { RouterModule } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  bookOutline,
  libraryOutline,
  newspaperOutline,
  readerOutline
} from 'ionicons/icons';
import { DeviceDetectorService } from 'ngx-device-detector';
import { Subject } from 'rxjs';

@Component({
  host: { class: 'page has-tabs' },
  imports: [IonIcon, MatTabsModule, RouterModule],
  selector: 'gf-resources-page',
  styleUrls: ['./resources-page.scss'],
  templateUrl: './resources-page.html'
})
export class ResourcesPageComponent implements OnInit {
  public deviceType: string;
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

  private unsubscribeSubject = new Subject<void>();

  public constructor(private deviceService: DeviceDetectorService) {
    addIcons({ bookOutline, libraryOutline, newspaperOutline, readerOutline });
  }

  public ngOnInit() {
    this.deviceType = this.deviceService.getDeviceInfo().deviceType;
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
