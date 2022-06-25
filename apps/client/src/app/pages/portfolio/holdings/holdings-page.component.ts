import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { PositionDetailDialogParams } from '@ghostfolio/client/components/position/position-detail-dialog/interfaces/interfaces';
import { PositionDetailDialog } from '@ghostfolio/client/components/position/position-detail-dialog/position-detail-dialog.component';
import { DataService } from '@ghostfolio/client/services/data.service';
import { ImpersonationStorageService } from '@ghostfolio/client/services/impersonation-storage.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import {
  Filter,
  PortfolioDetails,
  PortfolioPosition,
  User
} from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { AssetClass, DataSource } from '@prisma/client';
import { DeviceDetectorService } from 'ngx-device-detector';
import { Subject, Subscription } from 'rxjs';
import { distinctUntilChanged, switchMap, takeUntil } from 'rxjs/operators';

@Component({
  host: { class: 'page' },
  selector: 'gf-holdings-page',
  styleUrls: ['./holdings-page.scss'],
  templateUrl: './holdings-page.html'
})
export class HoldingsPageComponent implements OnDestroy, OnInit {
  public activeFilters: Filter[] = [];
  public allFilters: Filter[];
  public deviceType: string;
  public filters$ = new Subject<Filter[]>();
  public hasImpersonationId: boolean;
  public hasPermissionToCreateOrder: boolean;
  public isLoading = false;
  public placeholder = '';
  public portfolioDetails: PortfolioDetails;
  public positionsArray: PortfolioPosition[];
  public routeQueryParams: Subscription;
  public user: User;

  private readonly SEARCH_PLACEHOLDER = 'Filter by account or tag...';
  private unsubscribeSubject = new Subject<void>();

  /**
   * @constructor
   */
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
    this.routeQueryParams = route.queryParams
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
  }

  /**
   * Initializes the controller
   */
  public ngOnInit() {
    this.deviceType = this.deviceService.getDeviceInfo().deviceType;

    this.impersonationStorageService
      .onChangeHasImpersonation()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((aId) => {
        this.hasImpersonationId = !!aId;
      });

    this.filters$
      .pipe(
        distinctUntilChanged(),
        switchMap((filters) => {
          this.isLoading = true;
          this.activeFilters = filters;
          this.placeholder =
            this.activeFilters.length <= 0 ? this.SEARCH_PLACEHOLDER : '';

          return this.dataService.fetchPortfolioDetails({
            filters: this.activeFilters
          });
        }),
        takeUntil(this.unsubscribeSubject)
      )
      .subscribe((portfolioDetails) => {
        this.portfolioDetails = portfolioDetails;

        this.initializeAnalysisData();

        this.isLoading = false;

        this.changeDetectorRef.markForCheck();
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

          this.changeDetectorRef.markForCheck();
        }
      });
  }

  public initialize() {
    this.positionsArray = [];
  }

  public initializeAnalysisData() {
    this.initialize();

    for (const [symbol, position] of Object.entries(
      this.portfolioDetails.holdings
    )) {
      this.positionsArray.push(position);
    }
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
}
