import { InfoItem, User } from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { publicRoutes } from '@ghostfolio/common/routes/routes';
import { GfLogoComponent } from '@ghostfolio/ui/logo';

import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  Input,
  OnChanges
} from '@angular/core';
import { RouterModule } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { openOutline } from 'ionicons/icons';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GfLogoComponent, IonIcon, RouterModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'gf-footer',
  styleUrls: ['./footer.component.scss'],
  templateUrl: './footer.component.html'
})
export class GfFooterComponent implements OnChanges {
  @Input() public info: InfoItem;
  @Input() public user: User;

  public currentYear = new Date().getFullYear();
  public hasPermissionForStatistics: boolean;
  public hasPermissionForSubscription: boolean;
  public hasPermissionToAccessFearAndGreedIndex: boolean;
  public routerLinkAbout = publicRoutes.about.routerLink;
  public routerLinkAboutChangelog =
    publicRoutes.about.subRoutes.changelog.routerLink;
  public routerLinkAboutLicense =
    publicRoutes.about.subRoutes.license.routerLink;
  public routerLinkAboutPrivacyPolicy =
    publicRoutes.about.subRoutes.privacyPolicy.routerLink;
  public routerLinkAboutTermsOfService =
    publicRoutes.about.subRoutes.termsOfService.routerLink;
  public routerLinkBlog = publicRoutes.blog.routerLink;
  public routerLinkFaq = publicRoutes.faq.routerLink;
  public routerLinkFeatures = publicRoutes.features.routerLink;
  public routerLinkMarkets = publicRoutes.markets.routerLink;
  public routerLinkOpenStartup = publicRoutes.openStartup.routerLink;
  public routerLinkPricing = publicRoutes.pricing.routerLink;
  public routerLinkResources = publicRoutes.resources.routerLink;

  public constructor() {
    addIcons({
      openOutline
    });
  }

  public ngOnChanges() {
    this.hasPermissionForStatistics = hasPermission(
      this.info?.globalPermissions,
      permissions.enableStatistics
    );

    this.hasPermissionForSubscription = hasPermission(
      this.info?.globalPermissions,
      permissions.enableSubscription
    );

    this.hasPermissionToAccessFearAndGreedIndex = hasPermission(
      this.info?.globalPermissions,
      permissions.enableFearAndGreedIndex
    );
  }
}
