import { TabConfiguration } from '@ghostfolio/common/interfaces';
import { routes } from '@ghostfolio/common/routes/routes';

import { Component, OnInit } from '@angular/core';
import { DeviceDetectorService } from 'ngx-device-detector';
import { Subject } from 'rxjs';

@Component({
  host: { class: 'page has-tabs' },
  selector: 'gf-resources-page',
  styleUrls: ['./resources-page.scss'],
  templateUrl: './resources-page.html',
  standalone: false
})
export class ResourcesPageComponent implements OnInit {
  public deviceType: string;
  public tabs: TabConfiguration[] = [
    {
      iconName: 'reader-outline',
      label: $localize`Overview`,
      routerLink: ['/' + routes.resources]
    },
    {
      label: $localize`Guides`,
      iconName: 'book-outline',
      routerLink: ['/' + routes.resources, routes.guides]
    },
    {
      iconName: 'newspaper-outline',
      label: $localize`Markets`,
      routerLink: ['/' + routes.resources, routes.markets]
    },
    {
      iconName: 'library-outline',
      label: $localize`Glossary`,
      routerLink: ['/' + routes.resources, routes.glossary]
    }
  ];

  private unsubscribeSubject = new Subject<void>();

  public constructor(private deviceService: DeviceDetectorService) {}

  public ngOnInit() {
    this.deviceType = this.deviceService.getDeviceInfo().deviceType;
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
