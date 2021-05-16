import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { DataService } from '@ghostfolio/client/services/data.service';
import { TokenStorageService } from '@ghostfolio/client/services/token-storage.service';
import { DEFAULT_DATE_FORMAT } from '@ghostfolio/helper/config';
import { Access, User } from '@ghostfolio/helper/interfaces';
import { hasPermission, permissions } from '@ghostfolio/helper/permissions';
import { Currency } from '@prisma/client';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'gf-account-page',
  templateUrl: './account-page.html',
  styleUrls: ['./account-page.scss']
})
export class AccountPageComponent implements OnDestroy, OnInit {
  public accesses: Access[];
  public baseCurrency: Currency;
  public currencies: Currency[] = [];
  public defaultDateFormat = DEFAULT_DATE_FORMAT;
  public hasPermissionForSubscription: boolean;
  public user: User;

  private unsubscribeSubject = new Subject<void>();

  /**
   * @constructor
   */
  public constructor(
    private cd: ChangeDetectorRef,
    private dataService: DataService,
    private tokenStorageService: TokenStorageService
  ) {
    this.dataService
      .fetchInfo()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(({ currencies, globalPermissions }) => {
        this.currencies = currencies;

        this.hasPermissionForSubscription = hasPermission(
          globalPermissions,
          permissions.enableSubscription
        );
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

  /**
   * Initializes the controller
   */
  public ngOnInit() {
    this.update();
  }

  public onChangeBaseCurrency({ value: currency }: { value: Currency }) {
    this.dataService
      .putUserSettings({ currency })
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

  private update() {
    this.dataService
      .fetchAccesses()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((response) => {
        this.accesses = response;

        this.cd.markForCheck();
      });
  }
}
