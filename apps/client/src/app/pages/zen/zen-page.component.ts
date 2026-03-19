import { UserService } from '@ghostfolio/client/services/user/user.service';
import { TabConfiguration, User } from '@ghostfolio/common/interfaces';
import { internalRoutes } from '@ghostfolio/common/routes/routes';

import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnInit
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatTabsModule } from '@angular/material/tabs';
import { RouterModule } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { albumsOutline, analyticsOutline } from 'ionicons/icons';
import { DeviceDetectorService } from 'ngx-device-detector';

@Component({
  host: { class: 'page has-tabs' },
  imports: [IonIcon, MatTabsModule, RouterModule],
  selector: 'gf-zen-page',
  styleUrls: ['./zen-page.scss'],
  templateUrl: './zen-page.html'
})
export class GfZenPageComponent implements OnInit {
  public deviceType: string;
  public tabs: TabConfiguration[] = [];
  public user: User;

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private destroyRef: DestroyRef,
    private deviceService: DeviceDetectorService,
    private userService: UserService
  ) {
    this.userService.stateChanged
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((state) => {
        if (state?.user) {
          this.tabs = [
            {
              iconName: 'analytics-outline',
              label: internalRoutes.zen.title,
              routerLink: internalRoutes.zen.routerLink
            },
            {
              iconName: 'albums-outline',
              label: internalRoutes.zen.subRoutes.holdings.title,
              routerLink: internalRoutes.zen.subRoutes.holdings.routerLink
            }
          ];
          this.user = state.user;

          this.changeDetectorRef.markForCheck();
        }
      });

    addIcons({ albumsOutline, analyticsOutline });
  }

  public ngOnInit() {
    this.deviceType = this.deviceService.getDeviceInfo().deviceType;
  }
}
