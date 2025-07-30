import { TokenStorageService } from '@ghostfolio/client/services/token-storage.service';
import { DEFAULT_PAGE_SIZE } from '@ghostfolio/common/config';
import {
  getDateFnsLocale,
  getDateFormatString,
  getEmojiFlag
} from '@ghostfolio/common/helper';
import { AdminUsers, InfoItem, User } from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { GfPremiumIndicatorComponent } from '@ghostfolio/ui/premium-indicator';
import { GfValueComponent } from '@ghostfolio/ui/value';

import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import {
  MatPaginator,
  MatPaginatorModule,
  PageEvent
} from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { IonIcon } from '@ionic/angular/standalone';
import {
  differenceInSeconds,
  formatDistanceToNowStrict,
  parseISO
} from 'date-fns';
import { addIcons } from 'ionicons';
import {
  contractOutline,
  ellipsisHorizontal,
  keyOutline,
  trashOutline
} from 'ionicons/icons';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { ConfirmationDialogType } from '../../core/notification/confirmation-dialog/confirmation-dialog.type';
import { NotificationService } from '../../core/notification/notification.service';
import { AdminService } from '../../services/admin.service';
import { DataService } from '../../services/data.service';
import { ImpersonationStorageService } from '../../services/impersonation-storage.service';
import { UserService } from '../../services/user/user.service';

@Component({
  imports: [
    CommonModule,
    GfPremiumIndicatorComponent,
    GfValueComponent,
    IonIcon,
    MatButtonModule,
    MatMenuModule,
    MatPaginatorModule,
    MatTableModule,
    NgxSkeletonLoaderModule
  ],
  selector: 'gf-admin-users',
  styleUrls: ['./admin-users.scss'],
  templateUrl: './admin-users.html'
})
export class GfAdminUsersComponent implements OnDestroy, OnInit {
  @ViewChild(MatPaginator) paginator: MatPaginator;

  public dataSource = new MatTableDataSource<AdminUsers['users'][0]>();
  public defaultDateFormat: string;
  public displayedColumns: string[] = [];
  public getEmojiFlag = getEmojiFlag;
  public hasPermissionForSubscription: boolean;
  public hasPermissionToImpersonateAllUsers: boolean;
  public info: InfoItem;
  public isLoading = false;
  public pageSize = DEFAULT_PAGE_SIZE;
  public totalItems = 0;
  public user: User;

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private adminService: AdminService,
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService,
    private impersonationStorageService: ImpersonationStorageService,
    private notificationService: NotificationService,
    private tokenStorageService: TokenStorageService,
    private userService: UserService
  ) {
    this.info = this.dataService.fetchInfo();

    this.hasPermissionForSubscription = hasPermission(
      this.info?.globalPermissions,
      permissions.enableSubscription
    );

    if (this.hasPermissionForSubscription) {
      this.displayedColumns = [
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

    addIcons({ contractOutline, ellipsisHorizontal, keyOutline, trashOutline });
  }

  public ngOnInit() {
    this.fetchUsers();
  }

  public formatDistanceToNow(aDateString: string) {
    if (aDateString) {
      const distanceString = formatDistanceToNowStrict(parseISO(aDateString), {
        addSuffix: true,
        locale: getDateFnsLocale(this.user?.settings?.language)
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

  public onGenerateAccessToken(aUserId: string) {
    this.notificationService.confirm({
      confirmFn: () => {
        this.dataService
          .updateUserAccessToken(aUserId)
          .pipe(takeUntil(this.unsubscribeSubject))
          .subscribe(({ accessToken }) => {
            this.notificationService.alert({
              discardFn: () => {
                if (aUserId === this.user.id) {
                  this.tokenStorageService.signOut();
                  this.userService.remove();

                  document.location.href = `/${document.documentElement.lang}`;
                }
              },
              message: accessToken,
              title: $localize`Security token`
            });
          });
      },
      confirmType: ConfirmationDialogType.Warn,
      title: $localize`Do you really want to generate a new security token for this user?`
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

  public onChangePage(page: PageEvent) {
    this.fetchUsers({
      pageIndex: page.pageIndex
    });
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }

  private fetchUsers({ pageIndex }: { pageIndex: number } = { pageIndex: 0 }) {
    this.isLoading = true;

    if (pageIndex === 0 && this.paginator) {
      this.paginator.pageIndex = 0;
    }

    this.adminService
      .fetchUsers({
        skip: pageIndex * this.pageSize,
        take: this.pageSize
      })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(({ count, users }) => {
        this.dataSource = new MatTableDataSource(users);
        this.totalItems = count;

        this.isLoading = false;

        this.changeDetectorRef.markForCheck();
      });
  }
}
