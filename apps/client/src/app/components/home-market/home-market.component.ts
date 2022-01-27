import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { HistoricalDataItem } from '@ghostfolio/api/app/portfolio/interfaces/portfolio-position-detail.interface';
import { DataService } from '@ghostfolio/client/services/data.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { ghostfolioFearAndGreedIndexSymbol } from '@ghostfolio/common/config';
import { resetHours } from '@ghostfolio/common/helper';
import { User } from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { DataSource } from '@prisma/client';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'gf-home-market',
  styleUrls: ['./home-market.scss'],
  templateUrl: './home-market.html'
})
export class HomeMarketComponent implements OnDestroy, OnInit {
  public fearAndGreedIndex: number;
  public hasPermissionToAccessFearAndGreedIndex: boolean;
  public historicalData: HistoricalDataItem[];
  public isLoading = true;
  public readonly numberOfDays = 90;
  public user: User;

  private unsubscribeSubject = new Subject<void>();

  /**
   * @constructor
   */
  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService,
    private userService: UserService
  ) {
    this.isLoading = true;

    this.userService.stateChanged
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((state) => {
        if (state?.user) {
          this.user = state.user;

          this.hasPermissionToAccessFearAndGreedIndex = hasPermission(
            this.user.permissions,
            permissions.accessFearAndGreedIndex
          );

          if (this.hasPermissionToAccessFearAndGreedIndex) {
            this.dataService
              .fetchSymbolItem({
                dataSource: DataSource.RAKUTEN,
                includeHistoricalData: this.numberOfDays,
                symbol: ghostfolioFearAndGreedIndexSymbol
              })
              .pipe(takeUntil(this.unsubscribeSubject))
              .subscribe(({ historicalData, marketPrice }) => {
                this.fearAndGreedIndex = marketPrice;
                this.historicalData = [
                  ...historicalData,
                  {
                    date: resetHours(new Date()).toISOString(),
                    value: marketPrice
                  }
                ];
                this.isLoading = false;

                this.changeDetectorRef.markForCheck();
              });
          }

          this.changeDetectorRef.markForCheck();
        }
      });
  }

  /**
   * Initializes the controller
   */
  public ngOnInit() {}

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
