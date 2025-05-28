import { DataService } from '@ghostfolio/client/services/data.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { TabConfiguration, User } from '@ghostfolio/common/interfaces';
import { paths } from '@ghostfolio/common/paths';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';

import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { DeviceDetectorService } from 'ngx-device-detector';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  host: { class: 'page has-tabs' },
  selector: 'gf-about-page',
  styleUrls: ['./about-page.scss'],
  templateUrl: './about-page.html',
  standalone: false
})
export class AboutPageComponent implements OnDestroy, OnInit {
  public deviceType: string;
  public hasPermissionForSubscription: boolean;
  public tabs: TabConfiguration[] = [];
  public user: User;

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService,
    private deviceService: DeviceDetectorService,
    private userService: UserService
  ) {
    const { globalPermissions } = this.dataService.fetchInfo();

    this.hasPermissionForSubscription = hasPermission(
      globalPermissions,
      permissions.enableSubscription
    );

    this.userService.stateChanged
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((state) => {
        this.tabs = [
          {
            iconName: 'information-circle-outline',
            label: $localize`About`,
            path: ['/' + paths.about]
          },
          {
            iconName: 'sparkles-outline',
            label: $localize`Changelog`,
            path: ['/' + paths.about, paths.changelog]
          },
          {
            iconName: 'ribbon-outline',
            label: $localize`License`,
            path: ['/' + paths.about, paths.license],
            showCondition: !this.hasPermissionForSubscription
          }
        ];

        if (state?.user) {
          this.tabs.push({
            iconName: 'shield-checkmark-outline',
            label: $localize`Privacy Policy`,
            path: ['/' + paths.about, paths.privacyPolicy],
            showCondition: this.hasPermissionForSubscription
          });

          this.tabs.push({
            iconName: 'document-text-outline',
            label: $localize`Terms of Service`,
            path: ['/' + paths.about, paths.termsOfService],
            showCondition: this.hasPermissionForSubscription
          });

          this.user = state.user;

          this.changeDetectorRef.markForCheck();
        }

        this.tabs.push({
          iconName: 'happy-outline',
          label: 'OSS Friends',
          path: ['/' + paths.about, paths.ossFriends]
        });
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
