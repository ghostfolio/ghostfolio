import {
  ChangeDetectorRef,
  Component,
  HostBinding,
  OnDestroy,
  OnInit
} from '@angular/core';
import { DataService } from '@ghostfolio/client/services/data.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import {
  InfoItem,
  TabConfiguration,
  User
} from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { DeviceDetectorService } from 'ngx-device-detector';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  host: { class: 'page with-tabs' },
  selector: 'gf-portfolio-page',
  styleUrls: ['./portfolio-page.scss'],
  templateUrl: './portfolio-page.html'
})
export class PortfolioPageComponent implements OnDestroy, OnInit {
  @HostBinding('class.with-info-message') get getHasMessage() {
    return this.hasMessage;
  }

  public deviceType: string;
  public hasMessage: boolean;
  public info: InfoItem;
  public tabs: TabConfiguration[] = [];
  public user: User;

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService,
    private deviceService: DeviceDetectorService,
    private userService: UserService
  ) {
    this.info = this.dataService.fetchInfo();

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

          this.hasMessage =
            hasPermission(
              this.user?.permissions,
              permissions.createUserAccount
            ) || !!this.info.systemMessage;

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
