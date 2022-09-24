import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { PositionDetailDialog } from '@ghostfolio/client/components/position/position-detail-dialog/position-detail-dialog.component';
import { ToggleComponent } from '@ghostfolio/client/components/toggle/toggle.component';
import { DataService } from '@ghostfolio/client/services/data.service';
import { ImpersonationStorageService } from '@ghostfolio/client/services/impersonation-storage.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { Filter, Position, User } from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { DateRange } from '@ghostfolio/common/types';
import { AssetClass, DataSource } from '@prisma/client';
import { DeviceDetectorService } from 'ngx-device-detector';
import { Subject } from 'rxjs';
import { distinctUntilChanged, takeUntil } from 'rxjs/operators';

import { PositionDetailDialogParams } from '../position/position-detail-dialog/interfaces/interfaces';

@Component({
  selector: 'gf-home-holdings',
  styleUrls: ['./home-holdings.scss'],
  templateUrl: './home-holdings.html'
})
export class HomeHoldingsComponent implements OnDestroy, OnInit {
  public activeFilters: Filter[] = [];
  public allFilters: Filter[];
  public dateRangeOptions = ToggleComponent.DEFAULT_DATE_RANGE_OPTIONS;
  public deviceType: string;
  public filterPlaceholder = '';
  public filters$ = new Subject<Filter[]>();
  public hasImpersonationId: boolean;
  public hasPermissionToCreateOrder: boolean;
  public positions: Position[];
  public user: User;

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService,
    private deviceService: DeviceDetectorService,
    private dialog: MatDialog,
    private impersonationStorageService: ImpersonationStorageService,
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserService
  ) {
    this.route.queryParams
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((params) => {
        if (
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

    this.userService.stateChanged
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((state) => {
        if (state?.user) {
          this.user = state.user;

          this.hasPermissionToCreateOrder = hasPermission(
            this.user.permissions,
            permissions.createOrder
          );

          const accountFilters: Filter[] = this.user.accounts
            .filter(({ accountType }) => {
              return accountType === 'SECURITIES';
            })
            .map(({ id, name }) => {
              return {
                id,
                label: name,
                type: 'ACCOUNT'
              };
            });
          const assetClassFilters: Filter[] = [];
          for (const assetClass of Object.keys(AssetClass)) {
            assetClassFilters.push({
              id: assetClass,
              label: assetClass,
              type: 'ASSET_CLASS'
            });
          }
          const tagFilters: Filter[] = this.user.tags.map(({ id, name }) => {
            return {
              id,
              label: name,
              type: 'TAG'
            };
          });

          this.allFilters = [
            ...accountFilters,
            ...assetClassFilters,
            ...tagFilters
          ];

          this.update();
        }
      });
  }

  public ngOnInit() {
    this.deviceType = this.deviceService.getDeviceInfo().deviceType;

    this.impersonationStorageService
      .onChangeHasImpersonation()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((aId) => {
        this.hasImpersonationId = !!aId;
      });

    this.filters$
      .pipe(distinctUntilChanged(), takeUntil(this.unsubscribeSubject))
      .subscribe((filters) => {
        this.activeFilters = filters;
        this.filterPlaceholder =
          this.activeFilters.length <= 0
            ? $localize`Filter by account or tag...`
            : '';
        this.update();
        this.changeDetectorRef.markForCheck();
      });

    this.update();
  }

  public onChangeDateRange(dateRange: DateRange) {
    this.dataService
      .putUserSetting({ dateRange })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(() => {
        this.userService.remove();

        this.userService
          .get()
          .pipe(takeUntil(this.unsubscribeSubject))
          .subscribe((user) => {
            this.user = user;

            this.changeDetectorRef.markForCheck();
          });
      });
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
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
        this.user = user;

        const dialogRef = this.dialog.open(PositionDetailDialog, {
          autoFocus: false,
          data: <PositionDetailDialogParams>{
            dataSource,
            symbol,
            baseCurrency: this.user?.settings?.baseCurrency,
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

  private update() {
    this.positions = undefined;

    this.dataService
      .fetchPositions({
        range: this.user?.settings?.dateRange,
        filters: this.activeFilters
      })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((response) => {
        this.positions = response.positions;

        this.changeDetectorRef.markForCheck();
      });

    this.changeDetectorRef.markForCheck();
  }
}
