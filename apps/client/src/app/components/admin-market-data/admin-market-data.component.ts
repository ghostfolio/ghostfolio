import { UserService } from '@ghostfolio/client/services/user/user.service';
import { DEFAULT_PAGE_SIZE } from '@ghostfolio/common/config';
import { canDeleteAssetProfile } from '@ghostfolio/common/helper';
import {
  AssetProfileIdentifier,
  AssetProfileItem,
  Filter,
  InfoItem,
  User
} from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { internalRoutes } from '@ghostfolio/common/routes/routes';
import { GfActivitiesFilterComponent } from '@ghostfolio/ui/activities-filter';
import { GfFabComponent } from '@ghostfolio/ui/fab';
import { translate } from '@ghostfolio/ui/i18n';
import { GfPremiumIndicatorComponent } from '@ghostfolio/ui/premium-indicator';
import { AdminService, DataService } from '@ghostfolio/ui/services';
import { GfValueComponent } from '@ghostfolio/ui/value';

import { SelectionModel } from '@angular/cdk/collections';
import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
  OnInit,
  viewChild
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatMenuModule } from '@angular/material/menu';
import {
  MatPaginator,
  MatPaginatorModule,
  PageEvent
} from '@angular/material/paginator';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import {
  MatSort,
  MatSortModule,
  Sort,
  SortDirection
} from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { Router, RouterModule } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { AssetSubClass, DataSource, SymbolProfile } from '@prisma/client';
import { isUUID } from 'class-validator';
import { addIcons } from 'ionicons';
import {
  addOutline,
  banOutline,
  createOutline,
  documentTextOutline,
  ellipsisHorizontal,
  ellipsisVertical,
  trashOutline
} from 'ionicons/icons';
import ms from 'ms';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { Subject } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';

import { AdminMarketDataService } from './admin-market-data.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    GfActivitiesFilterComponent,
    GfFabComponent,
    GfPremiumIndicatorComponent,
    GfValueComponent,
    IonIcon,
    MatButtonModule,
    MatCheckboxModule,
    MatMenuModule,
    MatPaginatorModule,
    MatSnackBarModule,
    MatSortModule,
    MatTableModule,
    NgxSkeletonLoaderModule,
    RouterModule
  ],
  providers: [AdminMarketDataService],
  selector: 'gf-admin-market-data',
  styleUrls: ['./admin-market-data.scss'],
  templateUrl: './admin-market-data.html'
})
export class GfAdminMarketDataComponent implements AfterViewInit, OnInit {
  protected readonly adminMarketDataService = inject(AdminMarketDataService);

