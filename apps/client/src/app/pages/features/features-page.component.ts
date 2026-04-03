import { UserService } from '@ghostfolio/client/services/user/user.service';
import { InfoItem, User } from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { publicRoutes } from '@ghostfolio/common/routes/routes';
import { GfPremiumIndicatorComponent } from '@ghostfolio/ui/premium-indicator';
import { DataService } from '@ghostfolio/ui/services';

import { ChangeDetectorRef, Component, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { RouterModule } from '@angular/router';

@Component({
  host: { class: 'page' },
  imports: [
    GfPremiumIndicatorComponent,
    MatButtonModule,
    MatCardModule,
    RouterModule
  ],
  selector: 'gf-features-page',
  styleUrls: ['./features-page.scss'],
  templateUrl: './features-page.html'
})
export class GfFeaturesPageComponent {
  public hasPermissionForSubscription: boolean;
  public hasPermissionToCreateUser: boolean;
  public info: InfoItem;
  public routerLinkRegister = publicRoutes.register.routerLink;
  public routerLinkResources = publicRoutes.resources.routerLink;
  public user: User;

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService,
    private destroyRef: DestroyRef,
    private userService: UserService
  ) {
    this.info = this.dataService.fetchInfo();
  }

  public ngOnInit() {
    this.userService.stateChanged
      .pipe(takeUntilDestroyed(this.destroyRef))
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

    this.hasPermissionToCreateUser = hasPermission(
      this.info?.globalPermissions,
      permissions.createUserAccount
    );
  }
}
