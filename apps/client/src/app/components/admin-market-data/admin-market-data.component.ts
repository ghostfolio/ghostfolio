import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminService } from '@ghostfolio/client/services/admin.service';
import { DataService } from '@ghostfolio/client/services/data.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { DATE_FORMAT, getDateFormatString } from '@ghostfolio/common/helper';
import { Filter, UniqueAsset, User } from '@ghostfolio/common/interfaces';
import { AdminMarketDataItem } from '@ghostfolio/common/interfaces/admin-market-data.interface';
import { AssetSubClass, DataSource } from '@prisma/client';
import { format, parseISO } from 'date-fns';
import { DeviceDetectorService } from 'ngx-device-detector';
import { Subject } from 'rxjs';
import { distinctUntilChanged, switchMap, takeUntil } from 'rxjs/operators';

import { AssetProfileDialog } from './asset-profile-dialog/asset-profile-dialog.component';
import { AssetProfileDialogParams } from './asset-profile-dialog/interfaces/interfaces';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'gf-admin-market-data',
  styleUrls: ['./admin-market-data.scss'],
  templateUrl: './admin-market-data.html'
})
export class AdminMarketDataComponent implements OnDestroy, OnInit {
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
  ].map((id) => {
    return {
      id,
      label: id,
      type: 'ASSET_SUB_CLASS'
    };
  });
  public currentDataSource: DataSource;
  public currentSymbol: string;
  public dataSource: MatTableDataSource<AdminMarketDataItem> =
    new MatTableDataSource();
  public defaultDateFormat: string;
  public deviceType: string;
  public displayedColumns = [
    'symbol',
    'dataSource',
    'assetClass',
    'assetSubClass',
    'date',
    'activityCount',
    'marketDataItemCount',
    'countriesCount',
    'sectorsCount',
    'actions'
  ];
  public filters$ = new Subject<Filter[]>();
  public isLoading = false;
  public placeholder = '';
  public user: User;

  private unsubscribeSubject = new Subject<void>();

  public constructor(
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
            dateOfFirstActivity: params['dateOfFirstActivity'],
            symbol: params['symbol']
          });
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
  }

  public ngOnInit() {
    this.deviceType = this.deviceService.getDeviceInfo().deviceType;

    this.filters$
      .pipe(
        distinctUntilChanged(),
        switchMap((filters) => {
          this.isLoading = true;
          this.activeFilters = filters;
          this.placeholder =
            this.activeFilters.length <= 0 ? $localize`Filter by...` : '';

          return this.dataService.fetchAdminMarketData({
            filters: this.activeFilters
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

  public onDeleteProfileData({ dataSource, symbol }: UniqueAsset) {
    this.adminService
      .deleteProfileData({ dataSource, symbol })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(() => {});
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

  public onOpenAssetProfileDialog({
    dataSource,
    dateOfFirstActivity,
    symbol
  }: UniqueAsset & { dateOfFirstActivity: string }) {
    try {
      dateOfFirstActivity = format(parseISO(dateOfFirstActivity), DATE_FORMAT);
    } catch {}

    this.router.navigate([], {
      queryParams: {
        dateOfFirstActivity,
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

  private openAssetProfileDialog({
    dataSource,
    dateOfFirstActivity,
    symbol
  }: {
    dataSource: DataSource;
    dateOfFirstActivity: string;
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
            dateOfFirstActivity,
            symbol,
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
}
