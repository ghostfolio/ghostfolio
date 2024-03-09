import { AccountDetailDialog } from '@ghostfolio/client/components/account-detail-dialog/account-detail-dialog.component';
import { AccountDetailDialogParams } from '@ghostfolio/client/components/account-detail-dialog/interfaces/interfaces';
import { PositionDetailDialogParams } from '@ghostfolio/client/components/position/position-detail-dialog/interfaces/interfaces';
import { PositionDetailDialog } from '@ghostfolio/client/components/position/position-detail-dialog/position-detail-dialog.component';
import { DataService } from '@ghostfolio/client/services/data.service';
import { ImpersonationStorageService } from '@ghostfolio/client/services/impersonation-storage.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { UNKNOWN_KEY } from '@ghostfolio/common/config';
import { prettifySymbol } from '@ghostfolio/common/helper';
import {
  PortfolioDetails,
  PortfolioPosition,
  UniqueAsset,
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
    [key in Market]: { name: string; value: number };
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
    route.queryParams
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((params) => {
        if (params['accountId'] && params['accountDetailDialog']) {
          this.openAccountDetailDialog(params['accountId']);
        } else if (
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

  public onAccountChartClicked({ symbol }: UniqueAsset) {
    if (symbol && symbol !== UNKNOWN_KEY) {
      this.router.navigate([], {
        queryParams: { accountId: symbol, accountDetailDialog: true }
      });
    }
  }

  public onSymbolChartClicked({ dataSource, symbol }: UniqueAsset) {
    if (dataSource && symbol) {
      this.router.navigate([], {
        queryParams: { dataSource, symbol, positionDetailDialog: true }
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
      filters: this.userService.getFilters()
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
    this.markets = {
      [UNKNOWN_KEY]: {
        name: UNKNOWN_KEY,
        value: 0
      },
      developedMarkets: {
        name: 'developedMarkets',
        value: 0
      },
      emergingMarkets: {
        name: 'emergingMarkets',
        value: 0
      },
      otherMarkets: {
        name: 'otherMarkets',
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

      if (position.assetClass !== AssetClass.CASH) {
        // Prepare analysis data by continents, countries and sectors except for cash

        if (position.countries.length > 0) {
          this.markets.developedMarkets.value +=
            position.markets.developedMarkets *
            (isNumber(position.valueInBaseCurrency)
              ? position.valueInBaseCurrency
              : position.valueInPercentage);
          this.markets.emergingMarkets.value +=
            position.markets.emergingMarkets *
            (isNumber(position.valueInBaseCurrency)
              ? position.valueInBaseCurrency
              : position.valueInPercentage);
          this.markets.otherMarkets.value +=
            position.markets.otherMarkets *
            (isNumber(position.valueInBaseCurrency)
              ? position.valueInBaseCurrency
              : position.valueInPercentage);

          this.marketsAdvanced.asiaPacific.value +=
            position.marketsAdvanced.asiaPacific *
            (isNumber(position.valueInBaseCurrency)
              ? position.valueInBaseCurrency
              : position.valueInPercentage);
          this.marketsAdvanced.emergingMarkets.value +=
            position.marketsAdvanced.emergingMarkets *
            (isNumber(position.valueInBaseCurrency)
              ? position.valueInBaseCurrency
              : position.valueInPercentage);
          this.marketsAdvanced.europe.value +=
            position.marketsAdvanced.europe *
            (isNumber(position.valueInBaseCurrency)
              ? position.valueInBaseCurrency
              : position.valueInPercentage);
          this.marketsAdvanced.japan.value +=
            position.marketsAdvanced.japan *
            (isNumber(position.valueInBaseCurrency)
              ? position.valueInBaseCurrency
              : position.valueInPercentage);
          this.marketsAdvanced.northAmerica.value +=
            position.marketsAdvanced.northAmerica *
            (isNumber(position.valueInBaseCurrency)
              ? position.valueInBaseCurrency
              : position.valueInPercentage);

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

          this.markets[UNKNOWN_KEY].value += isNumber(
            position.valueInBaseCurrency
          )
            ? this.portfolioDetails.holdings[symbol].valueInBaseCurrency
            : this.portfolioDetails.holdings[symbol].valueInPercentage;

          this.marketsAdvanced[UNKNOWN_KEY].value += isNumber(
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

    const marketsTotal =
      this.markets.developedMarkets.value +
      this.markets.emergingMarkets.value +
      this.markets.otherMarkets.value +
      this.markets[UNKNOWN_KEY].value;

    this.markets.developedMarkets.value =
      this.markets.developedMarkets.value / marketsTotal;
    this.markets.emergingMarkets.value =
      this.markets.emergingMarkets.value / marketsTotal;
    this.markets.otherMarkets.value =
      this.markets.otherMarkets.value / marketsTotal;
    this.markets[UNKNOWN_KEY].value =
      this.markets[UNKNOWN_KEY].value / marketsTotal;
  }

  private openAccountDetailDialog(aAccountId: string) {
    const dialogRef = this.dialog.open(AccountDetailDialog, {
      autoFocus: false,
      data: <AccountDetailDialogParams>{
        accountId: aAccountId,
        deviceType: this.deviceType,
        hasImpersonationId: this.hasImpersonationId
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
            colorScheme: this.user?.settings?.colorScheme,
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
