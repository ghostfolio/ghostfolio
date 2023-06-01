import {
  ChangeDetectorRef,
  Component,
  HostBinding,
  OnDestroy,
  OnInit
} from '@angular/core';
import { DataService } from '@ghostfolio/client/services/data.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { User } from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'gf-about-page',
  styleUrls: ['./about-page.scss'],
  templateUrl: './about-page.html'
})
export class AboutPageComponent implements OnDestroy, OnInit {
  @HostBinding('class.with-info-message') get getHasMessage() {
    return this.hasMessage;
  }

  public hasMessage: boolean;
  public hasPermissionForSubscription: boolean;
  public tabs: {
    iconName: string;
    label: string;
    path: string;
    showCondition?: boolean;
  }[] = [];
  public user: User;

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService,
    private userService: UserService
  ) {
    const { globalPermissions, systemMessage } = this.dataService.fetchInfo();

    this.hasPermissionForSubscription = hasPermission(
      globalPermissions,
      permissions.enableSubscription
    );

    this.userService.stateChanged
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((state) => {
        if (state?.user) {
          this.tabs = [
            {
              iconName: 'reader-outline',
              label: $localize`About`,
              path: 'overview'
            },
            {
              iconName: 'sparkles-outline',
              label: $localize`Changelog & License`,
              path: 'changelog'
            },
            {
              iconName: 'shield-checkmark-outline',
              label: $localize`Privacy Policy`,
              path: 'privacy-policy',
              showCondition: this.hasPermissionForSubscription
            }
          ];
          this.user = state.user;

          this.hasMessage =
            hasPermission(
              this.user?.permissions,
              permissions.createUserAccount
            ) || !!systemMessage;

          this.changeDetectorRef.markForCheck();
        }
      });
  }

  public ngOnInit() {}

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
