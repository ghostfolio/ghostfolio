import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
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
  public isLoggedIn: boolean;
  public user: User;

  private unsubscribeSubject = new Subject<void>();

  /**
   * @constructor
   */
  public constructor(
    private cd: ChangeDetectorRef,
    private userService: UserService
  ) {}

  /**
   * Initializes the controller
   */
  public ngOnInit() {
    this.userService.stateChanged
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((state) => {
        if (state?.user) {
          this.user = state.user;

          this.cd.markForCheck();
        }
      });
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
