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
import { hasScope, scopes } from '@ghostfolio/common/scopes';
import { Type as ActivityType } from '@ghostfolio/prisma/enums';
import { GfActivitiesTableComponent } from '@ghostfolio/ui/activities-table';
import { GfFabComponent } from '@ghostfolio/ui/fab';
import { translate } from '@ghostfolio/ui/i18n';
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
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
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
    MatButtonModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatNativeDateModule,
    MatSelectModule,
    MatSnackBarModule,
    ReactiveFormsModule,
    RouterModule
  ],
  selector: 'gf-activities-page',
  styleUrls: ['./activities-page.scss'],
  templateUrl: './activities-page.html'
})
export class GfActivitiesPageComponent implements OnInit {
  protected accountOptions: { id: string; name: string }[] = [];
  protected activityTypeOptions: { key: ActivityType; label: string }[] = [];
  protected dataSource: MatTableDataSource<Activity> | undefined;
  protected deviceType: string;
  protected filterForm: FormGroup;
  protected hasImpersonationId: boolean;
  protected hasPermissionToCreateActivity: boolean;
  protected hasPermissionToDeleteActivity: boolean;
  protected hasPermissionToUpdateActivity: boolean;
  protected holdingOptions: { symbol: string; name: string }[] = [];
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
  private readonly fb = inject(FormBuilder);
  private readonly icsService = inject(IcsService);
  private readonly impersonationStorageService = inject(
    ImpersonationStorageService
  );
  private readonly router = inject(Router);
  private readonly userService = inject(UserService);

  protected get hasPermissionToImportActivities() {
    // An import always writes to the own portfolio, hence it is not available
    // while the user impersonates a different user
    return this.hasPermissionToCreateActivity && !this.hasImpersonationId;
  }

  public ngOnInit() {
    this.deviceType = this.deviceDetectorService.getDeviceInfo().deviceType;

    this.filterForm = this.fb.group({
      symbols: [[]],
      type: [null],
      startDate: [null],
      endDate: [null],
      accountId: [null]
    });

    for (const type of Object.keys(ActivityType) as ActivityType[]) {
      this.activityTypeOptions.push({ key: type, label: translate(type) });
    }
    this.activityTypeOptions.sort((a, b) => a.label.localeCompare(b.label));

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

          this.accountOptions = (this.user.accounts ?? []).map((a) => ({
            id: a.id,
            name: a.name ?? ''
          }));

          this.dataService
            .fetchPortfolioHoldings()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((response) => {
              this.holdingOptions = (response.holdings ?? [])
                .map((h) => ({
                  symbol: h.assetProfile.symbol,
                  name: h.assetProfile.name ?? h.assetProfile.symbol
                }))
                .sort((a, b) => a.symbol.localeCompare(b.symbol));
              this.changeDetectorRef.markForCheck();
            });

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

  protected onFilterChanged() {
    this.pageIndex = 0;
    this.fetchActivities();
  }

  protected onClearFilters() {
    this.filterForm.reset({
      accountId: null,
      endDate: null,
      startDate: null,
      symbols: [],
      type: null
    });
    this.pageIndex = 0;
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

    const filterValues = this.filterForm?.value ?? {};
    const selectedSymbols: string[] = filterValues.symbols ?? [];
    const selectedType: string = filterValues.type ?? null;
    const startDate: Date = filterValues.startDate ?? null;
    const endDate: Date = filterValues.endDate ?? null;
    const selectedAccountId: string = filterValues.accountId ?? null;

    const extraFilters = this.userService.getFilters();

    if (selectedAccountId) {
      extraFilters.push({ id: selectedAccountId, type: 'ACCOUNT' });
    }

    this.dataService
      .fetchActivities({
        activityTypes: selectedType
          ? [selectedType]
          : this.activityTypesFilter.length
            ? this.activityTypesFilter
            : undefined,
        endDate: endDate ?? undefined,
        filters: extraFilters,
        // An explicit start or end date takes the place of the date range
        range: startDate || endDate ? undefined : this.getDateRange(),
        skip: this.pageIndex * this.pageSize,
        sortColumn: this.sortColumn,
        sortDirection: this.sortDirection,
        startDate: startDate ?? undefined,
        symbols: selectedSymbols.length ? selectedSymbols : undefined,
        take: this.pageSize
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ activities, count }) => {
        this.dataSource = new MatTableDataSource(activities);
        this.totalItems = count;

        if (
          !this.hasImpersonationId &&
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
      hasPermission(this.user.permissions, permissions.createActivity) &&
      hasScope(this.user.scopes, scopes.activityCreate) &&
      !this.user.settings?.isRestrictedView;

    this.hasPermissionToDeleteActivity =
      hasPermission(this.user.permissions, permissions.deleteActivity) &&
      hasScope(this.user.scopes, scopes.activityDelete) &&
      !this.user.settings?.isRestrictedView;

    this.hasPermissionToUpdateActivity =
      hasPermission(this.user.permissions, permissions.updateActivity) &&
      hasScope(this.user.scopes, scopes.activityUpdate) &&
      !this.user.settings?.isRestrictedView;
  }
}
