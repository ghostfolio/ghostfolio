import { IcsService } from '@ghostfolio/client/services/ics/ics.service';
import { ImpersonationStorageService } from '@ghostfolio/client/services/impersonation-storage.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { getIntervalFromDateRange } from '@ghostfolio/common/calculation-helper';
import { DEFAULT_PAGE_SIZE } from '@ghostfolio/common/config';
import { downloadAsFile } from '@ghostfolio/common/helper';
import {
  Activity,
  CashManagementSnapshot,
  AssetProfileIdentifier,
  User
} from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { internalRoutes } from '@ghostfolio/common/routes/routes';
import { hasScope, scopes } from '@ghostfolio/common/scopes';
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
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { Sort, SortDirection } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Router, RouterModule } from '@angular/router';
import { format, parseISO } from 'date-fns';
import { DeviceDetectorService } from 'ngx-device-detector';
import { forkJoin, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

import { GfCashActivityDialogComponent } from './cash-activity-dialog.component';
import { GfImportActivitiesDialogComponent } from './import-activities-dialog/import-activities-dialog.component';
import {
  ImportActivitiesDialogParams,
  ImportActivitiesDialogResult
} from './import-activities-dialog/interfaces/interfaces';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    GfActivitiesTableComponent,
    GfFabComponent,
    MatSnackBarModule,
    MatButtonModule,
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
  protected hasPermissionToUpdateActivity: boolean;
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

  protected get hasPermissionToImportActivities() {
    // An import always writes to the own portfolio, hence it is not available
    // while the user impersonates a different user
    return this.hasPermissionToCreateActivity && !this.hasImpersonationId;
  }

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

  protected get canManageCash() {
    return (
      !!this.user &&
      !this.hasImpersonationId &&
      !this.user.settings?.isRestrictedView &&
      hasPermission(this.user.permissions, permissions.updateAccount) &&
      hasScope(this.user.scopes, scopes.accountUpdate) &&
      hasScope(this.user.scopes, scopes.portfolioReadValues)
    );
  }
  protected onCashTransactionEdited(transaction?: Activity['cashTransaction']) {
    if (!this.canManageCash) return;
    const dialog = this.dialog.open(GfCashActivityDialogComponent, {
      data: {
        user: this.user,
        accountId: transaction?.accountId,
        eventId: transaction?.eventId
      },
      width: '65rem',
      maxWidth: '98vw'
    });
    dialog
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.userService
          .get(true)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe();
      });
  }

  protected onDeleteActivity(aId: string) {
    const transaction = this.dataSource?.data.find(
      ({ id }) => id === aId
    )?.cashTransaction;
    if (transaction) {
      this.dataService
        .deleteCashEvent(
          transaction.accountId,
          transaction.eventId,
          transaction.revision
        )
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => {
          this.userService.get(true).subscribe();
          this.fetchActivities();
        });
      return;
    }
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
      ImportActivitiesDialogParams,
      ImportActivitiesDialogResult
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
      .subscribe(({ withRefresh } = { withRefresh: false }) => {
        if (withRefresh) {
          this.userService
            .get(true)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe();

          this.fetchActivities();

          this.changeDetectorRef.markForCheck();
        }
      });
  }

  protected onImportDividends() {
    const dialogRef = this.dialog.open<
      GfImportActivitiesDialogComponent,
      ImportActivitiesDialogParams,
      ImportActivitiesDialogResult
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
      .subscribe(({ withRefresh } = { withRefresh: false }) => {
        if (withRefresh) {
          this.userService
            .get(true)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe();

          this.fetchActivities();

          this.changeDetectorRef.markForCheck();
        }
      });
  }

  protected onSortChanged({ active, direction }: Sort) {
    this.pageIndex = 0;
    this.sortColumn = active;
    this.sortDirection = direction || 'desc';

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
        skip: 0,
        sortColumn: this.sortColumn,
        sortDirection: this.sortDirection,
        take: (this.pageIndex + 1) * this.pageSize
      })
      .pipe(
        switchMap((response) =>
          this.fetchCashTransactions().pipe(
            map((cash) => {
              const all = [...response.activities, ...cash];
              const key = (activity: Activity): string | number =>
                this.sortColumn === 'date'
                  ? new Date(activity.date).getTime()
                  : this.sortColumn === 'name'
                    ? (activity.assetProfile.name ?? '')
                    : this.sortColumn === 'account'
                      ? (activity.account?.name ?? '')
                      : (activity[this.sortColumn] ?? '');
              all.sort((a, b) => {
                const x = key(a),
                  y = key(b);
                const result =
                  x < y ? -1 : x > y ? 1 : a.id.localeCompare(b.id);
                return this.sortDirection === 'asc' ? result : -result;
              });
              return {
                activities: all.slice(
                  this.pageIndex * this.pageSize,
                  (this.pageIndex + 1) * this.pageSize
                ),
                count: response.count + cash.length
              };
            })
          )
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(({ activities, count }) => {
        this.dataSource = new MatTableDataSource(activities);
        this.totalItems = count;

        this.changeDetectorRef.markForCheck();
      });
  }

  private fetchCashTransactions() {
    const filters = this.userService.getFilters() ?? [];
    const accountIds = filters
      .filter(({ type }) => type === 'ACCOUNT')
      .map(({ id }) => id);
    if (
      this.user.settings?.isRestrictedView ||
      this.activityTypesFilter.length ||
      !hasScope(this.user.scopes, scopes.accountRead) ||
      !hasScope(this.user.scopes, scopes.portfolioReadValues) ||
      filters.some(
        ({ type, id }) =>
          !['ACCOUNT', 'ASSET_CLASS'].includes(type) ||
          (type === 'ASSET_CLASS' && id !== 'LIQUIDITY')
      )
    )
      return of([] as Activity[]);
    const accounts = this.user.accounts.filter(
      (account) =>
        account.currency &&
        (!accountIds.length || accountIds.includes(account.id))
    );
    if (!accounts.length) return of([] as Activity[]);
    const range = this.getDateRange();
    const interval = range
      ? getIntervalFromDateRange({ dateRange: range })
      : undefined;
    return forkJoin(
      accounts.map((account) =>
        this.dataService.fetchCashManagement(account.id).pipe(
          map((snapshot: CashManagementSnapshot) =>
            (snapshot?.events ?? [])
              .filter((event) => !event.orderId && !event.transferId)
              .map((event) => {
                const date = new Date(`${event.date}T00:00:00Z`);
                const amount = Number(
                  event.type === 'CHECKPOINT' ? event.balance : event.amount
                );
                const operation =
                  event.type === 'CHECKPOINT'
                    ? 'CHECKPOINT'
                    : amount < 0
                      ? 'WITHDRAWAL'
                      : 'DEPOSIT';
                const label =
                  operation === 'CHECKPOINT'
                    ? $localize`Reconciliation`
                    : operation === 'WITHDRAWAL'
                      ? $localize`Withdrawal`
                      : $localize`Deposit`;
                return {
                  id: `cash:${event.id}`,
                  account,
                  accountId: account.id,
                  accountUserId: account.userId,
                  userId: account.userId,
                  date,
                  createdAt: date,
                  updatedAt: date,
                  comment: event.comment,
                  currency: account.currency,
                  quantity: null,
                  unitPrice: null,
                  fee: Number(event.fee ?? 0),
                  type: 'FEE',
                  value: amount,
                  valueInBaseCurrency:
                    amount * (snapshot.exchangeRateToBaseCurrency ?? 1),
                  assetProfile: {
                    name: label,
                    symbol: '',
                    dataSource: 'MANUAL',
                    currency: account.currency
                  },
                  cashTransaction: {
                    accountId: account.id,
                    eventId: event.id,
                    operation,
                    revision: snapshot.revision
                  }
                } as unknown as Activity;
              })
              .filter(
                (activity) =>
                  !interval ||
                  (activity.date >= interval.startDate &&
                    activity.date <= interval.endDate)
              )
          )
        )
      )
    ).pipe(map((rows) => rows.flat()));
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