  protected readonly allFilters: Filter[] = [
    ...Object.keys(AssetSubClass)
      .filter((assetSubClass) => {
        return assetSubClass !== 'CASH';
      })
      .map((assetSubClass) => {
        return {
          id: assetSubClass.toString(),
          label: translate(assetSubClass),
          type: 'ASSET_SUB_CLASS' as Filter['type']
        };
      }),
    ...Object.keys(DataSource).map((dataSource) => {
      return {
        id: dataSource.toString(),
        label: dataSource,
        type: 'DATA_SOURCE' as Filter['type']
      };
    }),
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
    },
    {
      id: 'NO_ACTIVITIES',
      label: $localize`No Activities`,
      type: 'PRESET_ID' as Filter['type']
    }
  ];
  protected readonly canDeleteAssetProfile = canDeleteAssetProfile;
  protected dataSource = new MatTableDataSource<AssetProfileItem>();
  protected readonly displayedColumns: string[] = [];
  protected readonly filters$ = new Subject<Filter[]>();
  protected readonly internalRoutes = internalRoutes;
  protected isLoading = true;
  protected readonly isUUID = isUUID;
  protected pageSize = DEFAULT_PAGE_SIZE;
  protected placeholder = '';
  protected readonly selection = new SelectionModel<AssetProfileItem>(true);
  protected totalItems = 0;
  protected readonly translate = translate;
  protected user: User;

  private activeFilters: Filter[] = [];
  private benchmarks: Partial<SymbolProfile>[];
  private readonly hasPermissionForSubscription: boolean;
  private readonly info: InfoItem;
  private readonly paginator = viewChild.required(MatPaginator);
  private readonly sort = viewChild.required(MatSort);

  private readonly adminService = inject(AdminService);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly dataService = inject(DataService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly userService = inject(UserService);

  public constructor() {
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

    this.adminMarketDataService.refresh$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.reloadData();
      });

    this.userService.stateChanged
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((state) => {
        if (state?.user) {
          this.user = state.user;
        }
      });

    this.filters$
      .pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((filters) => {
        this.activeFilters = filters;

        this.reloadData({ pageIndex: 0 });
      });

    addIcons({
      addOutline,
      banOutline,
      createOutline,
      documentTextOutline,
      ellipsisHorizontal,
      ellipsisVertical,
      trashOutline
    });
  }

  public ngAfterViewInit() {
    this.sort().sortChange.subscribe(
      ({ active: sortColumn, direction }: Sort) => {
        this.paginator().pageIndex = 0;

        this.loadData({
          sortColumn,
          sortDirection: direction,
          pageIndex: this.paginator().pageIndex
        });
      }
    );
  }

  public ngOnInit() {
    const { benchmarks } = this.dataService.fetchInfo();

    this.benchmarks = benchmarks;
  }

  protected onChangePage(page: PageEvent) {
    this.loadData({
      pageIndex: page.pageIndex,
      sortColumn: this.sort().active,
      sortDirection: this.sort().direction
    });
  }

  protected onDeleteAssetProfile({
    dataSource,
    symbol
  }: AssetProfileIdentifier) {
    this.adminMarketDataService
      .deleteAssetProfile({ dataSource, symbol })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.reloadData();
      });
  }

  protected onDeleteAssetProfiles() {
    this.adminMarketDataService
      .deleteAssetProfiles(
        this.selection.selected.map(({ dataSource, symbol }) => {
          return { dataSource, symbol };
        })
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.reloadData();
      });
  }

  protected onGatherMax() {
    this.adminService
      .gatherMax()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.notifyDataGatheringHasBeenStarted();
      });
  }

  protected onGatherProfileData() {
    this.adminService
      .gatherProfileData()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.notifyDataGatheringHasBeenStarted();
      });
  }

  protected onGatherRecentMarketData() {
    this.adminService
      .gatherRecentMarketData()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.notifyDataGatheringHasBeenStarted();
      });
  }

  protected onOpenAssetProfileDialog({
    dataSource,
    symbol
  }: AssetProfileIdentifier) {
    void this.router.navigate(
      internalRoutes.adminControl.subRoutes.marketData.subRoutes.update.routerLink(
        dataSource,
        symbol
      )
    );
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
        ? Number.MAX_SAFE_INTEGER
        : DEFAULT_PAGE_SIZE;

    if (pageIndex === 0 && this.paginator()) {
      this.paginator().pageIndex = 0;
    }

    this.placeholder =
      this.activeFilters.length <= 0 ? $localize`Filter by...` : '';

    this.selection.clear();

    this.dataService
      .fetchAssetProfiles({
        sortColumn,
        sortDirection,
        filters: this.activeFilters,
        skip: pageIndex * this.pageSize,
        take: this.pageSize
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ assetProfiles, count }) => {
        this.totalItems = count;

        this.dataSource = new MatTableDataSource(
          assetProfiles.map((assetProfile) => {
            return {
              ...assetProfile,
              isBenchmark: this.benchmarks.some(({ id }) => {
                return id === assetProfile.id;
              })
            };
          })
        );
        this.dataSource.sort = this.sort();

        this.isLoading = false;

        this.changeDetectorRef.markForCheck();
      });
  }

  private notifyDataGatheringHasBeenStarted() {
    this.snackBar.open(
      '✅ ' + $localize`Data gathering has been started.`,
      undefined,
      {
        duration: ms('3 seconds')
      }
    );
  }

  private reloadData({
    pageIndex = this.paginator().pageIndex
  }: { pageIndex?: number } = {}) {
    this.loadData({
      pageIndex,
      sortColumn: this.sort().active,
      sortDirection: this.sort().direction
    });
  }
}
