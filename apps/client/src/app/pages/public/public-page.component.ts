import { UNKNOWN_KEY } from '@ghostfolio/common/config';
import { prettifySymbol } from '@ghostfolio/common/helper';
import {
  InfoItem,
  PortfolioPosition,
  PublicPortfolioResponse
} from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { Market } from '@ghostfolio/common/types';
import { GfActivitiesTableComponent } from '@ghostfolio/ui/activities-table/activities-table.component';
import { GfHoldingsTableComponent } from '@ghostfolio/ui/holdings-table/holdings-table.component';
import { GfPortfolioProportionChartComponent } from '@ghostfolio/ui/portfolio-proportion-chart/portfolio-proportion-chart.component';
import { DataService } from '@ghostfolio/ui/services';
import { GfValueComponent } from '@ghostfolio/ui/value';
import { GfWorldMapChartComponent } from '@ghostfolio/ui/world-map-chart';

import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectorRef,
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  DestroyRef,
  inject,
  OnInit
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatTableDataSource } from '@angular/material/table';
import { ActivatedRoute, Router } from '@angular/router';
import { AssetClass } from '@prisma/client';
import { StatusCodes } from 'http-status-codes';
import { isNumber } from 'lodash';
import { DeviceDetectorService } from 'ngx-device-detector';
import { EMPTY } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  host: { class: 'page' },
  imports: [
    CommonModule,
    GfActivitiesTableComponent,
    GfHoldingsTableComponent,
    GfPortfolioProportionChartComponent,
    GfValueComponent,
    GfWorldMapChartComponent,
    MatButtonModule,
    MatCardModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'gf-public-page',
  styleUrls: ['./public-page.scss'],
  templateUrl: './public-page.html'
})
export class GfPublicPageComponent implements OnInit {
  protected continents: {
    [code: string]: { name: string; value: number };
  };
  protected countries: {
    [code: string]: { name: string; value: number };
  };
  protected readonly defaultAlias = $localize`someone`;
  protected readonly deviceType = computed(
    () => this.deviceDetectorService.deviceInfo().deviceType
  );
  protected hasPermissionForSubscription: boolean;
  protected holdings: PublicPortfolioResponse['holdings'][string][];
  protected info: InfoItem;
  protected latestActivitiesDataSource: MatTableDataSource<
    PublicPortfolioResponse['latestActivities'][0]
  >;
  protected markets: {
    [key in Market]: { id: Market; valueInPercentage: number };
  };
  protected readonly pageSize = Number.MAX_SAFE_INTEGER;
  protected positions: {
    [symbol: string]: Pick<PortfolioPosition, 'currency' | 'name'> & {
      value: number;
    };
  };
  protected publicPortfolioDetails: PublicPortfolioResponse;
  protected sectors: {
    [name: string]: { name: string; value: number };
  };
  protected symbols: {
    [name: string]: { name: string; symbol: string; value: number };
  };
  protected readonly UNKNOWN_KEY = UNKNOWN_KEY;

  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly dataService = inject(DataService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly deviceDetectorService = inject(DeviceDetectorService);
  private readonly router = inject(Router);

  private accessId: string;

  public constructor() {
    this.activatedRoute.params.subscribe((params) => {
      this.accessId = params['id'];
    });

    this.info = this.dataService.fetchInfo();

    this.hasPermissionForSubscription = hasPermission(
      this.info?.globalPermissions,
      permissions.enableSubscription
    );
  }

  public ngOnInit() {
    this.dataService
      .fetchPublicPortfolio(this.accessId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((error: HttpErrorResponse) => {
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

        this.latestActivitiesDataSource = new MatTableDataSource(
          this.publicPortfolioDetails.latestActivities
        );

        this.changeDetectorRef.markForCheck();
      });
  }

  private initializeAnalysisData() {
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
                weight * (position.valueInBaseCurrency ?? 0);
            } else {
              this.continents[continent] = {
                name: continent,
                value:
                  weight *
                  (this.publicPortfolioDetails.holdings[symbol]
                    .valueInBaseCurrency ?? 0)
              };
            }

            if (this.countries[code]?.value) {
              this.countries[code].value +=
                weight * (position.valueInBaseCurrency ?? 0);
            } else {
              this.countries[code] = {
                name,
                value:
                  weight *
                  (this.publicPortfolioDetails.holdings[symbol]
                    .valueInBaseCurrency ?? 0)
              };
            }
          }
        } else {
          this.continents[UNKNOWN_KEY].value +=
            this.publicPortfolioDetails.holdings[symbol].valueInBaseCurrency ??
            0;

          this.countries[UNKNOWN_KEY].value +=
            this.publicPortfolioDetails.holdings[symbol].valueInBaseCurrency ??
            0;
        }

        if (position.sectors.length > 0) {
          for (const sector of position.sectors) {
            const { name, weight } = sector;

            if (this.sectors[name]?.value) {
              this.sectors[name].value +=
                weight * (position.valueInBaseCurrency ?? 0);
            } else {
              this.sectors[name] = {
                name,
                value:
                  weight *
                  (this.publicPortfolioDetails.holdings[symbol]
                    .valueInBaseCurrency ?? 0)
              };
            }
          }
        } else {
          this.sectors[UNKNOWN_KEY].value +=
            this.publicPortfolioDetails.holdings[symbol].valueInBaseCurrency ??
            0;
        }
      }

      this.symbols[prettifySymbol(symbol)] = {
        name: position.name,
        symbol: prettifySymbol(symbol),
        value: isNumber(position.valueInBaseCurrency)
          ? position.valueInBaseCurrency
          : (position.valueInPercentage ?? 0)
      };
    }
  }
}
