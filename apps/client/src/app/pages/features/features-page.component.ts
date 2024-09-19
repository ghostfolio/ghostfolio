import { DataService } from '@ghostfolio/client/services/data.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { InfoItem, User } from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { GfPremiumIndicatorComponent } from '@ghostfolio/ui/premium-indicator';

import { ChangeDetectorRef, Component, OnDestroy } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

@Component({
  host: { class: 'page' },
  imports: [
    GfPremiumIndicatorComponent,
    MatButtonModule,
    MatCardModule,
    RouterModule
  ],
  selector: 'gf-features-page',
  standalone: true,
  styleUrls: ['./features-page.scss'],
  templateUrl: './features-page.html'
})
export class GfFeaturesPageComponent implements OnDestroy {
  public hasPermissionForSubscription: boolean;
  public info: InfoItem;
  public routerLinkRegister = ['/' + $localize`:snake-case:register`];
  public routerLinkResources = ['/' + $localize`:snake-case:resources`];
  public user: User;

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService,
    private userService: UserService
  ) {
    this.info = this.dataService.fetchInfo();
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

    this.hasPermissionForSubscription = hasPermission(
      this.info?.globalPermissions,
      permissions.enableSubscription
    );
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
