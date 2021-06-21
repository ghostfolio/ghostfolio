import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { DataService } from '@ghostfolio/client/services/data.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { baseCurrency } from '@ghostfolio/common/config';
import { User } from '@ghostfolio/common/interfaces';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'gf-pricing-page',
  templateUrl: './pricing-page.html',
  styleUrls: ['./pricing-page.scss']
})
export class PricingPageComponent implements OnInit {
  public baseCurrency = baseCurrency;
  public coupon: number;
  public isLoggedIn: boolean;
  public price: number;
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
    this.dataService
      .fetchInfo()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(({ subscriptions }) => {
        this.coupon = this.price = subscriptions?.[0]?.coupon;
        this.price = subscriptions?.[0]?.price;

        this.changeDetectorRef.markForCheck();
      });
  }

  /**
   * Initializes the controller
   */
  public ngOnInit() {
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
