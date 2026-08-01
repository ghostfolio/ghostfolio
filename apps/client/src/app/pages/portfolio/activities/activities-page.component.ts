import { IcsService } from '@ghostfolio/client/services/ics/ics.service';
import { ImpersonationStorageService } from '@ghostfolio/client/services/impersonation-storage.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { DEFAULT_PAGE_SIZE } from '@ghostfolio/common/config';
import { downloadAsFile } from '@ghostfolio/common/helper';
import {
  Activity,
  AssetProfileIdentifier,
  User
} from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { internalRoutes } from '@ghostfolio/common/routes/routes';
import { GfActivitiesTableComponent } from '@ghostfolio/ui/activities-table';
import { GfFabComponent } from '@ghostfolio/ui/fab';
import { DataService } from '@ghostfolio/ui/services';

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
  OnInit
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { Sort, SortDirection } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Router, RouterModule } from '@angular/router';
import { format, parseISO } from 'date-fns';
import { DeviceDetectorService } from 'ngx-device-detector';

import { GfImportActivitiesDialogComponent } from './import-activities-dialog/import-activities-dialog.component';
import { ImportActivitiesDialogParams } from './import-activities-dialog/interfaces/interfaces';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    GfActivitiesTableComponent,
    GfFabComponent,
    MatSnackBarModule,
    RouterModule
  ],
  selector: 'gf-activities-page',
  styleUrls: ['./activities-page.scss'],
  templateUrl: './activities-page.html'
})
export class GfActivitiesPageComponent implements OnInit {
  protected dataSource: MatTableDataSource<Activity> | undefined;
  protected deviceType: string;
  protected hasImpersonationId: boolean;
  protected hasPermissionToCreateActivity: boolean;
  protected hasPermissionToDeleteActivity: boolean;
  protected readonly internalRoutes = internalRoutes;
  protected pageIndex = 0;
  protected readonly pageSize = DEFAULT_PAGE_SIZE;
  protected sortColumn = 'date';
  protected sortDirection: SortDirection = 'desc';
  protected totalItems: number | undefined;
  protected user: User;

  private activityTypesFilter: string[] = [];

  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly dataService = inject(DataService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly deviceDetectorService = inject(DeviceDetectorService);
  private readonly dialog = inject(MatDialog);
  private readonly icsService = inject(IcsService);
  private readonly impersonationStorageService = inject(
    ImpersonationStorageService
  );
  private readonly router = inject(Router);
  private readonly userService = inject(UserService);

  public ngOnInit() {
    this.deviceType = this.deviceDetectorService.getDeviceInfo().deviceType;

    this.impersonationStorageService
      .onChangeHasImpersonation()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((impersonationId) => {
        this.hasImpersonationId = !!impersonationId;

        this.changeDetectorRef.markForCheck();
      });

    this.userService.stateChanged
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((state) => {
        if (state?.user) {
          const previousDateRange = this.getDateRange();

          this.updateUser(state.user);

          if (previousDateRange !== this.getDateRange()) {
            this.pageIndex = 0;
          }

          this.fetchActivities();

          this.changeDetectorRef.markForCheck();
        }
      });
  }

  protected onChangePage(page: PageEvent) {
    this.pageIndex = page.pageIndex;

    this.fetchActivities();
  }

  protected onClickActivity({ dataSource, symbol }: AssetProfileIdentifier) {
    this.router.navigate([], {
      queryParams: {
        dataSource,
        symbol,
        holdingDetailDialog: true
      }
    });
  }

  protected onDeleteActivities() {
    this.dataService
      .deleteActivities({
        activityTypes: this.activityTypesFilter.length
          ? this.activityTypesFilter
          : undefined,
        filters: this.userService.getFilters(),
        range: this.getDateRange()
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.userService
          .get(true)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe();

        this.fetchActivities();

        this.changeDetectorRef.markForCheck();
      });
  }

  protected onDeleteActivity(aId: string) {
    this.dataService
      .deleteActivity(aId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.userService
          .get(true)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe();

        this.fetchActivities();

        this.changeDetectorRef.markForCheck();
      });
  }

