import { UserService } from '@ghostfolio/client/services/user/user.service';
import { User } from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { publicRoutes } from '@ghostfolio/common/routes/routes';
import { DataService } from '@ghostfolio/ui/services';

import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  DestroyRef,
  OnInit
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  logoGithub,
  logoLinkedin,
  logoSlack,
  logoX,
  mail
} from 'ionicons/icons';

@Component({
  imports: [CommonModule, IonIcon, MatButtonModule, RouterModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'gf-about-overview-page',
  styleUrls: ['./about-overview-page.scss'],
  templateUrl: './about-overview-page.html'
})
export class GfAboutOverviewPageComponent implements OnInit {
  public hasPermissionForStatistics: boolean;
  public hasPermissionForSubscription: boolean;
  public isLoggedIn: boolean;
  public routerLinkBlog = publicRoutes.blog.routerLink;
  public routerLinkFaq = publicRoutes.faq.routerLink;
  public routerLinkFeatures = publicRoutes.features.routerLink;
  public routerLinkOpenStartup = publicRoutes.openStartup.routerLink;
  public user: User;

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService,
    private destroyRef: DestroyRef,
    private userService: UserService
  ) {
    const { globalPermissions } = this.dataService.fetchInfo();

    this.hasPermissionForStatistics = hasPermission(
      globalPermissions,
      permissions.enableStatistics
    );

    this.hasPermissionForSubscription = hasPermission(
      globalPermissions,
      permissions.enableSubscription
    );

    addIcons({ logoGithub, logoLinkedin, logoSlack, logoX, mail });
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
  }
}
