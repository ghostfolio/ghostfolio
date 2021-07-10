import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ToggleOption } from '@ghostfolio/client/components/toggle/interfaces/toggle-option.type';
import { DataService } from '@ghostfolio/client/services/data.service';
import { ImpersonationStorageService } from '@ghostfolio/client/services/impersonation-storage.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { UNKNOWN_KEY } from '@ghostfolio/common/config';
import {
  PortfolioItem,
  PortfolioPosition,
  User
} from '@ghostfolio/common/interfaces';
import { DeviceDetectorService } from 'ngx-device-detector';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'gf-analysis-page',
  templateUrl: './analysis-page.html',
  styleUrls: ['./analysis-page.scss']
})
export class AnalysisPageComponent implements OnDestroy, OnInit {
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
  public portfolioItems: PortfolioItem[];
  public portfolioPositions: { [symbol: string]: PortfolioPosition };
  public positions: { [symbol: string]: any };
  public positionsArray: PortfolioPosition[];
  public sectors: {
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
      .fetchPortfolio()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((response) => {
        this.portfolioItems = response;

        this.changeDetectorRef.markForCheck();
      });

    this.dataService
      .fetchPortfolioPositions({})
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((response = {}) => {
        this.portfolioPositions = response;
        this.initializeAnalysisData(this.portfolioPositions, this.period);

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

  public initializeAnalysisData(
    aPortfolioPositions: {
      [symbol: string]: PortfolioPosition;
    },
    aPeriod: string
  ) {
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

    for (const [symbol, position] of Object.entries(aPortfolioPositions)) {
      this.positions[symbol] = {
        currency: position.currency,
        exchange: position.exchange,
        type: position.type,
        value:
          aPeriod === 'original'
            ? position.allocationInvestment
            : position.allocationCurrent
      };
      this.positionsArray.push(position);

      for (const [account, { current, original }] of Object.entries(
        position.accounts
      )) {
        if (this.accounts[account]?.value) {
          this.accounts[account].value +=
            aPeriod === 'original' ? original : current;
        } else {
          this.accounts[account] = {
            name: account,
            value: aPeriod === 'original' ? original : current
          };
        }
      }

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
                  ? this.portfolioPositions[symbol].investment
                  : this.portfolioPositions[symbol].value)
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
                  ? this.portfolioPositions[symbol].investment
                  : this.portfolioPositions[symbol].value)
            };
          }
        }
      } else {
        this.continents[UNKNOWN_KEY].value +=
          aPeriod === 'original'
            ? this.portfolioPositions[symbol].investment
            : this.portfolioPositions[symbol].value;

        this.countries[UNKNOWN_KEY].value +=
          aPeriod === 'original'
            ? this.portfolioPositions[symbol].investment
            : this.portfolioPositions[symbol].value;
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
                  ? this.portfolioPositions[symbol].investment
                  : this.portfolioPositions[symbol].value)
            };
          }
        }
      } else {
        this.sectors[UNKNOWN_KEY].value +=
          aPeriod === 'original'
            ? this.portfolioPositions[symbol].investment
            : this.portfolioPositions[symbol].value;
      }
    }
  }

  public onChangePeriod(aValue: string) {
    this.period = aValue;

    this.initializeAnalysisData(this.portfolioPositions, this.period);
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
