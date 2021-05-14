import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { User } from '@ghostfolio/api/app/user/interfaces/user.interface';
import { DataService } from '@ghostfolio/client/services/data.service';
import { TokenStorageService } from '@ghostfolio/client/services/token-storage.service';
import { baseCurrency } from '@ghostfolio/helper';
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
    private dataService: DataService,
    private tokenStorageService: TokenStorageService
  ) {}

  /**
   * Initializes the controller
   */
  public ngOnInit() {
    this.isLoggedIn = !!this.tokenStorageService.getToken();

    if (this.isLoggedIn)
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

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
