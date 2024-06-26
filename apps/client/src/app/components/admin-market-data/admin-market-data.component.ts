import { AdminService } from '@ghostfolio/client/services/admin.service';
import { DataService } from '@ghostfolio/client/services/data.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import {
  DEFAULT_PAGE_SIZE,
  ghostfolioScraperApiSymbolPrefix
} from '@ghostfolio/common/config';
import { getDateFormatString } from '@ghostfolio/common/helper';
import { Filter, UniqueAsset, User } from '@ghostfolio/common/interfaces';
import { AdminMarketDataItem } from '@ghostfolio/common/interfaces/admin-market-data.interface';
import { translate } from '@ghostfolio/ui/i18n';

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
  templateUrl: './admin-market-data.html'
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
        type: <Filter['type']>'ASSET_SUB_CLASS'
      };
    })
    .concat([
      {
        id: 'BENCHMARKS',
        label: $localize`Benchmarks`,
        type: <Filter['type']>'PRESET_ID'
      },
      {
        id: 'CURRENCIES',
        label: $localize`Currencies`,
        type: <Filter['type']>'PRESET_ID'
      },
      {
        id: 'ETF_WITHOUT_COUNTRIES',
        label: $localize`ETFs without Countries`,
        type: <Filter['type']>'PRESET_ID'
      },
      {
        id: 'ETF_WITHOUT_SECTORS',
        label: $localize`ETFs without Sectors`,
        type: <Filter['type']>'PRESET_ID'
      }
    ]);
  public benchmarks: Partial<SymbolProfile>[];
  public currentDataSource: DataSource;
  public currentSymbol: string;
  public dataSource: MatTableDataSource<AdminMarketDataItem> =
    new MatTableDataSource();
  public defaultDateFormat: string;
  public deviceType: string;
  public displayedColumns = [
    'nameWithSymbol',
    'dataSource',
    'assetClass',
    'assetSubClass',
    'date',
    'activitiesCount',
    'marketDataItemCount',
    'sectorsCount',
    'countriesCount',
    'comment',
    'actions'
  ];
  public filters$ = new Subject<Filter[]>();
  public ghostfolioScraperApiSymbolPrefix = ghostfolioScraperApiSymbolPrefix;
  public isLoading = false;
  public isUUID = isUUID;
  public placeholder = '';
  public pageSize = DEFAULT_PAGE_SIZE;
  public totalItems = 0;
  public user: User;

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private adminMarketDataService: AdminMarketDataService,
    private adminService: AdminService,
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService,
    private deviceService: DeviceDetectorService,
    private dialog: MatDialog,
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserService
  ) {
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
  }

  public onChangePage(page: PageEvent) {
    this.loadData({
      pageIndex: page.pageIndex,
      sortColumn: this.sort.active,
      sortDirection: this.sort.direction
    });
  }

  public onDeleteProfileData({ dataSource, symbol }: UniqueAsset) {
    this.adminMarketDataService.deleteProfileData({ dataSource, symbol });
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
      .subscribe(() => {});
  }

  public onGatherProfileDataBySymbol({ dataSource, symbol }: UniqueAsset) {
    this.adminService
      .gatherProfileDataBySymbol({ dataSource, symbol })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(() => {});
  }

  public onGatherSymbol({ dataSource, symbol }: UniqueAsset) {
    this.adminService
      .gatherSymbol({ dataSource, symbol })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(() => {});
  }

  public onOpenAssetProfileDialog({ dataSource, symbol }: UniqueAsset) {
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
          data: <AssetProfileDialogParams>{
            dataSource,
            symbol,
            colorScheme: this.user?.settings.colorScheme,
            deviceType: this.deviceType,
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

  private openCreateAssetProfileDialog() {
    this.userService
      .get()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((user) => {
        this.user = user;

        const dialogRef = this.dialog.open(CreateAssetProfileDialog, {
          autoFocus: false,
          data: <CreateAssetProfileDialogParams>{
            deviceType: this.deviceType,
            locale: this.user?.settings?.locale
          },
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
