import { TabConfiguration } from '@ghostfolio/common/interfaces';
import { internalRoutes } from '@ghostfolio/common/routes/routes';

import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { RouterModule } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  flashOutline,
  peopleOutline,
  readerOutline,
  serverOutline,
  settingsOutline
} from 'ionicons/icons';
import { DeviceDetectorService } from 'ngx-device-detector';
import { Subject } from 'rxjs';

@Component({
  host: { class: 'page has-tabs' },
  imports: [IonIcon, MatTabsModule, RouterModule],
  selector: 'gf-admin-page',
  styleUrls: ['./admin-page.scss'],
  templateUrl: './admin-page.html'
})
export class AdminPageComponent implements OnDestroy, OnInit {
  public deviceType: string;
  public tabs: TabConfiguration[] = [];

  private unsubscribeSubject = new Subject<void>();

  public constructor(private deviceService: DeviceDetectorService) {
    addIcons({
      flashOutline,
      peopleOutline,
      readerOutline,
      serverOutline,
      settingsOutline
    });
  }

  public ngOnInit() {
    this.deviceType = this.deviceService.getDeviceInfo().deviceType;

    this.tabs = [
      {
        iconName: 'reader-outline',
        label: $localize`Overview`,
        routerLink: internalRoutes.adminControl.routerLink
      },
      {
        iconName: 'settings-outline',
        label:
          internalRoutes.adminControl.subRoutes.settings.title +
          '<span class="badge badge-pill badge-secondary ml-2 text-uppercase">' +
          $localize`new` +
          '</span>',
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

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
