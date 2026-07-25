import { GfAccountDetailDialogComponent } from '@ghostfolio/client/components/account-detail-dialog/account-detail-dialog.component';
import {
  AccountDetailDialogParams,
  AccountDetailDialogResult
} from '@ghostfolio/client/components/account-detail-dialog/interfaces/interfaces';
import { ImpersonationStorageService } from '@ghostfolio/client/services/impersonation-storage.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { MAX_TOP_HOLDINGS, UNKNOWN_KEY } from '@ghostfolio/common/config';
import {
  canOpenHoldingDetail,
  getCountryName
} from '@ghostfolio/common/helper';
import {
  AssetProfileIdentifier,
  HoldingWithParents,
  PortfolioDetails,
  PortfolioPosition,
  User
} from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { MarketAdvanced } from '@ghostfolio/common/types';
import { translate } from '@ghostfolio/ui/i18n';
import { GfPortfolioProportionChartComponent } from '@ghostfolio/ui/portfolio-proportion-chart';
import { GfPremiumIndicatorComponent } from '@ghostfolio/ui/premium-indicator';
import { DataService } from '@ghostfolio/ui/services';
import { GfTopHoldingsComponent } from '@ghostfolio/ui/top-holdings';
import { GfValueComponent } from '@ghostfolio/ui/value';
import { GfWorldMapChartComponent } from '@ghostfolio/ui/world-map-chart';

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ActivatedRoute, Router } from '@angular/router';
import {
  Account,
  AssetClass,
  AssetSubClass,
  DataSource,
  Platform
} from '@prisma/client';
import { isNumber } from 'lodash';
import { DeviceDetectorService } from 'ngx-device-detector';
import { filter, switchMap, tap } from 'rxjs';

import { AllocationsPageParams } from './interfaces/interfaces';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    GfPortfolioProportionChartComponent,
    GfPremiumIndicatorComponent,
    GfTopHoldingsComponent,
    GfValueComponent,
    GfWorldMapChartComponent,
    MatCardModule,
    MatProgressBarModule
  ],
  selector: 'gf-allocations-page',
  styleUrls: ['./allocations-page.scss'],
  templateUrl: './allocations-page.html'
})
export class GfAllocationsPageComponent implements OnInit {
  protected accounts: {
    [id: string]: Pick<Account, 'name'> & {
      id: string;
      value: number;
    };
  };
  protected continents: {
    [code: string]: { name: string; value: number };
  };
  protected countries: {
    [code: string]: { name: string; value: number };
  };
  protected readonly deviceType = computed(
    () => this.deviceDetectorService.deviceInfo().deviceType
  );
  protected hasImpersonationId: boolean;
  protected holdings: {
    [symbol: string]: Pick<
      PortfolioPosition['assetProfile'],
      | 'assetClass'
      | 'assetClassLabel'
      | 'assetSubClass'
      | 'assetSubClassLabel'
      | 'currency'
      | 'name'
    > & { etfProvider: string; exchange?: string; value: number };
  };
  protected isLoading = false;
  protected markets: PortfolioDetails['markets'];
  protected marketsAdvanced: {
    [key in MarketAdvanced]: {
      id: MarketAdvanced;
      name: string;
      value: number;
    };
  };
  protected platforms: {
    [id: string]: Pick<Platform, 'name'> & {
      id: string;
      value: number;
    };
  };
  protected portfolioDetails: PortfolioDetails;
  protected sectors: {
    [name: string]: { name: string; value: number };
  };
  protected symbols: {
    [name: string]: {
      dataSource?: DataSource;
      isClickable?: boolean;
      name: string;
      symbol: string;
      value: number;
    };
  };
  protected topHoldings: HoldingWithParents[];
  protected readonly UNKNOWN_KEY = UNKNOWN_KEY;
  protected user: User;

