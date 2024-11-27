import { ConfirmationDialogType } from '@ghostfolio/client/core/notification/confirmation-dialog/confirmation-dialog.type';
import { NotificationService } from '@ghostfolio/client/core/notification/notification.service';
import { AdminService } from '@ghostfolio/client/services/admin.service';
import { DataService } from '@ghostfolio/client/services/data.service';
import { ImpersonationStorageService } from '@ghostfolio/client/services/impersonation-storage.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { getDateFormatString, getEmojiFlag } from '@ghostfolio/common/helper';
import { AdminUsers, InfoItem, User } from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';

import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import {
  differenceInSeconds,
  formatDistanceToNowStrict,
  parseISO
} from 'date-fns';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'gf-admin-users',
  styleUrls: ['./admin-users.scss'],
  templateUrl: './admin-users.html'
})
export class AdminUsersComponent implements OnDestroy, OnInit {
  public dataSource = new MatTableDataSource<AdminUsers['users'][0]>();
  public defaultDateFormat: string;
  public displayedColumns: string[] = [];
  public getEmojiFlag = getEmojiFlag;
  public hasPermissionForSubscription: boolean;
  public hasPermissionToImpersonateAllUsers: boolean;
  public info: InfoItem;
  public isLoading = false;
  public user: User;

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private adminService: AdminService,
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService,
    private impersonationStorageService: ImpersonationStorageService,
    private notificationService: NotificationService,
    private userService: UserService
  ) {
    this.info = this.dataService.fetchInfo();

    this.hasPermissionForSubscription = hasPermission(
      this.info?.globalPermissions,
      permissions.enableSubscription
    );

    if (this.hasPermissionForSubscription) {
      this.displayedColumns = [
        'index',
        'user',
        'country',
        'registration',
        'accounts',
        'activities',
        'engagementPerDay',
        'dailyApiRequests',
        'lastRequest',
        'actions'
      ];
    } else {
      this.displayedColumns = [
        'index',
        'user',
        'registration',
        'accounts',
        'activities',
        'actions'
      ];
    }

    this.userService.stateChanged
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((state) => {
        if (state?.user) {
          this.user = state.user;

          this.defaultDateFormat = getDateFormatString(
            this.user.settings.locale
          );

          this.hasPermissionToImpersonateAllUsers = hasPermission(
            this.user.permissions,
            permissions.impersonateAllUsers
          );
        }
      });
  }

  public ngOnInit() {
    this.fetchUsers();
  }

  public formatDistanceToNow(aDateString: string) {
    if (aDateString) {
      const distanceString = formatDistanceToNowStrict(parseISO(aDateString), {
        addSuffix: true
      });

      return Math.abs(differenceInSeconds(parseISO(aDateString), new Date())) <
        60
        ? 'just now'
        : distanceString;
    }

    return '';
  }

  public onDeleteUser(aId: string) {
    this.notificationService.confirm({
      confirmFn: () => {
        this.dataService
          .deleteUser(aId)
          .pipe(takeUntil(this.unsubscribeSubject))
          .subscribe(() => {
            this.fetchUsers();
          });
      },
      confirmType: ConfirmationDialogType.Warn,
      title: $localize`Do you really want to delete this user?`
    });
  }

  public onImpersonateUser(aId: string) {
    if (aId) {
      this.impersonationStorageService.setId(aId);
    } else {
      this.impersonationStorageService.removeId();
    }

    window.location.reload();
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }

  private fetchUsers() {
    this.isLoading = true;

    this.adminService
      .fetchUsers()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(({ users }) => {
        this.dataSource = new MatTableDataSource(users);

        this.isLoading = false;

        this.changeDetectorRef.markForCheck();
      });
  }
}
