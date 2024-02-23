import { UserService } from '@ghostfolio/client/services/user/user.service';
import { TabConfiguration, User } from '@ghostfolio/common/interfaces';

import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { DeviceDetectorService } from 'ngx-device-detector';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  host: { class: 'page has-tabs' },
  selector: 'gf-portfolio-page',
  styleUrls: ['./portfolio-page.scss'],
  templateUrl: './portfolio-page.html'
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
              path: ['/portfolio']
            },
            {
              iconName: 'wallet-outline',
              label: $localize`Holdings`,
              path: ['/portfolio', 'holdings']
            },
            {
              iconName: 'swap-vertical-outline',
              label: $localize`Activities`,
              path: ['/portfolio', 'activities']
            },
            {
              iconName: 'pie-chart-outline',
              label: $localize`Allocations`,
              path: ['/portfolio', 'allocations']
            },
            {
              iconName: 'calculator-outline',
              label: 'FIRE / X-ray',
              path: ['/portfolio', 'fire']
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
