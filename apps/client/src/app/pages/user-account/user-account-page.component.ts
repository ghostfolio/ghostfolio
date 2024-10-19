import { UserService } from '@ghostfolio/client/services/user/user.service';
import { TabConfiguration, User } from '@ghostfolio/common/interfaces';

import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { DeviceDetectorService } from 'ngx-device-detector';
import { Subject, takeUntil } from 'rxjs';

@Component({
  host: { class: 'page has-tabs' },
  selector: 'gf-user-account-page',
  styleUrls: ['./user-account-page.scss'],
  templateUrl: './user-account-page.html'
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
              label: $localize`Settings`,
              path: ['/account']
            },
            {
              iconName: 'diamond-outline',
              label: $localize`Membership`,
              path: ['/account/membership'],
              showCondition: !!this.user?.subscription
            },
            {
              iconName: 'share-social-outline',
              label: $localize`Access`,
              path: ['/account', 'access']
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
