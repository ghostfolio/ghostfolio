import { UserService } from '@ghostfolio/client/services/user/user.service';
import { User } from '@ghostfolio/common/interfaces';
import { internalRoutes } from '@ghostfolio/common/routes/routes';
import {
  GfPageTabsComponent,
  TabConfiguration
} from '@ghostfolio/ui/page-tabs';

import { ChangeDetectorRef, Component, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { addIcons } from 'ionicons';
import {
  analyticsOutline,
  calculatorOutline,
  pieChartOutline,
  scanOutline,
  swapVerticalOutline
} from 'ionicons/icons';

@Component({
  host: { class: 'page has-tabs' },
  imports: [GfPageTabsComponent],
  selector: 'gf-portfolio-page',
  styleUrls: ['./portfolio-page.scss'],
  templateUrl: './portfolio-page.html'
})
export class PortfolioPageComponent {
  public tabs: TabConfiguration[] = [];
  public user: User;

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private destroyRef: DestroyRef,
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
}
