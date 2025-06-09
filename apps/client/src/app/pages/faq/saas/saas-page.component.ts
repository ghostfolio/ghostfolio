import { UserService } from '@ghostfolio/client/services/user/user.service';
import { User } from '@ghostfolio/common/interfaces';
import { publicRoutes, routes } from '@ghostfolio/common/routes/routes';

import { ChangeDetectorRef, Component, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';

@Component({
  host: { class: 'page' },
  selector: 'gf-saas-page',
  styleUrls: ['./saas-page.scss'],
  templateUrl: './saas-page.html',
  standalone: false
})
export class SaasPageComponent implements OnDestroy {
  public pricingUrl = `https://ghostfol.io/${document.documentElement.lang}/${routes.pricing}`;
  public routerLinkAccount = ['/' + routes.account];
  public routerLinkAccountMembership = [
    '/' + routes.account,
    routes.membership
  ];
  public routerLinkMarkets = ['/' + routes.markets];
  public routerLinkRegister = publicRoutes.register.routerLink;
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
