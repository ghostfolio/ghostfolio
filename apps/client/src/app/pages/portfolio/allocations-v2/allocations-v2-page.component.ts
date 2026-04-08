import { ImpersonationStorageService } from '@ghostfolio/client/services/impersonation-storage.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { UNKNOWN_KEY } from '@ghostfolio/common/config';
import { prettifySymbol } from '@ghostfolio/common/helper';
import {
  AssetProfileIdentifier,
  PortfolioDetails,
  PortfolioPosition,
  User
} from '@ghostfolio/common/interfaces';
import { MarketAdvanced } from '@ghostfolio/common/types';
import { translate } from '@ghostfolio/ui/i18n';
import { GfAllocationCardsGridComponent } from '@ghostfolio/ui/allocation-cards-grid';
import { GfAllocationDonutCardsComponent } from '@ghostfolio/ui/allocation-donut-cards';
import { GfPremiumIndicatorComponent } from '@ghostfolio/ui/premium-indicator';
import { DataService } from '@ghostfolio/ui/services';

import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnInit
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { Router } from '@angular/router';
import {
  Account,
  AssetClass,
  AssetSubClass,
  DataSource,
  Platform
} from '@prisma/client';
import { isNumber } from 'lodash';

@Component({
  imports: [
    GfAllocationCardsGridComponent,
    GfAllocationDonutCardsComponent,
    GfPremiumIndicatorComponent,
    MatCardModule,
    MatProgressBarModule,
    MatTabsModule
  ],
  selector: 'gf-allocations-v2-page',
  styleUrls: ['./allocations-v2-page.scss'],
  templateUrl: './allocations-v2-page.html'
})
export class GfAllocationsV2PageComponent implements OnInit {
  public accounts: {
    [id: string]: Pick<Account, 'name'> & {
      id: string;
      value: number;
    };
  };
  public continents: {
    [code: string]: { name: string; value: number };
  };
  public countries: {
    [code: string]: { name: string; value: number };
  };
  public hasImpersonationId: boolean;
  public holdings: {
    [symbol: string]: Pick<
      PortfolioPosition,
      | 'assetClass'
      | 'assetClassLabel'
      | 'assetSubClass'
      | 'assetSubClassLabel'
      | 'currency'
      | 'exchange'
      | 'name'
    > & { etfProvider: string; value: number };
  };
  public isLoading = false;
  public marketsAdvanced: {
    [key in MarketAdvanced]: {
      id: MarketAdvanced;
      name: string;
      value: number;
    };
  };
  public platforms: {
    [id: string]: Pick<Platform, 'name'> & {
      id: string;
      value: number;
    };
  };
  public portfolioDetails: PortfolioDetails;
  public sectors: {
    [name: string]: { name: string; value: number };
  };
  public symbols: {
    [name: string]: {
      dataSource?: DataSource;
      name: string;
      symbol: string;
      value: number;
    };
  };
  public UNKNOWN_KEY = UNKNOWN_KEY;
  public user: User;

