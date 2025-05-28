import { TabConfiguration } from '@ghostfolio/common/interfaces';
import { paths } from '@ghostfolio/common/paths';

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
        path: ['/' + paths.adminControl]
      },
      {
        iconName: 'settings-outline',
        label: $localize`Settings`,
        path: ['/' + paths.adminControl, paths.settings]
      },
      {
        iconName: 'server-outline',
        label: $localize`Market Data`,
        path: ['/' + paths.adminControl, paths.marketData]
      },
      {
        iconName: 'flash-outline',
        label: $localize`Job Queue`,
        path: ['/' + paths.adminControl, paths.jobs]
      },
      {
        iconName: 'people-outline',
        label: $localize`Users`,
        path: ['/' + paths.adminControl, paths.users]
      }
    ];
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
