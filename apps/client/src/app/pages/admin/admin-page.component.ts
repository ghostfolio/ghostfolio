import { paths } from '@ghostfolio/client/core/paths';
import { TabConfiguration } from '@ghostfolio/common/interfaces';

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
        path: ['/' + paths.admin]
      },
      {
        iconName: 'settings-outline',
        label: $localize`Settings`,
        path: ['/' + paths.admin, paths.settings]
      },
      {
        iconName: 'server-outline',
        label: $localize`Market Data`,
        path: ['/' + paths.admin, paths.marketData]
      },
      {
        iconName: 'flash-outline',
        label: $localize`Job Queue`,
        path: ['/' + paths.admin, paths.jobs]
      },
      {
        iconName: 'people-outline',
        label: $localize`Users`,
        path: ['/' + paths.admin, paths.users]
      }
    ];
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
