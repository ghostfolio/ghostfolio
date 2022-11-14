import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { DataService } from '@ghostfolio/client/services/data.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { User } from '@ghostfolio/common/interfaces';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  host: { class: 'page' },
  selector: 'gf-pricing-page',
  styleUrls: ['./pricing-page.scss'],
  templateUrl: './pricing-page.html'
})
export class PricingPageComponent implements OnDestroy, OnInit {
  public baseCurrency: string;
  public coupon: number;
  public isLoggedIn: boolean;
  public price: number;
  public user: User;

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService,
    private userService: UserService
  ) {
    const { baseCurrency, subscriptions } = this.dataService.fetchInfo();

    this.baseCurrency = baseCurrency;
    this.coupon = subscriptions?.[0]?.coupon;
    this.price = subscriptions?.[0]?.price;
  }

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
