import { TabConfiguration } from '@ghostfolio/common/interfaces';
import { internalRoutes } from '@ghostfolio/common/routes/routes';

import { Component, OnDestroy, OnInit } from '@angular/core';
import { DeviceDetectorService } from 'ngx-device-detector';
import { Subject } from 'rxjs';

@Component({
  host: { class: 'page has-tabs' },
  selector: 'gf-admin-page',
  styleUrls: ['./admin-page.scss'],
  templateUrl: './admin-page.html',
  standalone: false
})
export class AdminPageComponent implements OnDestroy, OnInit {
  public deviceType: string;
  public tabs: TabConfiguration[] = [];

  private unsubscribeSubject = new Subject<void>();

  public constructor(private deviceService: DeviceDetectorService) {}

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

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
