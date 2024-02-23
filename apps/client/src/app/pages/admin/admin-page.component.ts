import { TabConfiguration } from '@ghostfolio/common/interfaces';

import { Component, OnDestroy, OnInit } from '@angular/core';
import { DeviceDetectorService } from 'ngx-device-detector';
import { Subject } from 'rxjs';

@Component({
  host: { class: 'page has-tabs' },
  selector: 'gf-admin-page',
  styleUrls: ['./admin-page.scss'],
  templateUrl: './admin-page.html'
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
        path: ['/admin']
      },
      {
        iconName: 'settings-outline',
        label: $localize`Settings`,
        path: ['/admin', 'settings']
      },
      {
        iconName: 'server-outline',
        label: $localize`Market Data`,
        path: ['/admin', 'market-data']
      },
      {
        iconName: 'flash-outline',
        label: $localize`Job Queue`,
        path: ['/admin', 'jobs']
      },
      {
        iconName: 'people-outline',
        label: $localize`Users`,
        path: ['/admin', 'users']
      }
    ];
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
