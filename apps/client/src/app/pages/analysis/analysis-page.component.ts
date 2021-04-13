import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { PortfolioItem } from 'apps/api/src/app/portfolio/interfaces/portfolio-item.interface';
import { PortfolioPosition } from 'apps/api/src/app/portfolio/interfaces/portfolio-position.interface';
import { User } from 'apps/api/src/app/user/interfaces/user.interface';
import { DeviceDetectorService } from 'ngx-device-detector';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { ToggleOption } from '../../components/toggle/interfaces/toggle-option.type';
import { DataService } from '../../services/data.service';
import { ImpersonationStorageService } from '../../services/impersonation-storage.service';
import { TokenStorageService } from '../../services/token-storage.service';

@Component({
  selector: 'gf-analysis-page',
  templateUrl: './analysis-page.html',
  styleUrls: ['./analysis-page.scss']
})
export class AnalysisPageComponent implements OnDestroy, OnInit {
  public deviceType: string;
  public period = 'current';
  public periodOptions: ToggleOption[] = [
    { label: 'Initial', value: 'original' },
    { label: 'Current', value: 'current' }
  ];
  public hasImpersonationId: boolean;
  public platforms: {
    [symbol: string]: Pick<PortfolioPosition, 'name'> & { value: number };
  };
  public portfolioItems: PortfolioItem[];
  public portfolioPositions: { [symbol: string]: PortfolioPosition };
  public positions: { [symbol: string]: any };
  public positionsArray: PortfolioPosition[];
  public user: User;

  private unsubscribeSubject = new Subject<void>();

  /**
   * @constructor
   */
  public constructor(
    private cd: ChangeDetectorRef,
    private dataService: DataService,
    private deviceService: DeviceDetectorService,
    private impersonationStorageService: ImpersonationStorageService,
    private tokenStorageService: TokenStorageService
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

        this.cd.markForCheck();
      });

    this.dataService
      .fetchPortfolioPositions({})
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((response = {}) => {
        this.portfolioPositions = response;
        this.initializeAnalysisData(this.portfolioPositions, this.period);

        this.cd.markForCheck();
      });

    this.tokenStorageService
      .onChangeHasToken()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(() => {
        this.dataService.fetchUser().subscribe((user) => {
          this.user = user;

          this.cd.markForCheck();
        });
      });
  }

  public initializeAnalysisData(
    aPortfolioPositions: {
      [symbol: string]: PortfolioPosition;
    },
    aPeriod: string
  ) {
    this.platforms = {};
    this.positions = {};
    this.positionsArray = [];

    for (const [symbol, position] of Object.entries(aPortfolioPositions)) {
      this.positions[symbol] = {
        currency: position.currency,
        exchange: position.exchange,
        industry: position.industry,
        sector: position.sector,
        type: position.type,
        value:
          aPeriod === 'original'
            ? position.shareInvestment
            : position.shareCurrent
      };
      this.positionsArray.push(position);

      for (const [platform, { current, original }] of Object.entries(
        position.platforms
      )) {
        if (this.platforms[platform]?.value) {
          this.platforms[platform].value +=
            aPeriod === 'original' ? original : current;
        } else {
          this.platforms[platform] = {
            value: aPeriod === 'original' ? original : current,
            name: platform
          };
        }
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
