import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { User } from 'apps/api/src/app/user/interfaces/user.interface';
import { environment } from 'apps/client/src/environments/environment';
import { baseCurrency } from 'libs/helper/src';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { DataService } from '../../services/data.service';
import { TokenStorageService } from '../../services/token-storage.service';

@Component({
  selector: 'gf-about-page',
  templateUrl: './about-page.html',
  styleUrls: ['./about-page.scss']
})
export class AboutPageComponent implements OnInit {
  public baseCurrency = baseCurrency;
  public isLoggedIn: boolean;
  public lastPublish = environment.lastPublish;
  public user: User;
  public version = environment.version;

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
