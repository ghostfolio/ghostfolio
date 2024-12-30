import { CreateOrderDto } from '@ghostfolio/api/app/order/create-order.dto';
import { Activity } from '@ghostfolio/api/app/order/interfaces/activities.interface';
import { UpdateOrderDto } from '@ghostfolio/api/app/order/update-order.dto';
import { DataService } from '@ghostfolio/client/services/data.service';
import { IcsService } from '@ghostfolio/client/services/ics/ics.service';
import { ImpersonationStorageService } from '@ghostfolio/client/services/impersonation-storage.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { DEFAULT_PAGE_SIZE } from '@ghostfolio/common/config';
import { downloadAsFile } from '@ghostfolio/common/helper';
import { AssetProfileIdentifier, User } from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';

import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { Sort, SortDirection } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { ActivatedRoute, Router } from '@angular/router';
import { format, parseISO } from 'date-fns';
import { DeviceDetectorService } from 'ngx-device-detector';
import { Subject, Subscription } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { CreateOrUpdateActivityDialog } from './create-or-update-activity-dialog/create-or-update-activity-dialog.component';
import { ImportActivitiesDialog } from './import-activities-dialog/import-activities-dialog.component';
import { ImportActivitiesDialogParams } from './import-activities-dialog/interfaces/interfaces';

