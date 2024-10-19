import { DataService } from '@ghostfolio/client/services/data.service';
import { UNKNOWN_KEY } from '@ghostfolio/common/config';
import { prettifySymbol } from '@ghostfolio/common/helper';
import {
  PortfolioPosition,
  PublicPortfolioResponse
} from '@ghostfolio/common/interfaces';
import { Market } from '@ghostfolio/common/types';

import { ChangeDetectorRef, Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AssetClass } from '@prisma/client';
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
export class PublicPageComponent {
  public continents: {
    [code: string]: { name: string; value: number };
  };
  public countries: {
    [code: string]: { name: string; value: number };
  };
  public deviceType: string;
  public holdings: PublicPortfolioResponse['holdings'][string][];
  public markets: {
    [key in Market]: { id: Market; valueInPercentage: number };
  };
  public positions: {
    [symbol: string]: Pick<PortfolioPosition, 'currency' | 'name'> & {
      value: number;
    };
  };
  public publicPortfolioDetails: PublicPortfolioResponse;
  public sectors: {
    [name: string]: { name: string; value: number };
  };
  public symbols: {
    [name: string]: { name: string; symbol: string; value: number };
  };
  public UNKNOWN_KEY = UNKNOWN_KEY;

  private accessId: string;
  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private activatedRoute: ActivatedRoute,
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService,
    private deviceService: DeviceDetectorService,
    private router: Router
  ) {
    this.activatedRoute.params.subscribe((params) => {
      this.accessId = params['id'];
    });
  }

  public ngOnInit() {
    this.deviceType = this.deviceService.getDeviceInfo().deviceType;

    this.dataService
      .fetchPublicPortfolio(this.accessId)
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
        this.publicPortfolioDetails = portfolioPublicDetails;

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
    this.markets = this.publicPortfolioDetails.markets;
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
      this.publicPortfolioDetails.holdings
    )) {
      this.holdings.push(position);

      this.positions[symbol] = {
        currency: position.currency,
        name: position.name,
        value: position.allocationInPercentage
      };

      if (position.assetClass !== AssetClass.LIQUIDITY) {
        // Prepare analysis data by continents, countries, holdings and sectors except for liquidity

        if (position.countries.length > 0) {
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
                  this.publicPortfolioDetails.holdings[symbol]
                    .valueInBaseCurrency
              };
            }

            if (this.countries[code]?.value) {
              this.countries[code].value +=
                weight * position.valueInBaseCurrency;
            } else {
              this.countries[code] = {
                name,
                value:
                  weight *
                  this.publicPortfolioDetails.holdings[symbol]
                    .valueInBaseCurrency
              };
            }
          }
        } else {
          this.continents[UNKNOWN_KEY].value +=
            this.publicPortfolioDetails.holdings[symbol].valueInBaseCurrency;

          this.countries[UNKNOWN_KEY].value +=
            this.publicPortfolioDetails.holdings[symbol].valueInBaseCurrency;
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
                  this.publicPortfolioDetails.holdings[symbol]
                    .valueInBaseCurrency
              };
            }
          }
        } else {
          this.sectors[UNKNOWN_KEY].value +=
            this.publicPortfolioDetails.holdings[symbol].valueInBaseCurrency;
        }
      }

      this.symbols[prettifySymbol(symbol)] = {
        name: position.name,
        symbol: prettifySymbol(symbol),
        value: isNumber(position.valueInBaseCurrency)
          ? position.valueInBaseCurrency
          : position.valueInPercentage
      };
    }
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
