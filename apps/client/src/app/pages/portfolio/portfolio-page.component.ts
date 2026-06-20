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
import { addIcons } from 'ionicons';
import {
  analyticsOutline,
  calculatorOutline,
  pieChartOutline,
  scanOutline,
  swapVerticalOutline
} from 'ionicons/icons';
import { DeviceDetectorService } from 'ngx-device-detector';

@Component({
  host: { class: 'page has-tabs' },
  imports: [MatTabsModule, RouterModule],
  selector: 'gf-portfolio-page',
  styleUrls: ['./portfolio-page.scss'],
  templateUrl: './portfolio-page.html'
})
export class PortfolioPageComponent implements OnInit {
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
              label: internalRoutes.portfolio.subRoutes.analysis.title,
              routerLink: internalRoutes.portfolio.routerLink
            },
            {
              iconName: 'swap-vertical-outline',
              label: internalRoutes.portfolio.subRoutes.activities.title,
              routerLink:
                internalRoutes.portfolio.subRoutes.activities.routerLink
            },
            {
              iconName: 'pie-chart-outline',
              label: internalRoutes.portfolio.subRoutes.allocations.title,
              routerLink:
                internalRoutes.portfolio.subRoutes.allocations.routerLink
            },
            {
              iconName: 'calculator-outline',
              label: internalRoutes.portfolio.subRoutes.fire.title,
              routerLink: internalRoutes.portfolio.subRoutes.fire.routerLink
            },
            {
              iconName: 'scan-outline',
              label: internalRoutes.portfolio.subRoutes.xRay.title,
              routerLink: internalRoutes.portfolio.subRoutes.xRay.routerLink
            }
          ];
          this.user = state.user;

          this.changeDetectorRef.markForCheck();
        }
      });

    addIcons({
      analyticsOutline,
      calculatorOutline,
      pieChartOutline,
      scanOutline,
      swapVerticalOutline
    });
  }

  public ngOnInit() {
    this.deviceType = this.deviceService.getDeviceInfo().deviceType;
  }
}
