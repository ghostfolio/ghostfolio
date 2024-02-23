import { UserService } from '@ghostfolio/client/services/user/user.service';
import { User } from '@ghostfolio/common/interfaces';

import { ChangeDetectorRef, Component, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';

@Component({
  host: { class: 'page' },
  selector: 'gf-saas-page',
  styleUrls: ['./saas-page.scss'],
  templateUrl: './saas-page.html'
})
export class SaasPageComponent implements OnDestroy {
  public routerLinkMarkets = ['/' + $localize`markets`];
  public routerLinkPricing = ['/' + $localize`pricing`];
  public routerLinkRegister = ['/' + $localize`register`];
  public user: User;

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private userService: UserService
  ) {}

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