  private topHoldingsMap: {
    [name: string]: { name: string; value: number };
  };
  private totalValueInEtf = 0;

  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly dataService = inject(DataService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly deviceDetectorService = inject(DeviceDetectorService);
  private readonly dialog = inject(MatDialog);
  private readonly impersonationStorageService = inject(
    ImpersonationStorageService
  );
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly userService = inject(UserService);

  public constructor() {
    this.route.queryParams
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(
        ({ accountId, accountDetailDialog }: AllocationsPageParams) => {
          if (accountId && accountDetailDialog) {
            this.openAccountDetailDialog(accountId);
          }
        }
      );
  }

  protected get worldMapChartFormat(): string {
    return this.showValuesInPercentage()
      ? '{0}%'
      : `{0} ${this.user?.settings?.baseCurrency}`;
  }

  public ngOnInit() {
    this.impersonationStorageService
      .onChangeHasImpersonation()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((impersonationId) => {
        this.hasImpersonationId = !!impersonationId;

        this.changeDetectorRef.markForCheck();
      });

    this.userService.stateChanged
      .pipe(
        filter((state) => !!state?.user),
        tap((state) => {
          this.user = state.user;

          this.isLoading = true;

          this.initialize();

          this.changeDetectorRef.markForCheck();
        }),
        switchMap(() => this.fetchPortfolioDetails()),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((portfolioDetails) => {
        this.initialize();

        this.portfolioDetails = portfolioDetails;

        this.initializeAllocationsData();

        this.isLoading = false;

        this.changeDetectorRef.markForCheck();
      });

    this.initialize();
  }

  protected onAccountChartClicked({ accountId }: { accountId: string }) {
    if (accountId && accountId !== UNKNOWN_KEY) {
      void this.router.navigate([], {
        queryParams: { accountId, accountDetailDialog: true }
      });
    }
  }

  protected onSymbolChartClicked({
    dataSource,
    symbol
  }: AssetProfileIdentifier) {
    if (dataSource && symbol) {
      void this.router.navigate([], {
        queryParams: { dataSource, symbol, holdingDetailDialog: true }
      });
    }
  }

  protected showValuesInPercentage() {
    return this.hasImpersonationId || this.user?.settings?.isRestrictedView;
  }

  private extractCurrency({
    assetClass,
    assetSubClass,
    currency
  }: {
    assetClass: PortfolioPosition['assetProfile']['assetClass'];
    assetSubClass: PortfolioPosition['assetProfile']['assetSubClass'];
    currency?: PortfolioPosition['assetProfile']['currency'];
  }) {
    if (
      assetClass === AssetClass.COMMODITY ||
      assetSubClass === AssetSubClass.CRYPTOCURRENCY
    ) {
      // Commodities and cryptocurrencies have no meaningful currency exposure
      return UNKNOWN_KEY;
    }

    return currency;
  }

  private extractEtfProvider({
    assetSubClass,
    name
  }: {
    assetSubClass: PortfolioPosition['assetProfile']['assetSubClass'];
    name?: string;
  }) {
    if (assetSubClass === 'ETF' && name) {
      const [firstWord] = name.split(' ');
      return firstWord;
    }

    return UNKNOWN_KEY;
  }

  private fetchPortfolioDetails() {
    return this.dataService.fetchPortfolioDetails({
      filters: this.userService.getFilters(),
      withMarkets: true
    });
  }

  private initialize() {
    this.accounts = {};
    this.continents = {
      [UNKNOWN_KEY]: {
        name: UNKNOWN_KEY,
        value: 0
      }
    };
    this.countries = {
      [UNKNOWN_KEY]: {
        name: UNKNOWN_KEY,
        value: 0
      }
    };
    this.holdings = {};
    this.marketsAdvanced = {
      [UNKNOWN_KEY]: {
        id: UNKNOWN_KEY,
        name: UNKNOWN_KEY,
        value: 0
      },
      asiaPacific: {
        id: 'asiaPacific',
        name: translate('Asia-Pacific'),
        value: 0
      },
      emergingMarkets: {
        id: 'emergingMarkets',
        name: translate('Emerging Markets'),
        value: 0
      },
      europe: {
        id: 'europe',
        name: translate('Europe'),
        value: 0
      },
      japan: {
        id: 'japan',
        name: translate('Japan'),
        value: 0
      },
      northAmerica: {
        id: 'northAmerica',
        name: translate('North America'),
        value: 0
      },
      otherMarkets: {
        id: 'otherMarkets',
        name: translate('Other Markets'),
        value: 0
      }
    };
    this.platforms = {};
    this.portfolioDetails = {
      accounts: {},
      createdAt: new Date(),
      holdings: {},
      platforms: {},
      summary: undefined
    };
    this.sectors = {
      [UNKNOWN_KEY]: {
        name: UNKNOWN_KEY,
        value: 0
      }
    };
    this.symbols = {
      [UNKNOWN_KEY]: {
        name: UNKNOWN_KEY,
        symbol: UNKNOWN_KEY,
        value: 0
      }
    };
    this.topHoldingsMap = {};
  }

  private initializeAllocationsData() {
    for (const [
      id,
      { name, valueInBaseCurrency, valueInPercentage }
    ] of Object.entries(this.portfolioDetails.accounts)) {
      let value = 0;

      if (this.showValuesInPercentage()) {
        value = valueInPercentage ?? 0;
      } else {
        value = valueInBaseCurrency;
      }

      this.accounts[id] = {
        id,
        name,
        value
      };
    }

    for (const [symbol, position] of Object.entries(
      this.portfolioDetails.holdings
    )) {
      this.holdings[symbol] = {
        assetClass:
          position.assetProfile.assetClass || (UNKNOWN_KEY as AssetClass),
        assetClassLabel: position.assetProfile.assetClassLabel ?? UNKNOWN_KEY,
        assetSubClass:
          position.assetProfile.assetSubClass || (UNKNOWN_KEY as AssetSubClass),
        assetSubClassLabel:
          position.assetProfile.assetSubClassLabel ?? UNKNOWN_KEY,
        currency: this.extractCurrency(position.assetProfile),
        etfProvider: this.extractEtfProvider({
          assetSubClass: position.assetProfile.assetSubClass,
          name: position.assetProfile.name
        }),
        exchange: position.exchange,
        name: position.assetProfile.name,
        value: this.showValuesInPercentage()
          ? position.allocationInPercentage
          : (position.valueInBaseCurrency ?? 0)
      };

      // Prepare analysis data by continents, countries, holdings and sectors

      if (position.assetProfile.countries.length > 0) {
        for (const country of position.assetProfile.countries) {
          const { code, continent, weight } = country;
          const value =
            (isNumber(position.valueInBaseCurrency)
              ? position.valueInBaseCurrency
              : position.valueInPercentage) ?? 0;

          const continentData = this.continents[continent];

          if (continentData) {
            continentData.value += weight * value;
          } else {
            this.continents[continent] = {
              name: translate(continent),
              value: weight * value
            };
          }

          const countryData = this.countries[code];

          if (countryData) {
            countryData.value += weight * value;
          } else {
            this.countries[code] = {
              name: getCountryName({ code }),
              value: weight * value
            };
          }
        }
      } else {
        const value =
          (isNumber(position.valueInBaseCurrency)
            ? position.valueInBaseCurrency
            : position.valueInPercentage) ?? 0;

        const continentData = this.continents[UNKNOWN_KEY];

        if (continentData) {
          continentData.value += value;
        }

        const countryData = this.countries[UNKNOWN_KEY];

        if (countryData) {
          countryData.value += value;
        }
      }

      if (position.assetProfile.holdings.length > 0) {
        for (const {
          allocationInPercentage,
          name,
          valueInBaseCurrency
        } of position.assetProfile.holdings) {
          const normalizedAssetName = this.normalizeAssetName(name);
          const value = isNumber(valueInBaseCurrency)
            ? valueInBaseCurrency
            : allocationInPercentage * (position.valueInPercentage ?? 0);

          const holdingData = this.topHoldingsMap[normalizedAssetName];

          if (holdingData) {
            holdingData.value += value;
          } else {
            this.topHoldingsMap[normalizedAssetName] = {
              name,
              value
            };
          }
        }
      }

      if (position.assetProfile.sectors.length > 0) {
        for (const sector of position.assetProfile.sectors) {
          const { name, weight } = sector;
          const value =
            (isNumber(position.valueInBaseCurrency)
              ? position.valueInBaseCurrency
              : position.valueInPercentage) ?? 0;

          const sectorData = this.sectors[name];

          if (sectorData) {
            sectorData.value += weight * value;
          } else {
            this.sectors[name] = {
              name: translate(name),
              value: weight * value
            };
          }
        }
      } else {
        const value =
          (isNumber(position.valueInBaseCurrency)
            ? position.valueInBaseCurrency
            : position.valueInPercentage) ?? 0;

        const sectorData = this.sectors[UNKNOWN_KEY];

        if (sectorData) {
          sectorData.value += value;
        }
      }

      if (this.holdings[symbol].assetSubClass === 'ETF') {
        this.totalValueInEtf += this.holdings[symbol].value;
      }

      this.symbols[symbol] = {
        symbol,
        dataSource: position.assetProfile.dataSource,
        isClickable: canOpenHoldingDetail(position),
        name: position.assetProfile.name ?? '',
        value:
          (isNumber(position.valueInBaseCurrency)
            ? position.valueInBaseCurrency
            : position.valueInPercentage) ?? 0
      };
    }

    this.markets = this.portfolioDetails.markets;

    if (this.portfolioDetails.marketsAdvanced) {
      Object.values(this.portfolioDetails.marketsAdvanced).forEach(
        ({ id, valueInBaseCurrency, valueInPercentage }) => {
          this.marketsAdvanced[id].value = isNumber(valueInBaseCurrency)
            ? valueInBaseCurrency
            : valueInPercentage;
        }
      );
    }

    for (const [
      id,
      { name, valueInBaseCurrency, valueInPercentage }
    ] of Object.entries(this.portfolioDetails.platforms)) {
      let value = 0;

      if (this.showValuesInPercentage()) {
        value = valueInPercentage ?? 0;
      } else {
        value = valueInBaseCurrency;
      }

      this.platforms[id] = {
        id,
        name,
        value
      };
    }

    this.topHoldings = Object.values(this.topHoldingsMap)
      .map(({ name, value }): HoldingWithParents => {
        if (this.showValuesInPercentage()) {
          return {
            name,
            allocationInPercentage: value
          };
        }

        return {
          name,
          allocationInPercentage:
            this.totalValueInEtf > 0 ? value / this.totalValueInEtf : 0,
          parents: Object.entries(this.portfolioDetails.holdings)
            .map(([symbol, holding]) => {
              if (holding.assetProfile.holdings.length > 0) {
                const currentParentHolding = holding.assetProfile.holdings.find(
                  (parentHolding) => {
                    return (
                      this.normalizeAssetName(parentHolding.name) ===
                      this.normalizeAssetName(name)
                    );
                  }
                );

                return currentParentHolding &&
                  isNumber(currentParentHolding.valueInBaseCurrency)
                  ? {
                      symbol,
                      allocationInPercentage:
                        currentParentHolding.valueInBaseCurrency / value,
                      name: holding.assetProfile.name ?? '',
                      position: holding,
                      valueInBaseCurrency:
                        currentParentHolding.valueInBaseCurrency
                    }
                  : null;
              }

              return null;
            })
            .filter((item) => {
              return item !== null;
            })
            .sort((a, b) => {
              return b.allocationInPercentage - a.allocationInPercentage;
            }),
          valueInBaseCurrency: value
        };
      })
      .sort((a, b) => {
        return b.allocationInPercentage - a.allocationInPercentage;
      });

    if (this.topHoldings.length > MAX_TOP_HOLDINGS) {
      this.topHoldings = this.topHoldings.slice(0, MAX_TOP_HOLDINGS);
    }
  }

  private normalizeAssetName(name: string) {
    if (!name) {
      return '';
    }

    return name.trim().toLowerCase();
  }

  private openAccountDetailDialog(aAccountId: string) {
    const dialogRef = this.dialog.open<
      GfAccountDetailDialogComponent,
      AccountDetailDialogParams,
      AccountDetailDialogResult
    >(GfAccountDetailDialogComponent, {
      autoFocus: false,
      data: {
        accountId: aAccountId,
        deviceType: this.deviceType(),
        hasImpersonationId: this.hasImpersonationId,
        hasPermissionToCreateActivity:
          !this.hasImpersonationId &&
          hasPermission(this.user?.permissions, permissions.createActivity) &&
          !this.user?.settings?.isRestrictedView
      },
      height: this.deviceType() === 'mobile' ? '98vh' : '80vh',
      width: this.deviceType() === 'mobile' ? '100vw' : '50rem'
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (result?.isNavigating) {
          return;
        }

        void this.router.navigate(['.'], { relativeTo: this.route });
      });
  }
}
