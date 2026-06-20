import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input
} from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { RouterModule } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { DeviceDetectorService } from 'ngx-device-detector';

import { TabConfiguration } from './interfaces/interfaces';

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

  private readonly deviceService = inject(DeviceDetectorService);

  public constructor() {
    this.deviceType = this.deviceService.getDeviceInfo().deviceType;
  }
}
