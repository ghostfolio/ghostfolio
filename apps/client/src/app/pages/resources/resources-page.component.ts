import { DataService } from '@ghostfolio/client/services/data.service';
import { InfoItem } from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';

import { Component, OnInit } from '@angular/core';
import { DeviceDetectorService } from 'ngx-device-detector';
import { Subject } from 'rxjs';

@Component({
  host: { class: 'page has-tabs' },
  selector: 'gf-resources-page',
  styleUrls: ['./resources-page.scss'],
  templateUrl: './resources-page.html'
})
export class ResourcesPageComponent implements OnInit {
  public deviceType: string;
  public hasPermissionForSubscription: boolean;
  public info: InfoItem;
  public routerLinkFaq = ['/' + $localize`:snake-case:faq`];
  public routerLinkResourcesPersonalFinanceTools = [
    '/' + $localize`:snake-case:resources`,
    'personal-finance-tools'
  ];
  public tabs = [
    {
      path: '.',
      label: $localize`Overview`,
      iconName: 'reader-outline'
    },
    {
      path: 'guides',
      label: $localize`Guides`,
      iconName: 'book-outline'
    },
    {
      path: 'markets',
      label: $localize`Markets`,
      iconName: 'newspaper-outline'
    },
    {
      path: 'glossary',
      label: $localize`Glossary`,
      iconName: 'library-outline'
    }
  ];

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private dataService: DataService,
    private deviceService: DeviceDetectorService
  ) {
    this.info = this.dataService.fetchInfo();
  }

  public ngOnInit() {
    this.deviceType = this.deviceService.getDeviceInfo().deviceType;
    this.hasPermissionForSubscription = hasPermission(
      this.info?.globalPermissions,
      permissions.enableSubscription
    );
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
