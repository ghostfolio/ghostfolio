import { InfoItem } from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { publicRoutes } from '@ghostfolio/common/routes/routes';
import { GfLogoComponent } from '@ghostfolio/ui/logo';

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  input
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
export class GfFooterComponent {
  public readonly info = input.required<InfoItem | undefined>();

  protected readonly currentYear = new Date().getFullYear();

  protected readonly hasPermissionForStatistics = computed(() => {
    return hasPermission(
      this.info()?.globalPermissions,
      permissions.enableStatistics
    );
  });

  protected readonly hasPermissionForSubscription = computed(() => {
    return hasPermission(
      this.info()?.globalPermissions,
      permissions.enableSubscription
    );
  });

  protected readonly hasPermissionToAccessFearAndGreedIndex = computed(() => {
    return hasPermission(
      this.info()?.globalPermissions,
      permissions.enableFearAndGreedIndex
    );
  });

  protected readonly routerLinkAbout = publicRoutes.about.routerLink;
  protected readonly routerLinkAboutChangelog =
    publicRoutes.about.subRoutes.changelog.routerLink;
  protected readonly routerLinkAboutLicense =
    publicRoutes.about.subRoutes.license.routerLink;
  protected readonly routerLinkAboutPrivacyPolicy =
    publicRoutes.about.subRoutes.privacyPolicy.routerLink;
  protected readonly routerLinkAboutTermsOfService =
    publicRoutes.about.subRoutes.termsOfService.routerLink;
  protected readonly routerLinkBlog = publicRoutes.blog.routerLink;
  protected readonly routerLinkFaq = publicRoutes.faq.routerLink;
  protected readonly routerLinkFeatures = publicRoutes.features.routerLink;
  protected readonly routerLinkMarkets = publicRoutes.markets.routerLink;
  protected readonly routerLinkOpenStartup =
    publicRoutes.openStartup.routerLink;
  protected readonly routerLinkPricing = publicRoutes.pricing.routerLink;
  protected readonly routerLinkResources = publicRoutes.resources.routerLink;

  public constructor() {
    addIcons({
      openOutline
    });
  }
}
