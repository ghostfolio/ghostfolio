import { UserService } from '@ghostfolio/client/services/user/user.service';
import {
  DEFAULT_COLOR_SCHEME,
  DEFAULT_LOCALE,
  DEFAULT_PAGE_SIZE
} from '@ghostfolio/common/config';
import { canDeleteAssetProfile } from '@ghostfolio/common/helper';
import {
  AssetProfileIdentifier,
  AssetProfileItem,
  Filter,
  InfoItem,
  User
} from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { GfSymbolPipe } from '@ghostfolio/common/pipes';
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
  computed,
  DestroyRef,
  inject,
  OnInit,
  viewChild
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import {
  MatPaginator,
  MatPaginatorModule,
  PageEvent
} from '@angular/material/paginator';
import {
  MatSort,
  MatSortModule,
  Sort,
  SortDirection
} from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
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
import { DeviceDetectorService } from 'ngx-device-detector';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { Subject } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';

import { AdminMarketDataService } from './admin-market-data.service';
import { GfAssetProfileDialogComponent } from './asset-profile-dialog/asset-profile-dialog.component';
import { AssetProfileDialogParams } from './asset-profile-dialog/interfaces/interfaces';
import { GfCreateAssetProfileDialogComponent } from './create-asset-profile-dialog/create-asset-profile-dialog.component';
import { CreateAssetProfileDialogParams } from './create-asset-profile-dialog/interfaces/interfaces';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    GfActivitiesFilterComponent,
    GfFabComponent,
    GfPremiumIndicatorComponent,
    GfSymbolPipe,
    GfValueComponent,
    IonIcon,
    MatButtonModule,
    MatCheckboxModule,
    MatMenuModule,
    MatPaginatorModule,
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
  protected isLoading = true;
  protected readonly isUUID = isUUID;
  protected pageSize = DEFAULT_PAGE_SIZE;
  protected placeholder = '';
  protected readonly selection = new SelectionModel<AssetProfileItem>(true);
  protected totalItems = 0;
  protected user: User;

  private activeFilters: Filter[] = [];
  private benchmarks: Partial<SymbolProfile>[];
  private readonly deviceType = computed(
    () => this.deviceDetectorService.deviceInfo().deviceType
  );
  private readonly hasPermissionForSubscription: boolean;
  private readonly info: InfoItem;
  private readonly paginator = viewChild.required(MatPaginator);
  private readonly sort = viewChild.required(MatSort);

  private readonly adminService = inject(AdminService);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly dataService = inject(DataService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly deviceDetectorService = inject(DeviceDetectorService);
  private readonly dialog = inject(MatDialog);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
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

    this.route.queryParams
      .pipe(takeUntilDestroyed(this.destroyRef))
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

        this.loadData();
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
    this.adminMarketDataService.deleteAssetProfile({ dataSource, symbol });
  }

  protected onDeleteAssetProfiles() {
    this.adminMarketDataService.deleteAssetProfiles(
      this.selection.selected.map(({ dataSource, symbol }) => {
        return { dataSource, symbol };
      })
    );
  }

  protected onGatherMax() {
    this.adminService
      .gatherMax()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        setTimeout(() => {
          window.location.reload();
        }, 300);
      });
  }

  protected onGatherProfileData() {
    this.adminService
      .gatherProfileData()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }

  protected onGatherRecentMarketData() {
    this.adminService
      .gatherRecentMarketData()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        setTimeout(() => {
          window.location.reload();
        }, 300);
      });
  }

  protected onOpenAssetProfileDialog({
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

  private openAssetProfileDialog({
    dataSource,
    symbol
  }: AssetProfileIdentifier) {
    this.userService
      .get()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((user) => {
        this.user = user;

        const dialogRef = this.dialog.open<
          GfAssetProfileDialogComponent,
          AssetProfileDialogParams
        >(GfAssetProfileDialogComponent, {
          autoFocus: false,
          data: {
            dataSource,
            symbol,
            colorScheme:
              this.user?.settings.colorScheme ?? DEFAULT_COLOR_SCHEME,
            deviceType: this.deviceType(),
            locale: this.user?.settings?.locale ?? DEFAULT_LOCALE
          } satisfies AssetProfileDialogParams,
          height: this.deviceType() === 'mobile' ? '98vh' : '80vh',
          width: this.deviceType() === 'mobile' ? '100vw' : '50rem'
        });

        dialogRef
          .afterClosed()
          .pipe(takeUntilDestroyed(this.destroyRef))
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
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((user) => {
        this.user = user;

        const dialogRef = this.dialog.open<
          GfCreateAssetProfileDialogComponent,
          CreateAssetProfileDialogParams
        >(GfCreateAssetProfileDialogComponent, {
          autoFocus: false,
          data: {
            deviceType: this.deviceType(),
            locale: this.user?.settings?.locale ?? DEFAULT_LOCALE
          } satisfies CreateAssetProfileDialogParams,
          width: this.deviceType() === 'mobile' ? '100vw' : '50rem'
        });

        dialogRef
          .afterClosed()
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe((result) => {
            if (!result) {
              this.router.navigate(['.'], { relativeTo: this.route });

              return;
            }

            const { addAssetProfile, dataSource, symbol } = result;

            if (addAssetProfile && dataSource && symbol) {
              this.adminService
                .addAssetProfile({ dataSource, symbol })
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe(() => {
                  this.loadData();
                });
            } else {
              this.loadData();
            }

            this.onOpenAssetProfileDialog({ dataSource, symbol });
          });
      });
  }
}
