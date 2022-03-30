import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { DataService } from '@ghostfolio/client/services/data.service';
import { ImpersonationStorageService } from '@ghostfolio/client/services/impersonation-storage.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { User } from '@ghostfolio/common/interfaces';
import Big from 'big.js';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  host: { class: 'page' },
  selector: 'gf-fire-page',
  styleUrls: ['./fire-page.scss'],
  templateUrl: './fire-page.html'
})
export class FirePageComponent implements OnDestroy, OnInit {
  public fireWealth: number;
  public hasImpersonationId: boolean;
  public isLoading = false;
  public user: User;
  public withdrawalRatePerMonth: number;
  public withdrawalRatePerYear: number;

  private unsubscribeSubject = new Subject<void>();

  /**
   * @constructor
   */
  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService,
    private impersonationStorageService: ImpersonationStorageService,
    private userService: UserService
  ) {}

  /**
   * Initializes the controller
   */
  public ngOnInit() {
    this.isLoading = true;

    this.impersonationStorageService
      .onChangeHasImpersonation()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((aId) => {
        this.hasImpersonationId = !!aId;
      });

    this.dataService
      .fetchPortfolioSummary()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(({ cash, currentValue }) => {
        if (cash === null || currentValue === null) {
          return;
        }

        this.fireWealth = new Big(currentValue).plus(cash).toNumber();
        this.withdrawalRatePerYear = new Big(this.fireWealth)
          .mul(4)
          .div(100)
          .toNumber();
        this.withdrawalRatePerMonth = new Big(this.withdrawalRatePerYear)
          .div(12)
          .toNumber();

        this.isLoading = false;

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

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
