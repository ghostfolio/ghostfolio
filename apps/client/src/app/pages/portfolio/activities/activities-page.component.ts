import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { CreateOrderDto } from '@ghostfolio/api/app/order/create-order.dto';
import { Activity } from '@ghostfolio/api/app/order/interfaces/activities.interface';
import { UpdateOrderDto } from '@ghostfolio/api/app/order/update-order.dto';
import { PositionDetailDialogParams } from '@ghostfolio/client/components/position/position-detail-dialog/interfaces/interfaces';
import { PositionDetailDialog } from '@ghostfolio/client/components/position/position-detail-dialog/position-detail-dialog.component';
import { DataService } from '@ghostfolio/client/services/data.service';
import { IcsService } from '@ghostfolio/client/services/ics/ics.service';
import { ImpersonationStorageService } from '@ghostfolio/client/services/impersonation-storage.service';
import { ImportActivitiesService } from '@ghostfolio/client/services/import-activities.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { downloadAsFile } from '@ghostfolio/common/helper';
import { User } from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { DataSource, Order as OrderModel } from '@prisma/client';
import { format, parseISO } from 'date-fns';
import { DeviceDetectorService } from 'ngx-device-detector';
import { Subject, Subscription } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { CreateOrUpdateActivityDialog } from './create-or-update-activity-dialog/create-or-update-activity-dialog.component';
import { ImportActivitiesDialog } from './import-activities-dialog/import-activities-dialog.component';
import { ImportActivitiesDialogParams } from './import-activities-dialog/interfaces/interfaces';

@Component({
  host: { class: 'page' },
  selector: 'gf-activities-page',
  styleUrls: ['./activities-page.scss'],
  templateUrl: './activities-page.html'
})
export class ActivitiesPageComponent implements OnDestroy, OnInit {
  public activities: Activity[];
  public defaultAccountId: string;
  public deviceType: string;
  public hasImpersonationId: boolean;
  public hasPermissionToCreateActivity: boolean;
  public hasPermissionToDeleteActivity: boolean;
  public hasPermissionToImportActivities: boolean;
  public routeQueryParams: Subscription;
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
          this.openCreateActivityDialog();
        } else if (params['editDialog']) {
          if (this.activities) {
            const activity = this.activities.find(({ id }) => {
              return id === params['activityId'];
            });

            this.openUpdateActivityDialog(activity);
          } else {
            this.router.navigate(['.'], { relativeTo: this.route });
          }
        } else if (
          params['dataSource'] &&
          params['positionDetailDialog'] &&
          params['symbol']
        ) {
          this.openPositionDialog({
            dataSource: params['dataSource'],
            symbol: params['symbol']
          });
        }
      });
  }

  public ngOnInit() {
    const { globalPermissions } = this.dataService.fetchInfo();

    this.deviceType = this.deviceService.getDeviceInfo().deviceType;

    this.impersonationStorageService
      .onChangeHasImpersonation()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((aId) => {
        this.hasImpersonationId = !!aId;

        this.hasPermissionToImportActivities =
          hasPermission(globalPermissions, permissions.enableImport) &&
          !this.hasImpersonationId;
      });

    this.userService.stateChanged
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((state) => {
        if (state?.user) {
          this.updateUser(state.user);

          this.changeDetectorRef.markForCheck();
        }
      });

    this.fetchActivities();
  }

  public fetchActivities() {
    this.dataService
      .fetchActivities({})
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(({ activities }) => {
        this.activities = activities;

        if (
          this.hasPermissionToCreateActivity &&
          this.activities?.length <= 0
        ) {
          this.router.navigate([], { queryParams: { createDialog: true } });
        }

        this.changeDetectorRef.markForCheck();
      });
  }

  public onCloneActivity(aActivity: Activity) {
    this.openCreateActivityDialog(aActivity);
  }

  public onDeleteActivity(aId: string) {
    this.dataService
      .deleteOrder(aId)
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe({
        next: () => {
          this.fetchActivities();
        }
      });
  }

  public onExport(activityIds?: string[]) {
    this.dataService
      .fetchExport(activityIds)
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
      .fetchExport(activityIds)
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
      data: <ImportActivitiesDialogParams>{
        deviceType: this.deviceType,
        user: this.user
      },
      width: this.deviceType === 'mobile' ? '100vw' : '50rem'
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(() => {
        this.fetchActivities();
      });
  }

  public onUpdateActivity(aActivity: OrderModel) {
    this.router.navigate([], {
      queryParams: { activityId: aActivity.id, editDialog: true }
    });
  }

  public openUpdateActivityDialog(activity: Activity): void {
    const dialogRef = this.dialog.open(CreateOrUpdateActivityDialog, {
      data: {
        activity,
        accounts: this.user?.accounts?.filter((account) => {
          return account.accountType === 'SECURITIES';
        }),
        user: this.user
      },
      height: this.deviceType === 'mobile' ? '97.5vh' : '80vh',
      width: this.deviceType === 'mobile' ? '100vw' : '50rem'
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((data: any) => {
        const transaction: UpdateOrderDto = data?.activity;

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

  private openCreateActivityDialog(aActivity?: Activity): void {
    this.userService
      .get()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((user) => {
        this.updateUser(user);

        const dialogRef = this.dialog.open(CreateOrUpdateActivityDialog, {
          data: {
            accounts: this.user?.accounts?.filter((account) => {
              return account.accountType === 'SECURITIES';
            }),
            activity: {
              ...aActivity,
              accountId: aActivity?.accountId ?? this.defaultAccountId,
              date: new Date(),
              id: null,
              fee: 0,
              quantity: null,
              type: aActivity?.type ?? 'BUY',
              unitPrice: null
            },
            user: this.user
          },
          height: this.deviceType === 'mobile' ? '97.5vh' : '80vh',
          width: this.deviceType === 'mobile' ? '100vw' : '50rem'
        });

        dialogRef
          .afterClosed()
          .pipe(takeUntil(this.unsubscribeSubject))
          .subscribe((data: any) => {
            const transaction: CreateOrderDto = data?.activity;

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

  private openPositionDialog({
    dataSource,
    symbol
  }: {
    dataSource: DataSource;
    symbol: string;
  }) {
    this.userService
      .get()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((user) => {
        this.updateUser(user);

        const dialogRef = this.dialog.open(PositionDetailDialog, {
          autoFocus: false,
          data: <PositionDetailDialogParams>{
            dataSource,
            symbol,
            baseCurrency: this.user?.settings?.baseCurrency,
            colorScheme: this.user?.settings?.colorScheme,
            deviceType: this.deviceType,
            hasImpersonationId: this.hasImpersonationId,
            hasPermissionToReportDataGlitch: hasPermission(
              this.user?.permissions,
              permissions.reportDataGlitch
            ),
            locale: this.user?.settings?.locale
          },
          height: this.deviceType === 'mobile' ? '97.5vh' : '80vh',
          width: this.deviceType === 'mobile' ? '100vw' : '50rem'
        });

        dialogRef
          .afterClosed()
          .pipe(takeUntil(this.unsubscribeSubject))
          .subscribe(() => {
            this.router.navigate(['.'], { relativeTo: this.route });
          });
      });
  }

  private updateUser(aUser: User) {
    this.user = aUser;

    this.defaultAccountId = this.user?.accounts.find((account) => {
      return account.isDefault;
    })?.id;

    this.hasPermissionToCreateActivity = hasPermission(
      this.user.permissions,
      permissions.createOrder
    );
    this.hasPermissionToDeleteActivity = hasPermission(
      this.user.permissions,
      permissions.deleteOrder
    );
  }
}
