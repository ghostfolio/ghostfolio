import { Component, HostBinding, OnDestroy, OnInit } from '@angular/core';
import { DataService } from '@ghostfolio/client/services/data.service';
import { TabConfiguration } from '@ghostfolio/common/interfaces';
import { DeviceDetectorService } from 'ngx-device-detector';
import { Subject } from 'rxjs';

@Component({
  host: { class: 'page with-tabs' },
  selector: 'gf-admin-page',
  styleUrls: ['./admin-page.scss'],
  templateUrl: './admin-page.html'
})
export class AdminPageComponent implements OnDestroy, OnInit {
  @HostBinding('class.with-info-message') get getHasMessage() {
    return this.hasMessage;
  }

  public deviceType: string;
  public hasMessage: boolean;
  public tabs: TabConfiguration[] = [];

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private dataService: DataService,
    private deviceService: DeviceDetectorService
  ) {
    const { systemMessage } = this.dataService.fetchInfo();

    this.hasMessage = !!systemMessage;
  }

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
        label: $localize`Jobs`,
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
