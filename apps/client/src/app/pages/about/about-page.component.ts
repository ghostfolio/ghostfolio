import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { baseCurrency } from '@ghostfolio/common/config';
import { User } from '@ghostfolio/common/interfaces';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { environment } from '../../../environments/environment';

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
