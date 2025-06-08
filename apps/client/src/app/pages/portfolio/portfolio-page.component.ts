import { UserService } from '@ghostfolio/client/services/user/user.service';
import { TabConfiguration, User } from '@ghostfolio/common/interfaces';
import { internalRoutes, routes } from '@ghostfolio/common/routes';

import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { DeviceDetectorService } from 'ngx-device-detector';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  host: { class: 'page has-tabs' },
  selector: 'gf-portfolio-page',
  styleUrls: ['./portfolio-page.scss'],
  templateUrl: './portfolio-page.html',
  standalone: false
})
export class PortfolioPageComponent implements OnDestroy, OnInit {
  public deviceType: string;
  public tabs: TabConfiguration[] = [];
  public user: User;

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private deviceService: DeviceDetectorService,
    private userService: UserService
  ) {
    this.userService.stateChanged
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((state) => {
        if (state?.user) {
          this.tabs = [
            {
              iconName: 'analytics-outline',
              label: $localize`Analysis`,
              path: internalRoutes.portfolio.routerLink
            },
            {
              iconName: 'swap-vertical-outline',
              label: internalRoutes.portfolio.subRoutes.activities.title,
              path: internalRoutes.portfolio.subRoutes.activities.routerLink
            },
            {
              iconName: 'pie-chart-outline',
              label: $localize`Allocations`,
              path: ['/' + internalRoutes.portfolio.path, routes.allocations]
            },
            {
              iconName: 'calculator-outline',
              label: 'FIRE ',
              path: ['/' + internalRoutes.portfolio.path, routes.fire]
            },
            {
              iconName: 'scan-outline',
              label: 'X-ray',
              path: ['/' + internalRoutes.portfolio.path, routes.xRay]
            }
          ];
          this.user = state.user;

          this.changeDetectorRef.markForCheck();
        }
      });
  }

  public ngOnInit() {
    this.deviceType = this.deviceService.getDeviceInfo().deviceType;
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
