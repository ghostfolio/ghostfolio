import { paths } from '@ghostfolio/client/core/paths';

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
  public tabs = [
    {
      path: '.',
      label: $localize`Overview`,
      iconName: 'reader-outline'
    },
    {
      path: paths.guides,
      label: $localize`Guides`,
      iconName: 'book-outline'
    },
    {
      path: paths.markets,
      label: $localize`Markets`,
      iconName: 'newspaper-outline'
    },
    {
      path: paths.glossary,
      label: $localize`Glossary`,
      iconName: 'library-outline'
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
