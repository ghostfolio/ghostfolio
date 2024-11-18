import { AccountDetailDialog } from '@ghostfolio/client/components/account-detail-dialog/account-detail-dialog.component';
import { AccountDetailDialogParams } from '@ghostfolio/client/components/account-detail-dialog/interfaces/interfaces';
import { DataService } from '@ghostfolio/client/services/data.service';
import { ImpersonationStorageService } from '@ghostfolio/client/services/impersonation-storage.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { MAX_TOP_HOLDINGS, UNKNOWN_KEY } from '@ghostfolio/common/config';
import { prettifySymbol } from '@ghostfolio/common/helper';
import {
  AssetProfileIdentifier,
  HoldingWithParents,
  PortfolioDetails,
  PortfolioPosition,
  User
} from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { Market, MarketAdvanced } from '@ghostfolio/common/types';
import { translate } from '@ghostfolio/ui/i18n';

import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { Account, AssetClass, DataSource, Platform } from '@prisma/client';
import { isNumber } from 'lodash';
import { DeviceDetectorService } from 'ngx-device-detector';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'gf-allocations-page',
  styleUrls: ['./allocations-page.scss'],
  templateUrl: './allocations-page.html'
})
export class AllocationsPageComponent implements OnDestroy, OnInit {
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
  public deviceType: string;
  public hasImpersonationId: boolean;
  public isLoading = false;
  public markets: {
    [key in Market]: { id: Market; valueInPercentage: number };
  };
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
  public positions: {
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
  public topHoldings: HoldingWithParents[];
  public topHoldingsMap: {
    [name: string]: { name: string; value: number };
  };
  public totalValueInEtf = 0;
  public UNKNOWN_KEY = UNKNOWN_KEY;
  public user: User;
  public worldMapChartFormat: string;

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
        if (params['accountId'] && params['accountDetailDialog']) {
          this.openAccountDetailDialog(params['accountId']);
        }
      });
  }

  public ngOnInit() {
    this.deviceType = this.deviceService.getDeviceInfo().deviceType;

    this.impersonationStorageService
      .onChangeHasImpersonation()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((impersonationId) => {
        this.hasImpersonationId = !!impersonationId;
      });

    this.userService.stateChanged
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((state) => {
        if (state?.user) {
          this.user = state.user;

          this.worldMapChartFormat =
            this.hasImpersonationId || this.user.settings.isRestrictedView
              ? `{0}%`
              : `{0} ${this.user?.settings?.baseCurrency}`;

          this.isLoading = true;

          this.initialize();

          this.fetchPortfolioDetails()
            .pipe(takeUntil(this.unsubscribeSubject))
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

  public onAccountChartClicked({ symbol }: AssetProfileIdentifier) {
    if (symbol && symbol !== UNKNOWN_KEY) {
      this.router.navigate([], {
        queryParams: { accountId: symbol, accountDetailDialog: true }
      });
    }
  }

  public onSymbolChartClicked({ dataSource, symbol }: AssetProfileIdentifier) {
    if (dataSource && symbol) {
      this.router.navigate([], {
        queryParams: { dataSource, symbol, holdingDetailDialog: true }
      });
    }
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
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
      holdings: {},
      platforms: {},
      summary: undefined
    };
    this.positions = {};
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

      if (this.hasImpersonationId) {
        value = valueInPercentage;
      } else {
        value = valueInBaseCurrency;
      }

      this.accounts[id] = {
        id,
        name,
        value
      };
    }

    this.markets = this.portfolioDetails.markets;

    Object.values(this.portfolioDetails.marketsAdvanced).forEach(
      ({ id, valueInBaseCurrency, valueInPercentage }) => {
        this.marketsAdvanced[id].value = isNumber(valueInBaseCurrency)
          ? valueInBaseCurrency
          : valueInPercentage;
      }
    );

    for (const [symbol, position] of Object.entries(
      this.portfolioDetails.holdings
    )) {
      let value = 0;

      if (this.hasImpersonationId) {
        value = position.allocationInPercentage;
      } else {
        value = position.valueInBaseCurrency;
      }

      this.positions[symbol] = {
        value,
        assetClass: position.assetClass,
        assetClassLabel: position.assetClassLabel,
        assetSubClass: position.assetSubClass,
        assetSubClassLabel: position.assetSubClassLabel,
        currency: position.currency,
        etfProvider: this.extractEtfProvider({
          assetSubClass: position.assetSubClass,
          name: position.name
        }),
        exchange: position.exchange,
        name: position.name
      };

      if (position.assetClass !== AssetClass.LIQUIDITY) {
        // Prepare analysis data by continents, countries, holdings and sectors except for liquidity

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
                    ? this.portfolioDetails.holdings[symbol].valueInBaseCurrency
                    : this.portfolioDetails.holdings[symbol].valueInPercentage)
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
                    ? this.portfolioDetails.holdings[symbol].valueInBaseCurrency
                    : this.portfolioDetails.holdings[symbol].valueInPercentage)
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

        if (position.holdings.length > 0) {
          for (const holding of position.holdings) {
            const { allocationInPercentage, name, valueInBaseCurrency } =
              holding;

            if (this.topHoldingsMap[name]?.value) {
              this.topHoldingsMap[name].value += isNumber(valueInBaseCurrency)
                ? valueInBaseCurrency
                : allocationInPercentage *
                  this.portfolioDetails.holdings[symbol].valueInPercentage;
            } else {
              this.topHoldingsMap[name] = {
                name,
                value: isNumber(valueInBaseCurrency)
                  ? valueInBaseCurrency
                  : allocationInPercentage *
                    this.portfolioDetails.holdings[symbol].valueInPercentage
              };
            }
          }
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
                    ? this.portfolioDetails.holdings[symbol].valueInBaseCurrency
                    : this.portfolioDetails.holdings[symbol].valueInPercentage)
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

      if (this.positions[symbol].assetSubClass === 'ETF') {
        this.totalValueInEtf += this.positions[symbol].value;
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

      this.platforms[id] = {
        id,
        name,
        value
      };
    }

    this.topHoldings = Object.values(this.topHoldingsMap)
      .map(({ name, value }) => {
        if (this.hasImpersonationId || this.user.settings.isRestrictedView) {
          return {
            name,
            allocationInPercentage: value,
            valueInBaseCurrency: null
          };
        }

        return {
          name,
          allocationInPercentage:
            this.totalValueInEtf > 0 ? value / this.totalValueInEtf : 0,
          parents: Object.entries(this.portfolioDetails.holdings)
            .map(([symbol, holding]) => {
              if (holding.holdings.length > 0) {
                const parentHolding = holding.holdings.find((parentHolding) => {
                  return parentHolding.name === name;
                });
                return parentHolding
                  ? {
                      allocationInPercentage:
                        parentHolding.valueInBaseCurrency / value,
                      name: holding.name,
                      position: holding,
                      symbol: prettifySymbol(symbol),
                      valueInBaseCurrency: parentHolding.valueInBaseCurrency
                    }
                  : null;
              }

              return null;
            })
            .filter((item) => null !== item)
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

  private openAccountDetailDialog(aAccountId: string) {
    const dialogRef = this.dialog.open(AccountDetailDialog, {
      autoFocus: false,
      data: {
        accountId: aAccountId,
        deviceType: this.deviceType,
        hasImpersonationId: this.hasImpersonationId,
        hasPermissionToCreateOrder:
          !this.hasImpersonationId &&
          hasPermission(this.user?.permissions, permissions.createOrder) &&
          !this.user?.settings?.isRestrictedView
      } as AccountDetailDialogParams,
      height: this.deviceType === 'mobile' ? '98vh' : '80vh',
      width: this.deviceType === 'mobile' ? '100vw' : '50rem'
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(() => {
        this.router.navigate(['.'], { relativeTo: this.route });
      });
  }
}
