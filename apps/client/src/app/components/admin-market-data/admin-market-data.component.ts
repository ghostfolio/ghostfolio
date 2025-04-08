import { AdminService } from '@ghostfolio/client/services/admin.service';
import { DataService } from '@ghostfolio/client/services/data.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import {
  DEFAULT_PAGE_SIZE,
  ghostfolioScraperApiSymbolPrefix
} from '@ghostfolio/common/config';
import { getDateFormatString } from '@ghostfolio/common/helper';
import {
  AssetProfileIdentifier,
  Filter,
  InfoItem,
  User
} from '@ghostfolio/common/interfaces';
import { AdminMarketDataItem } from '@ghostfolio/common/interfaces/admin-market-data.interface';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { translate } from '@ghostfolio/ui/i18n';

import { SelectionModel } from '@angular/cdk/collections';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSort, Sort, SortDirection } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { ActivatedRoute, Router } from '@angular/router';
import { AssetSubClass, DataSource, SymbolProfile } from '@prisma/client';
import { isUUID } from 'class-validator';
import { DeviceDetectorService } from 'ngx-device-detector';
import { Subject } from 'rxjs';
import { distinctUntilChanged, switchMap, takeUntil } from 'rxjs/operators';

import { AdminMarketDataService } from './admin-market-data.service';
import { AssetProfileDialog } from './asset-profile-dialog/asset-profile-dialog.component';
import { AssetProfileDialogParams } from './asset-profile-dialog/interfaces/interfaces';
import { CreateAssetProfileDialog } from './create-asset-profile-dialog/create-asset-profile-dialog.component';
import { CreateAssetProfileDialogParams } from './create-asset-profile-dialog/interfaces/interfaces';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'has-fab' },
  selector: 'gf-admin-market-data',
  styleUrls: ['./admin-market-data.scss'],
  templateUrl: './admin-market-data.html',
  standalone: false
})
export class AdminMarketDataComponent
  implements AfterViewInit, OnDestroy, OnInit
{
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  public activeFilters: Filter[] = [];
  public allFilters: Filter[] = [
    AssetSubClass.BOND,
    AssetSubClass.COMMODITY,
    AssetSubClass.CRYPTOCURRENCY,
    AssetSubClass.ETF,
    AssetSubClass.MUTUALFUND,
    AssetSubClass.PRECIOUS_METAL,
    AssetSubClass.PRIVATE_EQUITY,
    AssetSubClass.STOCK
  ]
    .map((assetSubClass) => {
      return {
        id: assetSubClass.toString(),
        label: translate(assetSubClass),
        type: 'ASSET_SUB_CLASS' as Filter['type']
      };
    })
    .concat([
      {
        id: 'BENCHMARKS',
        label: $localize`Benchmarks`,
        type: 'PRESET_ID' as Filter['type']
      },
      {
        id: 'CURRENCIES',
        label: $localize`Currencies`,
        type: 'PRESET_ID' as Filter['type']
      },
      {
        id: 'ETF_WITHOUT_COUNTRIES',
        label: $localize`ETFs without Countries`,
        type: 'PRESET_ID' as Filter['type']
      },
      {
        id: 'ETF_WITHOUT_SECTORS',
        label: $localize`ETFs without Sectors`,
        type: 'PRESET_ID' as Filter['type']
      }
    ]);
  public benchmarks: Partial<SymbolProfile>[];
  public currentDataSource: DataSource;
  public currentSymbol: string;
  public dataSource = new MatTableDataSource<AdminMarketDataItem>();
  public defaultDateFormat: string;
  public deviceType: string;
  public displayedColumns: string[] = [];
  public filters$ = new Subject<Filter[]>();
  public ghostfolioScraperApiSymbolPrefix = ghostfolioScraperApiSymbolPrefix;
  public hasPermissionForSubscription: boolean;
  public info: InfoItem;
  public isLoading = false;
  public isUUID = isUUID;
  public placeholder = '';
  public pageSize = DEFAULT_PAGE_SIZE;
  public selection: SelectionModel<Partial<SymbolProfile>>;
  public totalItems = 0;
  public user: User;

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    public adminMarketDataService: AdminMarketDataService,
    private adminService: AdminService,
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService,
    private deviceService: DeviceDetectorService,
    private dialog: MatDialog,
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserService
  ) {
    this.info = this.dataService.fetchInfo();

    this.hasPermissionForSubscription = hasPermission(
      this.info?.globalPermissions,
      permissions.enableSubscription
    );

    this.displayedColumns = [
      'status',
      'select',
      'nameWithSymbol',
      'dataSource',
      'assetClass',
      'assetSubClass',
      'lastMarketPrice',
      'date',
      'activitiesCount',
      'marketDataItemCount',
      'sectorsCount',
      'countriesCount'
    ];

    if (this.hasPermissionForSubscription) {
      this.displayedColumns.push('isUsedByUsersWithSubscription');
    }

    this.displayedColumns.push('comment');
    this.displayedColumns.push('actions');

    this.route.queryParams
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((params) => {
        if (
          params['assetProfileDialog'] &&
          params['dataSource'] &&
          params['symbol']
        ) {
          this.openAssetProfileDialog({
            dataSource: params['dataSource'],
            symbol: params['symbol']
          });
        } else if (params['createAssetProfileDialog']) {
          this.openCreateAssetProfileDialog();
        }
      });

    this.userService.stateChanged
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((state) => {
        if (state?.user) {
          this.user = state.user;

          this.defaultDateFormat = getDateFormatString(
            this.user.settings.locale
          );
        }
      });

    this.filters$
      .pipe(distinctUntilChanged(), takeUntil(this.unsubscribeSubject))
      .subscribe((filters) => {
        this.activeFilters = filters;

        this.loadData();
      });
  }

  public ngAfterViewInit() {
    this.sort.sortChange.subscribe(
      ({ active: sortColumn, direction }: Sort) => {
        this.paginator.pageIndex = 0;

        this.loadData({
          sortColumn,
          sortDirection: direction,
          pageIndex: this.paginator.pageIndex
        });
      }
    );
  }

  public ngOnInit() {
    const { benchmarks } = this.dataService.fetchInfo();

    this.benchmarks = benchmarks;
    this.deviceType = this.deviceService.getDeviceInfo().deviceType;

    this.selection = new SelectionModel(true);
  }

  public onChangePage(page: PageEvent) {
    this.loadData({
      pageIndex: page.pageIndex,
      sortColumn: this.sort.active,
      sortDirection: this.sort.direction
    });
  }

  public onDeleteAssetProfile({ dataSource, symbol }: AssetProfileIdentifier) {
    this.adminMarketDataService.deleteAssetProfile({ dataSource, symbol });
  }

  public onDeleteAssetProfiles() {
    this.adminMarketDataService.deleteAssetProfiles(
      this.selection.selected.map(({ dataSource, symbol }) => {
        return { dataSource, symbol };
      })
    );
  }

  public onGather7Days() {
    this.adminService
      .gather7Days()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(() => {
        setTimeout(() => {
          window.location.reload();
        }, 300);
      });
  }

  public onGatherMax() {
    this.adminService
      .gatherMax()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(() => {
        setTimeout(() => {
          window.location.reload();
        }, 300);
      });
  }

  public onGatherProfileData() {
    this.adminService
      .gatherProfileData()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe();
  }

  public onGatherProfileDataBySymbol({
    dataSource,
    symbol
  }: AssetProfileIdentifier) {
    this.adminService
      .gatherProfileDataBySymbol({ dataSource, symbol })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe();
  }

  public onGatherSymbol({ dataSource, symbol }: AssetProfileIdentifier) {
    this.adminService
      .gatherSymbol({ dataSource, symbol })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe();
  }

  public onOpenAssetProfileDialog({
    dataSource,
    symbol
  }: AssetProfileIdentifier) {
    this.router.navigate([], {
      queryParams: {
        dataSource,
        symbol,
        assetProfileDialog: true
      }
    });
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }

  private loadData(
    {
      pageIndex,
      sortColumn,
      sortDirection
    }: {
      pageIndex: number;
      sortColumn?: string;
      sortDirection?: SortDirection;
    } = { pageIndex: 0 }
  ) {
    this.isLoading = true;

    this.pageSize =
      this.activeFilters.length === 1 &&
      this.activeFilters[0].type === 'PRESET_ID'
        ? undefined
        : DEFAULT_PAGE_SIZE;

    if (pageIndex === 0 && this.paginator) {
      this.paginator.pageIndex = 0;
    }

    this.placeholder =
      this.activeFilters.length <= 0 ? $localize`Filter by...` : '';

    this.selection.clear();

    this.adminService
      .fetchAdminMarketData({
        sortColumn,
        sortDirection,
        filters: this.activeFilters,
        skip: pageIndex * this.pageSize,
        take: this.pageSize
      })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(({ count, marketData }) => {
        this.totalItems = count;

        this.dataSource = new MatTableDataSource(
          marketData.map((marketDataItem) => {
            return {
              ...marketDataItem,
              isBenchmark: this.benchmarks.some(({ id }) => {
                return id === marketDataItem.id;
              })
            };
          })
        );
        this.dataSource.sort = this.sort;

        this.isLoading = false;

        this.changeDetectorRef.markForCheck();
      });
  }

  private openAssetProfileDialog({
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
        this.user = user;

        const dialogRef = this.dialog.open(AssetProfileDialog, {
          autoFocus: false,
          data: {
            dataSource,
            symbol,
            colorScheme: this.user?.settings.colorScheme,
            deviceType: this.deviceType,
            locale: this.user?.settings?.locale
          } as AssetProfileDialogParams,
          height: this.deviceType === 'mobile' ? '98vh' : '80vh',
          width: this.deviceType === 'mobile' ? '100vw' : '50rem'
        });

        dialogRef
          .afterClosed()
          .pipe(takeUntil(this.unsubscribeSubject))
          .subscribe(
            (newAssetProfileIdentifier: AssetProfileIdentifier | undefined) => {
              if (newAssetProfileIdentifier) {
                this.onOpenAssetProfileDialog(newAssetProfileIdentifier);
              } else {
                this.router.navigate(['.'], { relativeTo: this.route });
              }
            }
          );
      });
  }

  private openCreateAssetProfileDialog() {
    this.userService
      .get()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((user) => {
        this.user = user;

        const dialogRef = this.dialog.open(CreateAssetProfileDialog, {
          autoFocus: false,
          data: {
            deviceType: this.deviceType,
            locale: this.user?.settings?.locale
          } as CreateAssetProfileDialogParams,
          width: this.deviceType === 'mobile' ? '100vw' : '50rem'
        });

        dialogRef
          .afterClosed()
          .pipe(takeUntil(this.unsubscribeSubject))
          .subscribe(({ dataSource, symbol } = {}) => {
            if (dataSource && symbol) {
              this.adminService
                .addAssetProfile({ dataSource, symbol })
                .pipe(
                  switchMap(() => {
                    this.isLoading = true;
                    this.changeDetectorRef.markForCheck();

                    return this.adminService.fetchAdminMarketData({
                      filters: this.activeFilters,
                      take: this.pageSize
                    });
                  }),
                  takeUntil(this.unsubscribeSubject)
                )
                .subscribe(({ marketData }) => {
                  this.dataSource = new MatTableDataSource(marketData);
                  this.dataSource.sort = this.sort;
                  this.isLoading = false;

                  this.changeDetectorRef.markForCheck();
                });
            }

            this.router.navigate(['.'], { relativeTo: this.route });
          });
      });
  }
}
