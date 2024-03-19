import { DataService } from '@ghostfolio/client/services/data.service';
import { TabConfiguration, User } from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';

import { Component, OnDestroy, OnInit } from '@angular/core';
import { DeviceDetectorService } from 'ngx-device-detector';
import { Subject } from 'rxjs';

@Component({
  host: { class: 'page has-tabs' },
  selector: 'gf-faq-page',
  styleUrls: ['./faq-page.scss'],
  templateUrl: './faq-page.html'
})
export class FaqPageComponent implements OnDestroy, OnInit {
  public deviceType: string;
  public hasPermissionForSubscription: boolean;
  public tabs: TabConfiguration[] = [];

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private dataService: DataService,
    private deviceService: DeviceDetectorService
  ) {
    const { globalPermissions } = this.dataService.fetchInfo();

    this.hasPermissionForSubscription = hasPermission(
      globalPermissions,
      permissions.enableSubscription
    );

    this.tabs = [
      {
        iconName: 'reader-outline',
        label: $localize`General`,
        path: ['/' + $localize`faq`]
      },
      {
        iconName: 'cloudy-outline',
        label: $localize`Cloud` + ' (SaaS)',
        path: ['/' + $localize`faq`, 'saas'],
        showCondition: this.hasPermissionForSubscription
      },
      {
        iconName: 'server-outline',
        label: $localize`Self-Hosting`,
        path: ['/' + $localize`faq`, $localize`self-hosting`]
      }
    ];
  }

  public ngOnInit() {
    this.deviceType = this.deviceService.getDeviceInfo().deviceType;
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
