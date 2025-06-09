import { UserService } from '@ghostfolio/client/services/user/user.service';
import { TabConfiguration, User } from '@ghostfolio/common/interfaces';
import { internalRoutes, routes } from '@ghostfolio/common/routes/routes';

import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { DeviceDetectorService } from 'ngx-device-detector';
import { Subject, takeUntil } from 'rxjs';

@Component({
  host: { class: 'page has-tabs' },
  selector: 'gf-user-account-page',
  styleUrls: ['./user-account-page.scss'],
  templateUrl: './user-account-page.html',
  standalone: false
})
export class UserAccountPageComponent implements OnDestroy, OnInit {
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
          this.user = state.user;

          this.tabs = [
            {
              iconName: 'settings-outline',
              label: internalRoutes.account.title,
              path: internalRoutes.account.routerLink
            },
            {
              iconName: 'diamond-outline',
              label: $localize`Membership`,
              path: ['/' + internalRoutes.account.path, routes.membership],
              showCondition: !!this.user?.subscription
            },
            {
              iconName: 'key-outline',
              label: $localize`Access`,
              path: ['/' + internalRoutes.account.path, routes.access]
            }
          ];

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
