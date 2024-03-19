import { DataService } from '@ghostfolio/client/services/data.service';
import { UNKNOWN_KEY } from '@ghostfolio/common/config';
import { prettifySymbol } from '@ghostfolio/common/helper';
import {
  PortfolioPosition,
  PortfolioPublicDetails
} from '@ghostfolio/common/interfaces';
import { Market } from '@ghostfolio/common/types';

import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { StatusCodes } from 'http-status-codes';
import { isNumber } from 'lodash';
import { DeviceDetectorService } from 'ngx-device-detector';
import { EMPTY, Subject } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';

@Component({
  host: { class: 'page' },
  selector: 'gf-public-page',
  styleUrls: ['./public-page.scss'],
  templateUrl: './public-page.html'
})
export class PublicPageComponent implements OnInit {
  public continents: {
    [code: string]: { name: string; value: number };
  };
  public countries: {
    [code: string]: { name: string; value: number };
  };
  public deviceType: string;
  public holdings: PortfolioPublicDetails['holdings'][string][];
  public markets: {
    [key in Market]: { name: string; value: number };
  };
  public portfolioPublicDetails: PortfolioPublicDetails;
  public positions: {
    [symbol: string]: Pick<PortfolioPosition, 'currency' | 'name'> & {
      value: number;
    };
  };
  public sectors: {
    [name: string]: { name: string; value: number };
  };
  public symbols: {
    [name: string]: { name: string; symbol: string; value: number };
  };
  public UNKNOWN_KEY = UNKNOWN_KEY;

  private id: string;
  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private activatedRoute: ActivatedRoute,
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService,
    private deviceService: DeviceDetectorService,
    private router: Router
  ) {
    this.activatedRoute.params.subscribe((params) => {
      this.id = params['id'];
    });
  }

  public ngOnInit() {
    this.deviceType = this.deviceService.getDeviceInfo().deviceType;

    this.dataService
      .fetchPortfolioPublic(this.id)
      .pipe(
        takeUntil(this.unsubscribeSubject),
        catchError((error) => {
          if (error.status === StatusCodes.NOT_FOUND) {
            console.error(error);
            this.router.navigate(['/']);
          }

          return EMPTY;
        })
      )
      .subscribe((portfolioPublicDetails) => {
        this.portfolioPublicDetails = portfolioPublicDetails;

        this.initializeAnalysisData();

        this.changeDetectorRef.markForCheck();
      });
  }

  public initializeAnalysisData() {
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
    this.holdings = [];
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

    for (const [symbol, position] of Object.entries(
      this.portfolioPublicDetails.holdings
    )) {
      this.holdings.push(position);

      this.positions[symbol] = {
        currency: position.currency,
        name: position.name,
        value: position.allocationInPercentage
      };

      if (position.countries.length > 0) {
        this.markets.developedMarkets.value +=
          position.markets.developedMarkets * position.valueInBaseCurrency;
        this.markets.emergingMarkets.value +=
          position.markets.emergingMarkets * position.valueInBaseCurrency;
        this.markets.otherMarkets.value +=
          position.markets.otherMarkets * position.valueInBaseCurrency;

        for (const country of position.countries) {
          const { code, continent, name, weight } = country;

          if (this.continents[continent]?.value) {
            this.continents[continent].value +=
              weight * position.valueInBaseCurrency;
          } else {
            this.continents[continent] = {
              name: continent,
              value:
                weight *
                this.portfolioPublicDetails.holdings[symbol].valueInBaseCurrency
            };
          }

          if (this.countries[code]?.value) {
            this.countries[code].value += weight * position.valueInBaseCurrency;
          } else {
            this.countries[code] = {
              name,
              value:
                weight *
                this.portfolioPublicDetails.holdings[symbol].valueInBaseCurrency
            };
          }
        }
      } else {
        this.continents[UNKNOWN_KEY].value +=
          this.portfolioPublicDetails.holdings[symbol].valueInBaseCurrency;

        this.countries[UNKNOWN_KEY].value +=
          this.portfolioPublicDetails.holdings[symbol].valueInBaseCurrency;

        this.markets[UNKNOWN_KEY].value +=
          this.portfolioPublicDetails.holdings[symbol].valueInBaseCurrency;
      }

      if (position.sectors.length > 0) {
        for (const sector of position.sectors) {
          const { name, weight } = sector;

          if (this.sectors[name]?.value) {
            this.sectors[name].value += weight * position.valueInBaseCurrency;
          } else {
            this.sectors[name] = {
              name,
              value:
                weight *
                this.portfolioPublicDetails.holdings[symbol].valueInBaseCurrency
            };
          }
        }
      } else {
        this.sectors[UNKNOWN_KEY].value +=
          this.portfolioPublicDetails.holdings[symbol].valueInBaseCurrency;
      }

      this.symbols[prettifySymbol(symbol)] = {
        name: position.name,
        symbol: prettifySymbol(symbol),
        value: isNumber(position.valueInBaseCurrency)
          ? position.valueInBaseCurrency
          : position.valueInPercentage
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

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
