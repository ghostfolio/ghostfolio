import { DataService } from '@ghostfolio/client/services/data.service';
import { TabConfiguration } from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { publicRoutes } from '@ghostfolio/common/routes/routes';

import {
  CUSTOM_ELEMENTS_SCHEMA,
  Component,
  OnDestroy,
  OnInit
} from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { RouterModule } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { cloudyOutline, readerOutline, serverOutline } from 'ionicons/icons';
import { DeviceDetectorService } from 'ngx-device-detector';
import { Subject } from 'rxjs';

@Component({
  host: { class: 'page has-tabs' },
  imports: [IonIcon, MatTabsModule, RouterModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'gf-faq-page',
  styleUrls: ['./faq-page.scss'],
  templateUrl: './faq-page.html'
})
export class GfFaqPageComponent implements OnDestroy, OnInit {
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
        routerLink: publicRoutes.faq.routerLink
      },
      {
        iconName: 'cloudy-outline',
        label: $localize`Cloud` + ' (SaaS)',
        routerLink: publicRoutes.faq.subRoutes.saas.routerLink,
        showCondition: this.hasPermissionForSubscription
      },
      {
        iconName: 'server-outline',
        label: $localize`Self-Hosting`,
        routerLink: publicRoutes.faq.subRoutes.selfHosting.routerLink
      }
    ];

    addIcons({ cloudyOutline, readerOutline, serverOutline });
  }

  public ngOnInit() {
    this.deviceType = this.deviceService.getDeviceInfo().deviceType;
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
