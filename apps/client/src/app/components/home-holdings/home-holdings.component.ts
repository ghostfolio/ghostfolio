import { ImpersonationStorageService } from '@ghostfolio/client/services/impersonation-storage.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import {
  AssetProfileIdentifier,
  PortfolioPosition,
  ToggleOption,
  User
} from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { internalRoutes } from '@ghostfolio/common/routes/routes';
import { HoldingType, HoldingsViewMode } from '@ghostfolio/common/types';
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
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { Router, RouterModule } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { gridOutline, reorderFourOutline } from 'ionicons/icons';
import { DeviceDetectorService } from 'ngx-device-detector';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    GfHoldingsTableComponent,
    GfToggleComponent,
    GfTreemapChartComponent,
    IonIcon,
    MatButtonModule,
    MatButtonToggleModule,
    ReactiveFormsModule,
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
  protected hasImpersonationId: boolean;
  protected hasPermissionToAccessHoldingsChart: boolean;
  protected hasPermissionToCreateActivity: boolean;
  protected holdings: PortfolioPosition[];
  protected holdingType: HoldingType = 'ACTIVE';
  protected readonly holdingTypeOptions: ToggleOption[] = [
    { label: $localize`Active`, value: 'ACTIVE' },
    { label: $localize`Closed`, value: 'CLOSED' }
  ];
  protected readonly routerLinkPortfolioActivities =
    internalRoutes.portfolio.subRoutes.activities.routerLink;
  protected user: User;
  protected readonly viewModeFormControl = new FormControl<HoldingsViewMode>(
    GfHomeHoldingsComponent.DEFAULT_HOLDINGS_VIEW_MODE
  );

  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly dataService = inject(DataService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly deviceDetectorService = inject(DeviceDetectorService);
  private readonly impersonationStorageService = inject(
    ImpersonationStorageService
  );
  private readonly router = inject(Router);
  private readonly userService = inject(UserService);

  public constructor() {
    addIcons({ gridOutline, reorderFourOutline });
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
          this.user = state.user;

          this.hasPermissionToAccessHoldingsChart = hasPermission(
            this.user.permissions,
            permissions.accessHoldingsChart
          );

          this.hasPermissionToCreateActivity = hasPermission(
            this.user.permissions,
            permissions.createActivity
          );

          this.initialize();
        }

        this.changeDetectorRef.markForCheck();
      });

    this.viewModeFormControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((holdingsViewMode) => {
        if (!holdingsViewMode) {
          return;
        }

        this.dataService
          .putUserSetting({ holdingsViewMode })
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
    this.viewModeFormControl.disable({ emitEvent: false });

    if (
      this.hasPermissionToAccessHoldingsChart &&
      this.holdingType === 'ACTIVE'
    ) {
      this.viewModeFormControl.enable({ emitEvent: false });

      this.viewModeFormControl.setValue(
        this.deviceType === 'mobile'
          ? GfHomeHoldingsComponent.DEFAULT_HOLDINGS_VIEW_MODE
          : this.user?.settings?.holdingsViewMode ||
              GfHomeHoldingsComponent.DEFAULT_HOLDINGS_VIEW_MODE,
        { emitEvent: false }
      );
    } else if (this.holdingType === 'CLOSED') {
      this.viewModeFormControl.setValue(
        GfHomeHoldingsComponent.DEFAULT_HOLDINGS_VIEW_MODE,
        { emitEvent: false }
      );
    }

    this.holdings = [];

    this.fetchHoldings()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ holdings }) => {
        this.holdings = holdings;

        this.changeDetectorRef.markForCheck();
      });
  }
}