@Component({
  host: { class: 'has-fab' },
  selector: 'gf-activities-page',
  styleUrls: ['./activities-page.scss'],
  templateUrl: './activities-page.html',
  standalone: false
})
export class ActivitiesPageComponent implements OnDestroy, OnInit {
  public dataSource: MatTableDataSource<Activity>;
  public deviceType: string;
  public hasImpersonationId: boolean;
  public hasPermissionToCreateActivity: boolean;
  public hasPermissionToDeleteActivity: boolean;
  public pageIndex = 0;
  public pageSize = DEFAULT_PAGE_SIZE;
  public routeQueryParams: Subscription;
  public sortColumn = 'date';
  public sortDirection: SortDirection = 'desc';
  public totalItems: number;
  public user: User;

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService,
    private deviceService: DeviceDetectorService,
    private dialog: MatDialog,
    private icsService: IcsService,
    private impersonationStorageService: ImpersonationStorageService,
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserService
  ) {
    this.routeQueryParams = route.queryParams
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((params) => {
        if (params['createDialog']) {
          if (params['activityId']) {
            this.dataService
              .fetchActivity(params['activityId'])
              .pipe(takeUntil(this.unsubscribeSubject))
              .subscribe((activity) => {
                this.openCreateActivityDialog(activity);
              });
          } else {
            this.openCreateActivityDialog();
          }
        } else if (params['editDialog']) {
          if (params['activityId']) {
            this.dataService
              .fetchActivity(params['activityId'])
              .pipe(takeUntil(this.unsubscribeSubject))
              .subscribe((activity) => {
                this.openUpdateActivityDialog(activity);
              });
          } else {
            this.router.navigate(['.'], { relativeTo: this.route });
          }
        }
      });
  }

  public ngOnInit() {
    this.deviceType = this.deviceService.getDeviceInfo().deviceType;

    this.impersonationStorageService
      .onChangeHasImpersonation()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((impersonationId) => {
        this.hasImpersonationId = !!impersonationId;
      });

    this.userService.stateChanged
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((state) => {
        if (state?.user) {
          this.updateUser(state.user);

          this.fetchActivities();

          this.changeDetectorRef.markForCheck();
        }
      });
  }

  public fetchActivities() {
    this.dataService
      .fetchActivities({
        filters: this.userService.getFilters(),
        skip: this.pageIndex * this.pageSize,
        sortColumn: this.sortColumn,
        sortDirection: this.sortDirection,
        take: this.pageSize
      })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(({ activities, count }) => {
        this.dataSource = new MatTableDataSource(activities);
        this.totalItems = count;

        if (this.hasPermissionToCreateActivity && this.totalItems <= 0) {
          this.router.navigate([], { queryParams: { createDialog: true } });
        }

        this.changeDetectorRef.markForCheck();
      });
  }

  public onChangePage(page: PageEvent) {
    this.pageIndex = page.pageIndex;

    this.fetchActivities();
  }

  public onClickActivity({ dataSource, symbol }: AssetProfileIdentifier) {
    this.router.navigate([], {
      queryParams: {
        dataSource,
        symbol,
        holdingDetailDialog: true
      }
    });
  }

  public onCloneActivity(aActivity: Activity) {
    this.openCreateActivityDialog(aActivity);
  }

  public onDeleteActivities() {
    this.dataService
      .deleteActivities({
        filters: this.userService.getFilters()
      })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(() => {
        this.fetchActivities();
      });
  }

  public onDeleteActivity(aId: string) {
    this.dataService
      .deleteActivity(aId)
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(() => {
        this.fetchActivities();
      });
  }

  public onExport(activityIds?: string[]) {
    let fetchExportParams: any = { activityIds };

    if (!activityIds) {
      fetchExportParams = { filters: this.userService.getFilters() };
    }

    this.dataService
      .fetchExport(fetchExportParams)
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((data) => {
        for (const activity of data.activities) {
          delete activity.id;
        }

        downloadAsFile({
          content: data,
          fileName: `ghostfolio-export-${format(
            parseISO(data.meta.date),
            'yyyyMMddHHmm'
          )}.json`,
          format: 'json'
        });
      });
  }

  public onExportDrafts(activityIds?: string[]) {
    this.dataService
      .fetchExport({ activityIds })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((data) => {
        downloadAsFile({
          content: this.icsService.transformActivitiesToIcsContent(
            data.activities
          ),
          contentType: 'text/calendar',
          fileName: `ghostfolio-draft${
            data.activities.length > 1 ? 's' : ''
          }-${format(parseISO(data.meta.date), 'yyyyMMddHHmmss')}.ics`,
          format: 'string'
        });
      });
  }

  public onImport() {
    const dialogRef = this.dialog.open(ImportActivitiesDialog, {
      data: {
        deviceType: this.deviceType,
        user: this.user
      } as ImportActivitiesDialogParams,
      width: this.deviceType === 'mobile' ? '100vw' : '50rem'
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(() => {
        this.fetchActivities();
      });
  }

  public onImportDividends() {
    const dialogRef = this.dialog.open(ImportActivitiesDialog, {
      data: {
        activityTypes: ['DIVIDEND'],
        deviceType: this.deviceType,
        user: this.user
      } as ImportActivitiesDialogParams,
      width: this.deviceType === 'mobile' ? '100vw' : '50rem'
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(() => {
        this.fetchActivities();
      });
  }

  public onSortChanged({ active, direction }: Sort) {
    this.pageIndex = 0;
    this.sortColumn = active;
    this.sortDirection = direction;

    this.fetchActivities();
  }

  public onUpdateActivity(aActivity: Activity) {
    this.router.navigate([], {
      queryParams: { activityId: aActivity.id, editDialog: true }
    });
  }

  public openUpdateActivityDialog(activity: Activity) {
    const dialogRef = this.dialog.open(CreateOrUpdateActivityDialog, {
      data: {
        activity,
        accounts: this.user?.accounts,
        user: this.user
      },
      height: this.deviceType === 'mobile' ? '98vh' : '80vh',
      width: this.deviceType === 'mobile' ? '100vw' : '50rem'
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((transaction: UpdateOrderDto | null) => {
        if (transaction) {
          this.dataService
            .putOrder(transaction)
            .pipe(takeUntil(this.unsubscribeSubject))
            .subscribe({
              next: () => {
                this.fetchActivities();
              }
            });
        }

        this.router.navigate(['.'], { relativeTo: this.route });
      });
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }

  private openCreateActivityDialog(aActivity?: Activity) {
    this.userService
      .get()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((user) => {
        this.updateUser(user);

        const dialogRef = this.dialog.open(CreateOrUpdateActivityDialog, {
          data: {
            accounts: this.user?.accounts,
            activity: {
              ...aActivity,
              accountId: aActivity?.accountId,
              date: new Date(),
              id: null,
              fee: 0,
              type: aActivity?.type ?? 'BUY',
              unitPrice: null
            },
            user: this.user
          },
          height: this.deviceType === 'mobile' ? '98vh' : '80vh',
          width: this.deviceType === 'mobile' ? '100vw' : '50rem'
        });

        dialogRef
          .afterClosed()
          .pipe(takeUntil(this.unsubscribeSubject))
          .subscribe((transaction: CreateOrderDto | null) => {
            if (transaction) {
              this.dataService.postOrder(transaction).subscribe({
                next: () => {
                  this.fetchActivities();
                }
              });
            }

            this.router.navigate(['.'], { relativeTo: this.route });
          });
      });
  }

  private updateUser(aUser: User) {
    this.user = aUser;

    this.hasPermissionToCreateActivity =
      !this.hasImpersonationId &&
      hasPermission(this.user.permissions, permissions.createOrder);
    this.hasPermissionToDeleteActivity =
      !this.hasImpersonationId &&
      hasPermission(this.user.permissions, permissions.deleteOrder);
  }
}
