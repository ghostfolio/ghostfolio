import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { DEFAULT_DATE_FORMAT } from '@ghostfolio/helper';
import { Access } from 'apps/api/src/app/access/interfaces/access.interface';
import { User } from 'apps/api/src/app/user/interfaces/user.interface';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { DataService } from '../../services/data.service';
import { TokenStorageService } from '../../services/token-storage.service';
import { Currency } from '.prisma/client';

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
      .subscribe(({ currencies }) => {
        this.currencies = currencies;
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

  private update() {
    this.dataService
      .fetchAccesses()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((response) => {
        this.accesses = response;

        this.cd.markForCheck();
      });
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