  // Toggle between donut-cards (Option 1) and cards-grid (Option 3)
  public selectedTabIndex = 0;

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService,
    private destroyRef: DestroyRef,
    private impersonationStorageService: ImpersonationStorageService,
    private router: Router,
    private userService: UserService
  ) {}

  public ngOnInit() {
    this.impersonationStorageService
      .onChangeHasImpersonation()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((impersonationId) => {
        this.hasImpersonationId = !!impersonationId;
      });

    this.userService.stateChanged
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((state) => {
        if (state?.user) {
          this.user = state.user;

          this.isLoading = true;
          this.initialize();

          this.fetchPortfolioDetails()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((portfolioDetails) => {
              this.initialize();
              this.portfolioDetails = portfolioDetails;
              this.initializeAllocationsData();
              this.isLoading = false;
              this.changeDetectorRef.markForCheck();
            });

          this.changeDetectorRef.markForCheck();
        }
      });

    this.initialize();
  }

  public onSymbolClicked({ dataSource, symbol }: AssetProfileIdentifier) {
    if (dataSource && symbol) {
      this.router.navigate([], {
        queryParams: { dataSource, symbol, holdingDetailDialog: true }
      });
    }
  }

  private extractEtfProvider({
    assetSubClass,
    name
  }: {
    assetSubClass: PortfolioPosition['assetSubClass'];
    name: string;
  }) {
    if (assetSubClass === 'ETF') {
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
      [UNKNOWN_KEY]: { name: UNKNOWN_KEY, value: 0 }
    };
    this.countries = {
      [UNKNOWN_KEY]: { name: UNKNOWN_KEY, value: 0 }
    };
    this.holdings = {};
    this.marketsAdvanced = {
      [UNKNOWN_KEY]: { id: UNKNOWN_KEY, name: UNKNOWN_KEY, value: 0 },
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
      europe: { id: 'europe', name: translate('Europe'), value: 0 },
      japan: { id: 'japan', name: translate('Japan'), value: 0 },
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
      createdAt: undefined,
      holdings: {},
      platforms: {},
      summary: undefined
    };
    this.sectors = {
      [UNKNOWN_KEY]: { name: UNKNOWN_KEY, value: 0 }
    };
    this.symbols = {
      [UNKNOWN_KEY]: { name: UNKNOWN_KEY, symbol: UNKNOWN_KEY, value: 0 }
    };
  }

  private initializeAllocationsData() {
    for (const [
      id,
      { name, valueInBaseCurrency, valueInPercentage }
    ] of Object.entries(this.portfolioDetails.accounts)) {
      let value = 0;
      if (this.hasImpersonationId) {
        value = valueInPercentage;
      } else {
        value = valueInBaseCurrency;
      }
      this.accounts[id] = { id, name, value };
    }

    for (const [symbol, position] of Object.entries(
      this.portfolioDetails.holdings
    )) {
      let value = 0;
      if (this.hasImpersonationId) {
        value = position.allocationInPercentage;
      } else {
        value = position.valueInBaseCurrency;
      }

      this.holdings[symbol] = {
        value,
        assetClass: position.assetClass || (UNKNOWN_KEY as AssetClass),
        assetClassLabel: position.assetClassLabel || UNKNOWN_KEY,
        assetSubClass:
          position.assetSubClass || (UNKNOWN_KEY as AssetSubClass),
        assetSubClassLabel: position.assetSubClassLabel || UNKNOWN_KEY,
        currency: position.currency,
        etfProvider: this.extractEtfProvider({
          assetSubClass: position.assetSubClass,
          name: position.name
        }),
        exchange: position.exchange,
        name: position.name
      };

      if (position.assetClass !== AssetClass.LIQUIDITY) {
        if (position.countries.length > 0) {
          for (const country of position.countries) {
            const { code, continent, name, weight } = country;
            if (this.continents[continent]?.value) {
              this.continents[continent].value +=
                weight *
                (isNumber(position.valueInBaseCurrency)
                  ? position.valueInBaseCurrency
                  : position.valueInPercentage);
            } else {
              this.continents[continent] = {
                name: continent,
                value:
                  weight *
                  (isNumber(position.valueInBaseCurrency)
                    ? this.portfolioDetails.holdings[symbol]
                        .valueInBaseCurrency
                    : this.portfolioDetails.holdings[symbol]
                        .valueInPercentage)
              };
            }

            if (this.countries[code]?.value) {
              this.countries[code].value +=
                weight *
                (isNumber(position.valueInBaseCurrency)
                  ? position.valueInBaseCurrency
                  : position.valueInPercentage);
            } else {
              this.countries[code] = {
                name,
                value:
                  weight *
                  (isNumber(position.valueInBaseCurrency)
                    ? this.portfolioDetails.holdings[symbol]
                        .valueInBaseCurrency
                    : this.portfolioDetails.holdings[symbol]
                        .valueInPercentage)
              };
            }
          }
        } else {
          this.continents[UNKNOWN_KEY].value += isNumber(
            position.valueInBaseCurrency
          )
            ? this.portfolioDetails.holdings[symbol].valueInBaseCurrency
            : this.portfolioDetails.holdings[symbol].valueInPercentage;

          this.countries[UNKNOWN_KEY].value += isNumber(
            position.valueInBaseCurrency
          )
            ? this.portfolioDetails.holdings[symbol].valueInBaseCurrency
            : this.portfolioDetails.holdings[symbol].valueInPercentage;
        }

        if (position.sectors.length > 0) {
          for (const sector of position.sectors) {
            const { name, weight } = sector;
            if (this.sectors[name]?.value) {
              this.sectors[name].value +=
                weight *
                (isNumber(position.valueInBaseCurrency)
                  ? position.valueInBaseCurrency
                  : position.valueInPercentage);
            } else {
              this.sectors[name] = {
                name,
                value:
                  weight *
                  (isNumber(position.valueInBaseCurrency)
                    ? this.portfolioDetails.holdings[symbol]
                        .valueInBaseCurrency
                    : this.portfolioDetails.holdings[symbol]
                        .valueInPercentage)
              };
            }
          }
        } else {
          this.sectors[UNKNOWN_KEY].value += isNumber(
            position.valueInBaseCurrency
          )
            ? this.portfolioDetails.holdings[symbol].valueInBaseCurrency
            : this.portfolioDetails.holdings[symbol].valueInPercentage;
        }
      }

      this.symbols[prettifySymbol(symbol)] = {
        dataSource: position.dataSource,
        name: position.name,
        symbol: prettifySymbol(symbol),
        value: isNumber(position.valueInBaseCurrency)
          ? position.valueInBaseCurrency
          : position.valueInPercentage
      };
    }

    Object.values(this.portfolioDetails.marketsAdvanced).forEach(
      ({ id, valueInBaseCurrency, valueInPercentage }) => {
        this.marketsAdvanced[id].value = isNumber(valueInBaseCurrency)
          ? valueInBaseCurrency
          : valueInPercentage;
      }
    );

    for (const [
      id,
      { name, valueInBaseCurrency, valueInPercentage }
    ] of Object.entries(this.portfolioDetails.platforms)) {
      let value = 0;
      if (this.hasImpersonationId) {
        value = valueInPercentage;
      } else {
        value = valueInBaseCurrency;
      }
      this.platforms[id] = { id, name, value };
    }
  }
}
