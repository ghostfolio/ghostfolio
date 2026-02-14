import { UserDetailDialogParams } from '@ghostfolio/client/components/user-detail-dialog/interfaces/interfaces';
import { GfUserDetailDialogComponent } from '@ghostfolio/client/components/user-detail-dialog/user-detail-dialog.component';
import { ImpersonationStorageService } from '@ghostfolio/client/services/impersonation-storage.service';
import { TokenStorageService } from '@ghostfolio/client/services/token-storage.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { DEFAULT_PAGE_SIZE } from '@ghostfolio/common/config';
import { ConfirmationDialogType } from '@ghostfolio/common/enums';
import {
  getDateFnsLocale,
  getDateFormatString,
  getEmojiFlag
} from '@ghostfolio/common/helper';
import {
  AdminUsersResponse,
  InfoItem,
  User
} from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { internalRoutes } from '@ghostfolio/common/routes/routes';
import { NotificationService } from '@ghostfolio/ui/notifications';
import { GfPremiumIndicatorComponent } from '@ghostfolio/ui/premium-indicator';
import { AdminService, DataService } from '@ghostfolio/ui/services';
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
import { MatDialog } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import {
  MatPaginator,
  MatPaginatorModule,
  PageEvent
} from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
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
  personOutline,
  trashOutline
} from 'ionicons/icons';
import { DeviceDetectorService } from 'ngx-device-detector';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { Subject } from 'rxjs';
import { switchMap, takeUntil, tap } from 'rxjs/operators';

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
    NgxSkeletonLoaderModule,
    RouterModule
  ],
  selector: 'gf-admin-users',
  styleUrls: ['./admin-users.scss'],
  templateUrl: './admin-users.html'
})
export class GfAdminUsersComponent implements OnDestroy, OnInit {
  @ViewChild(MatPaginator) paginator: MatPaginator;

  public dataSource = new MatTableDataSource<AdminUsersResponse['users'][0]>();
  public defaultDateFormat: string;
  public deviceType: string;
  public displayedColumns: string[] = [];
  public getEmojiFlag = getEmojiFlag;
  public hasPermissionForSubscription: boolean;
  public hasPermissionToImpersonateAllUsers: boolean;
  public info: InfoItem;
  public isLoading = false;
  public pageSize = DEFAULT_PAGE_SIZE;
  public routerLinkAdminControlUsers =
    internalRoutes.adminControl.subRoutes.users.routerLink;
  public totalItems = 0;
  public user: User;

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private adminService: AdminService,
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService,
    private deviceService: DeviceDetectorService,
    private dialog: MatDialog,
    private impersonationStorageService: ImpersonationStorageService,
    private notificationService: NotificationService,
    private route: ActivatedRoute,
    private router: Router,
    private tokenStorageService: TokenStorageService,
    private userService: UserService
  ) {
    this.deviceType = this.deviceService.getDeviceInfo().deviceType;
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
      .pipe(
        takeUntil(this.unsubscribeSubject),
        tap((state) => {
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
        }),
        switchMap(() => this.route.paramMap)
      )
      .subscribe((params) => {
        const userId = params.get('userId');

        if (userId) {
          this.openUserDetailDialog(userId);
        }
      });

    addIcons({
      contractOutline,
      ellipsisHorizontal,
      keyOutline,
      personOutline,
      trashOutline
    });
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

  public onChangePage(page: PageEvent) {
    this.fetchUsers({
      pageIndex: page.pageIndex
    });
  }

  public onDeleteUser(aId: string) {
    this.notificationService.confirm({
      confirmFn: () => {
        this.dataService
          .deleteUser(aId)
          .pipe(takeUntil(this.unsubscribeSubject))
          .subscribe(() => {
            this.router.navigate(['..'], { relativeTo: this.route });
          });
      },
      confirmType: ConfirmationDialogType.Warn,
      discardFn: () => {
        this.router.navigate(['..'], { relativeTo: this.route });
      },
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

  public onOpenUserDetailDialog(userId: string) {
    this.router.navigate(
      internalRoutes.adminControl.subRoutes.users.routerLink.concat(userId)
    );
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

  private openUserDetailDialog(aUserId: string) {
    const dialogRef = this.dialog.open<
      GfUserDetailDialogComponent,
      UserDetailDialogParams
    >(GfUserDetailDialogComponent, {
      autoFocus: false,
      data: {
        currentUserId: this.user?.id,
        deviceType: this.deviceType,
        hasPermissionForSubscription: this.hasPermissionForSubscription,
        locale: this.user?.settings?.locale,
        userId: aUserId
      },
      height: this.deviceType === 'mobile' ? '98vh' : '60vh',
      width: this.deviceType === 'mobile' ? '100vw' : '50rem'
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((data) => {
        if (data?.action === 'delete' && data?.userId) {
          this.onDeleteUser(data.userId);
        } else {
          this.router.navigate(
            internalRoutes.adminControl.subRoutes.users.routerLink
          );
        }
      });
  }
}
