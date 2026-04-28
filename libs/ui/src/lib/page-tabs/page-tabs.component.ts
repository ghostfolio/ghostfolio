import { TabConfiguration } from '@ghostfolio/common/interfaces';

import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { RouterModule } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { DeviceDetectorService } from 'ngx-device-detector';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonIcon, MatTabsModule, RouterModule],
  selector: 'gf-page-tabs',
  styleUrls: ['./page-tabs.component.scss'],
  templateUrl: './page-tabs.component.html'
})
export class GfPageTabsComponent {
  public deviceType: string;
  public readonly tabs = input.required<TabConfiguration[]>();

  public constructor(deviceService: DeviceDetectorService) {
    this.deviceType = deviceService.getDeviceInfo().deviceType;
  }
}
