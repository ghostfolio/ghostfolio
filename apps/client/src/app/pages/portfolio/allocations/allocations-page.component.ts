import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ToggleOption } from '@ghostfolio/client/components/toggle/interfaces/toggle-option.type';
import { DataService } from '@ghostfolio/client/services/data.service';
import { ImpersonationStorageService } from '@ghostfolio/client/services/impersonation-storage.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { UNKNOWN_KEY } from '@ghostfolio/common/config';
import {
  PortfolioDetails,
  PortfolioPosition,
  User
} from '@ghostfolio/common/interfaces';
import { AssetClass } from '@prisma/client';
import { DeviceDetectorService } from 'ngx-device-detector';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'gf-allocations-page',
  templateUrl: './allocations-page.html',
  styleUrls: ['./allocations-page.scss']
})
export class AllocationsPageComponent implements OnDestroy, OnInit {
  public accounts: {
    [symbol: string]: Pick<PortfolioPosition, 'name'> & { value: number };
  };
  public continents: {
    [code: string]: { name: string; value: number };
  };
  public countries: {
    [code: string]: { name: string; value: number };
  };
  public deviceType: string;
  public hasImpersonationId: boolean;
  public period = 'current';
  public periodOptions: ToggleOption[] = [
    { label: 'Initial', value: 'original' },
    { label: 'Current', value: 'current' }
  ];
  public portfolioDetails: PortfolioDetails;
  public positions: { [symbol: string]: any };
  public positionsArray: PortfolioPosition[];
  public sectors: {
    [name: string]: { name: string; value: number };
  };
  public symbols: {
    [name: string]: { name: string; value: number };
  };

  public user: User;

  private unsubscribeSubject = new Subject<void>();

  /**
   * @constructor
   */
  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService,
    private deviceService: DeviceDetectorService,
    private impersonationStorageService: ImpersonationStorageService,
    private userService: UserService
  ) {}

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

    this.dataService
      .fetchPortfolioDetails({})
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((portfolioDetails) => {
        this.portfolioDetails = portfolioDetails;

        this.initializeAnalysisData(this.period);

        this.changeDetectorRef.markForCheck();
      });

    this.userService.stateChanged
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((state) => {
        if (state?.user) {
          this.user = state.user;

          this.changeDetectorRef.markForCheck();
        }
      });
  }

  public initializeAnalysisData(aPeriod: string) {
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
    this.positions = {};
    this.positionsArray = [];
    this.sectors = {
      [UNKNOWN_KEY]: {
        name: UNKNOWN_KEY,
        value: 0
      }
    };
    this.symbols = {
      [UNKNOWN_KEY]: {
        name: UNKNOWN_KEY,
        value: 0
      }
    };

    for (const [name, { current, original }] of Object.entries(
      this.portfolioDetails.accounts
    )) {
      this.accounts[name] = {
        name,
        value: aPeriod === 'original' ? original : current
      };
    }

    for (const [symbol, position] of Object.entries(
      this.portfolioDetails.holdings
    )) {
      this.positions[symbol] = {
        assetClass: position.assetClass,
        assetSubClass: position.assetSubClass,
        currency: position.currency,
        exchange: position.exchange,
        value:
          aPeriod === 'original'
            ? position.allocationInvestment
            : position.allocationCurrent
      };
      this.positionsArray.push(position);

      if (position.assetClass !== AssetClass.CASH) {
        // Prepare analysis data by continents, countries and sectors except for cash

        if (position.countries.length > 0) {
          for (const country of position.countries) {
            const { code, continent, name, weight } = country;

            if (this.continents[continent]?.value) {
              this.continents[continent].value += weight * position.value;
            } else {
              this.continents[continent] = {
                name: continent,
                value:
                  weight *
                  (aPeriod === 'original'
                    ? this.portfolioDetails.holdings[symbol].investment
                    : this.portfolioDetails.holdings[symbol].value)
              };
            }

            if (this.countries[code]?.value) {
              this.countries[code].value += weight * position.value;
            } else {
              this.countries[code] = {
                name,
                value:
                  weight *
                  (aPeriod === 'original'
                    ? this.portfolioDetails.holdings[symbol].investment
                    : this.portfolioDetails.holdings[symbol].value)
              };
            }
          }
        } else {
          this.continents[UNKNOWN_KEY].value +=
            aPeriod === 'original'
              ? this.portfolioDetails.holdings[symbol].investment
              : this.portfolioDetails.holdings[symbol].value;

          this.countries[UNKNOWN_KEY].value +=
            aPeriod === 'original'
              ? this.portfolioDetails.holdings[symbol].investment
              : this.portfolioDetails.holdings[symbol].value;
        }

        if (position.sectors.length > 0) {
          for (const sector of position.sectors) {
            const { name, weight } = sector;

            if (this.sectors[name]?.value) {
              this.sectors[name].value += weight * position.value;
            } else {
              this.sectors[name] = {
                name,
                value:
                  weight *
                  (aPeriod === 'original'
                    ? this.portfolioDetails.holdings[symbol].investment
                    : this.portfolioDetails.holdings[symbol].value)
              };
            }
          }
        } else {
          this.sectors[UNKNOWN_KEY].value +=
            aPeriod === 'original'
              ? this.portfolioDetails.holdings[symbol].investment
              : this.portfolioDetails.holdings[symbol].value;
        }
      }

      if (position.assetClass === AssetClass.EQUITY) {
        this.symbols[symbol] = {
          name: symbol,
          value: aPeriod === 'original' ? position.investment : position.value
        };
      }
    }
  }

  public onChangePeriod(aValue: string) {
    this.period = aValue;

    this.initializeAnalysisData(this.period);
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
