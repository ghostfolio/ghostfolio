import { UserService } from '@ghostfolio/client/services/user/user.service';
import {
  AssetProfileIdentifier,
  PortfolioPosition,
  User
} from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { internalRoutes } from '@ghostfolio/common/routes/routes';
import { hasScope, scopes } from '@ghostfolio/common/scopes';
import {
  HoldingType,
  HoldingsViewMode,
  ToggleOption
} from '@ghostfolio/common/types';
import { GfHoldingsTableComponent } from '@ghostfolio/ui/holdings-table';
import { DataService } from '@ghostfolio/ui/services';
import { GfToggleComponent } from '@ghostfolio/ui/toggle';
import { GfTreemapChartComponent } from '@ghostfolio/ui/treemap-chart';

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  DestroyRef,
  inject,
  OnInit
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { Router, RouterModule } from '@angular/router';
import { addIcons } from 'ionicons';
import { gridOutline, reorderFourOutline } from 'ionicons/icons';
import { DeviceDetectorService } from 'ngx-device-detector';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    GfHoldingsTableComponent,
    GfToggleComponent,
    GfTreemapChartComponent,
    MatButtonModule,
    RouterModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'gf-home-holdings',
  styleUrls: ['./home-holdings.scss'],
  templateUrl: './home-holdings.html'
})
export class GfHomeHoldingsComponent implements OnInit {
  public static DEFAULT_HOLDINGS_VIEW_MODE: HoldingsViewMode = 'TABLE';

  protected deviceType: string;
  protected hasPermissionToAccessHoldingsChart: boolean;
  protected hasPermissionToCreateActivity: boolean;
  protected holdings: PortfolioPosition[] | undefined;
  protected holdingsViewMode: HoldingsViewMode =
    GfHomeHoldingsComponent.DEFAULT_HOLDINGS_VIEW_MODE;
  protected readonly holdingsViewModeOptions: ToggleOption<HoldingsViewMode>[] =
    [
      {
        iconName: 'reorder-four-outline',
        title: $localize`Table`,
        value: 'TABLE'
      },
      {
        iconName: 'grid-outline',
        title: $localize`Chart`,
        value: 'CHART'
      }
    ];
  protected holdingType: HoldingType = 'ACTIVE';
  protected readonly holdingTypeOptions: ToggleOption<HoldingType>[] = [
    { label: $localize`Active`, value: 'ACTIVE' },
    { label: $localize`Closed`, value: 'CLOSED' }
  ];
  protected isHoldingsViewModeToggleDisabled = true;
  protected readonly routerLinkPortfolioActivities =
    internalRoutes.portfolio.subRoutes.activities.routerLink;
  protected user: User;

  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly dataService = inject(DataService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly deviceDetectorService = inject(DeviceDetectorService);
  private readonly router = inject(Router);
  private readonly userService = inject(UserService);

  public constructor() {
    addIcons({ gridOutline, reorderFourOutline });
  }

  public ngOnInit() {
    this.deviceType = this.deviceDetectorService.getDeviceInfo().deviceType;

    this.userService.stateChanged
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((state) => {
        if (state?.user) {
          this.user = state.user;

          this.hasPermissionToAccessHoldingsChart = hasPermission(
            this.user.permissions,
            permissions.accessHoldingsChart
          );

          this.hasPermissionToCreateActivity =
            hasPermission(this.user.permissions, permissions.createActivity) &&
            hasScope(this.user.scopes, scopes.activityCreate);

          this.initialize();
        }

        this.changeDetectorRef.markForCheck();
      });
  }

  protected onChangeHoldingsViewMode(aHoldingsViewMode: HoldingsViewMode) {
    this.holdingsViewMode = aHoldingsViewMode;

    this.dataService
      .putUserSetting({ holdingsViewMode: aHoldingsViewMode })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.userService
          .get(true)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe((user) => {
            this.user = user;

            this.changeDetectorRef.markForCheck();
          });
      });
  }

  protected onChangeHoldingType(aHoldingType: HoldingType) {
    this.holdingType = aHoldingType;

    this.initialize();
  }

  protected onHoldingClicked({ dataSource, symbol }: AssetProfileIdentifier) {
    if (dataSource && symbol) {
      this.router.navigate([], {
        queryParams: { dataSource, symbol, holdingDetailDialog: true }
      });
    }
  }

  private fetchHoldings() {
    const filters = this.userService.getFilters();

    if (this.holdingType === 'CLOSED') {
      filters.push({ id: 'CLOSED', type: 'HOLDING_TYPE' });
    }

    return this.dataService.fetchPortfolioHoldings({
      filters,
      range: this.user?.settings?.dateRange
    });
  }

  private initialize() {
    this.isHoldingsViewModeToggleDisabled = true;

    if (
      this.hasPermissionToAccessHoldingsChart &&
      this.holdingType === 'ACTIVE'
    ) {
      this.isHoldingsViewModeToggleDisabled = false;

      this.holdingsViewMode =
        this.deviceType === 'mobile'
          ? GfHomeHoldingsComponent.DEFAULT_HOLDINGS_VIEW_MODE
          : (this.user?.settings?.holdingsViewMode ??
            GfHomeHoldingsComponent.DEFAULT_HOLDINGS_VIEW_MODE);
    } else {
      this.holdingsViewMode =
        GfHomeHoldingsComponent.DEFAULT_HOLDINGS_VIEW_MODE;
    }

    this.holdings = undefined;

    this.fetchHoldings()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ holdings }) => {
        this.holdings = holdings;

        this.changeDetectorRef.markForCheck();
      });
  }
}