  protected onExport(activityIds?: string[]) {
    let fetchExportParams: any = { activityIds };

    if (!activityIds) {
      fetchExportParams = {
        activityTypes: this.activityTypesFilter.length
          ? this.activityTypesFilter
          : undefined,
        filters: this.userService.getFilters(),
        range: this.getDateRange()
      };
    }

    this.dataService
      .fetchExport(fetchExportParams)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((data) => {
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

  protected onExportDrafts(activityIds?: string[]) {
    this.dataService
      .fetchExport({ activityIds, withActivityIds: true })
      .pipe(takeUntilDestroyed(this.destroyRef))
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

  protected onImport() {
    const dialogRef = this.dialog.open<
      GfImportActivitiesDialogComponent,
      ImportActivitiesDialogParams
    >(GfImportActivitiesDialogComponent, {
      data: {
        deviceType: this.deviceType,
        user: this.user
      },
      height: this.deviceType === 'mobile' ? '98vh' : undefined,
      width: this.deviceType === 'mobile' ? '100vw' : '50rem'
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.userService
          .get(true)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe();

        this.fetchActivities();

        this.changeDetectorRef.markForCheck();
      });
  }

  protected onImportDividends() {
    const dialogRef = this.dialog.open<
      GfImportActivitiesDialogComponent,
      ImportActivitiesDialogParams
    >(GfImportActivitiesDialogComponent, {
      data: {
        activityTypes: ['DIVIDEND'],
        deviceType: this.deviceType,
        user: this.user
      },
      height: this.deviceType === 'mobile' ? '98vh' : undefined,
      width: this.deviceType === 'mobile' ? '100vw' : '50rem'
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.userService
          .get(true)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe();

        this.fetchActivities();

        this.changeDetectorRef.markForCheck();
      });
  }

  protected onSortChanged({ active, direction }: Sort) {
    this.pageIndex = 0;
    this.sortColumn = active;
    this.sortDirection = direction;

    this.fetchActivities();
  }

  protected onTypesFilterChanged(aTypes: string[]) {
    this.activityTypesFilter = aTypes;
    this.pageIndex = 0;

    this.fetchActivities();
  }

  private fetchActivities() {
    // Reset dataSource and totalItems to show loading state
    this.dataSource = undefined;
    this.totalItems = undefined;

    this.dataService
      .fetchActivities({
        activityTypes: this.activityTypesFilter.length
          ? this.activityTypesFilter
          : undefined,
        filters: this.userService.getFilters(),
        range: this.getDateRange(),
        skip: this.pageIndex * this.pageSize,
        sortColumn: this.sortColumn,
        sortDirection: this.sortDirection,
        take: this.pageSize
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ activities, count }) => {
        this.dataSource = new MatTableDataSource(activities);
        this.totalItems = count;

        if (
          this.hasPermissionToCreateActivity &&
          this.user?.activitiesCount === 0
        ) {
          void this.router.navigate(
            internalRoutes.portfolio.subRoutes.activities.subRoutes.create
              .routerLink
          );
        }

        this.changeDetectorRef.markForCheck();
      });
  }

  private getDateRange() {
    const dateRange = this.user?.settings?.dateRange;

    // Omit the date ranges which do not apply to activities: '1d' spans today
    // only, while 'max' would exclude drafts dated in the future
    if (!dateRange || ['1d', 'max'].includes(dateRange)) {
      return undefined;
    }

    return dateRange;
  }

  private updateUser(aUser: User) {
    this.user = aUser;

    this.hasPermissionToCreateActivity =
      !this.hasImpersonationId &&
      hasPermission(this.user.permissions, permissions.createActivity);
    this.hasPermissionToDeleteActivity =
      !this.hasImpersonationId &&
      hasPermission(this.user.permissions, permissions.deleteActivity);
  }
}
